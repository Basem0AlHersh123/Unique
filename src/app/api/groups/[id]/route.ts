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

async function getGroupOrThrow(id: string) {
  await connectDB();
  const group = (await Group.findById(id)
    .populate("createdBy", "name email")
    .populate("groupAdmins", "name email")
    .populate("members", "name email role")
    .populate("blockedMembers", "name email")) as GroupDoc | null;
  if (!group) {
    return { error: NextResponse.json(
      { success: false, error: "المجموعة غير موجودة" },
      { status: 404 }
    )};
  }
  return { group };
}

function canManage(
  group: GroupDoc,
  userId: string,
  role: string
): boolean {
  if (role === "admin") return true;
  const cid = group.createdBy?._id?.toString() || group.createdBy?.toString();
  if (cid === userId) return true;
  const isAdmin = (group.groupAdmins || []).some(
    (a) => (a._id?.toString() || a.toString()) === userId
  );
  return isAdmin;
}

function canDelete(group: GroupDoc, userId: string, role: string): boolean {
  if (role === "admin") return true;
  const cid = group.createdBy?._id?.toString() || group.createdBy?.toString();
  return cid === userId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const result = await getGroupOrThrow(id);
    if ("error" in result) return result.error;

    const group = result.group;
    const { userId, role } = auth.payload;
    if (role !== "admin") {
      const isMember = (group.members || []).some(
        (m) => (m._id?.toString() || m.toString()) === userId
      );
      const isBlocked = (group.blockedMembers || []).some(
        (m) => (m._id?.toString() || m.toString()) === userId
      );
      if (!isMember || isBlocked) {
        return NextResponse.json(
          { success: false, error: "المجموعة غير موجودة" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ success: true, data: group });
  } catch (err) {
    console.error("Get group error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const result = await getGroupOrThrow(id);
    if ("error" in result) return result.error;

    if (!canManage(result.group, auth.payload.userId, auth.payload.role)) {
      return NextResponse.json(
        { success: false, error: "ليس لديك صلاحية تعديل هذه المجموعة" },
        { status: 403 }
      );
    }

    const allowedFields = ["name", "description", "isLocked", "joinMode"];
    const updates: Record<string, unknown> = {};
    const body = await req.json();
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const updated = await Group.findByIdAndUpdate(id, updates, { new: true })
      .populate("createdBy", "name email")
      .populate("groupAdmins", "name email")
      .populate("members", "name email role")
      .populate("blockedMembers", "name email");

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update group error:", err);
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
    const result = await getGroupOrThrow(id);
    if ("error" in result) return result.error;

    if (!canDelete(result.group, auth.payload.userId, auth.payload.role)) {
      return NextResponse.json(
        { success: false, error: "ليس لديك صلاحية حذف هذه المجموعة" },
        { status: 403 }
      );
    }

    await Group.findByIdAndDelete(id);

    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    console.error("Delete group error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
