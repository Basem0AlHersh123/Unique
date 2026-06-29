import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Group } from "@/models/Group";
import { JoinRequest } from "@/models/JoinRequest";
import { requireAuth } from "@/lib/requireAuth";

type GroupDoc = {
  createdBy?: { _id?: { toString(): string }; toString(): string };
  groupAdmins?: Array<{ _id?: { toString(): string }; toString(): string }>;
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, requestId } = await params;
    const { status } = await req.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "حالة غير صالحة" },
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

    if (!canManageRequests(group, auth.payload.userId, auth.payload.role)) {
      return NextResponse.json(
        { success: false, error: "ليس لديك صلاحية" },
        { status: 403 }
      );
    }

    const request = await JoinRequest.findById(requestId);
    if (!request || request.groupId.toString() !== id) {
      return NextResponse.json(
        { success: false, error: "الطلب غير موجود" },
        { status: 404 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "تمت معالجة هذا الطلب بالفعل" },
        { status: 400 }
      );
    }

    const updated = await JoinRequest.findOneAndUpdate(
      { _id: requestId, status: "pending" },
      { status },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "تمت معالجة هذا الطلب بالفعل" },
        { status: 400 }
      );
    }

    if (status === "approved") {
      await Group.findByIdAndUpdate(id, {
        $addToSet: { members: updated.userId },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Handle join request error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
