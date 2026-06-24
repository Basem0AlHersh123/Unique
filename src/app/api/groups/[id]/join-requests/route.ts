import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Group } from "@/models/Group";
import { JoinRequest } from "@/models/JoinRequest";
import { requireAuth } from "@/lib/requireAuth";

type GroupDoc = {
  createdBy?: { _id?: { toString(): string }; toString(): string };
  groupAdmins?: Array<{ _id?: { toString(): string }; toString(): string }>;
  members?: Array<{ _id?: { toString(): string }; toString(): string }>;
};

function canManageRequests(group: GroupDoc, userId: string, role: string): boolean {
  if (role === "admin") return true;
  const cid = group.createdBy?._id?.toString() || group.createdBy?.toString();
  if (cid === userId) return true;
  const isAdmin = (group.groupAdmins || []).some(
    (a) => (a._id?.toString() || a.toString()) === userId
  );
  return isAdmin;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await connectDB();

    const group = (await Group.findById(id)) as GroupDoc | null;
    if (!group) {
      return NextResponse.json(
        { success: false, error: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    if (!canManageRequests(group, auth.payload.userId, auth.payload.role)) {
      return NextResponse.json(
        { success: false, error: "ليس لديك صلاحية" },
        { status: 403 }
      );
    }

    const status = req.nextUrl.searchParams.get("status") || "pending";

    const requests = await JoinRequest.find({ groupId: id, status })
      .populate("userId", "name email role")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: requests });
  } catch (err) {
    console.error("List join requests error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await connectDB();

    const group = (await Group.findById(id)) as GroupDoc | null;
    if (!group) {
      return NextResponse.json(
        { success: false, error: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    const userId = auth.payload.userId;

    const isMember = (group.members || []).some(
      (m) => (m._id?.toString() || m.toString()) === userId
    );
    if (isMember) {
      return NextResponse.json(
        { success: false, error: "أنت عضو بالفعل" },
        { status: 400 }
      );
    }

    const existing = await JoinRequest.findOne({
      groupId: id,
      userId,
      status: "pending",
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "لديك طلب قيد المراجعة بالفعل" },
        { status: 400 }
      );
    }

    const request = await JoinRequest.create({ groupId: id, userId });
    return NextResponse.json(
      { success: true, data: request },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create join request error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
