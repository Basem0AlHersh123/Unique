import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Group } from "@/models/Group";
import { requireAuth } from "@/lib/requireAuth";

type GroupDoc = {
  createdBy?: { _id?: { toString(): string }; toString(): string };
  groupAdmins?: Array<{ _id?: { toString(): string }; toString(): string }>;
  members?: Array<{ _id?: { toString(): string }; toString(): string }>;
  blockedMembers?: Array<{ _id?: { toString(): string }; toString(): string }>;
};

function canManage(group: GroupDoc, userId: string, role: string): boolean {
  if (role === "admin") return true;
  const cid = group.createdBy?._id?.toString() || group.createdBy?.toString();
  if (cid === userId) return true;
  return (group.groupAdmins || []).some(
    (a) => (a._id?.toString() || a.toString()) === userId
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const { userId: targetUserId } = await req.json();

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    await connectDB();

    const group = (await Group.findById(id)) as GroupDoc | null;
    if (!group) {
      return NextResponse.json(
        { success: false, error: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    if (!canManage(group, auth.payload.userId, auth.payload.role)) {
      return NextResponse.json(
        { success: false, error: "ليس لديك صلاحية" },
        { status: 403 }
      );
    }

    const cid = group.createdBy?._id?.toString() || group.createdBy?.toString();
    if (cid === targetUserId) {
      return NextResponse.json(
        { success: false, error: "لا يمكن حظر منشئ المجموعة" },
        { status: 400 }
      );
    }

    const updated = await Group.findByIdAndUpdate(
      id,
      {
        $addToSet: { blockedMembers: targetUserId },
        $pull: { groupAdmins: targetUserId },
      },
      { new: true }
    )
      .populate("createdBy", "name email")
      .populate("groupAdmins", "name email")
      .populate("members", "name email role")
      .populate("blockedMembers", "name email");

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Block member error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const targetUserId = new URL(req.url).searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    await connectDB();

    const group = (await Group.findById(id)) as GroupDoc | null;
    if (!group) {
      return NextResponse.json(
        { success: false, error: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    if (!canManage(group, auth.payload.userId, auth.payload.role)) {
      return NextResponse.json(
        { success: false, error: "ليس لديك صلاحية" },
        { status: 403 }
      );
    }

    const updated = await Group.findByIdAndUpdate(
      id,
      { $pull: { blockedMembers: targetUserId } },
      { new: true }
    )
      .populate("createdBy", "name email")
      .populate("groupAdmins", "name email")
      .populate("members", "name email role")
      .populate("blockedMembers", "name email");

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Unblock member error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
