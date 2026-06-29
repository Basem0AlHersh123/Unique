import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Group } from "@/models/Group";
import { JoinRequest } from "@/models/JoinRequest";
import { requireAuth } from "@/lib/requireAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await connectDB();

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    const userId = auth.payload.userId;

    const isMember = ((group.members || []) as Array<{ _id?: { toString(): string }; toString(): string }>).some(
      (m) => (m._id?.toString() || m.toString()) === userId
    );
    if (isMember) {
      return NextResponse.json(
        { success: false, error: "أنت عضو بالفعل في هذه المجموعة" },
        { status: 400 }
      );
    }

    const isBlocked = ((group.blockedMembers || []) as Array<{ _id?: { toString(): string }; toString(): string }>).some(
      (m) => (m._id?.toString() || m.toString()) === userId
    );
    if (isBlocked) {
      return NextResponse.json(
        { success: false, error: "تم حظرك من هذه المجموعة" },
        { status: 403 }
      );
    }

    if (group.joinMode === "open") {
      const updated = await Group.findByIdAndUpdate(
        id,
        { $addToSet: { members: userId } },
        { new: true }
      );
      return NextResponse.json({ success: true, data: updated });
    }

    const existing = await JoinRequest.findOne({
      groupId: id,
      userId,
      status: "pending",
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "لديك طلب انضمام قيد المراجعة بالفعل" },
        { status: 400 }
      );
    }

    const request = await JoinRequest.create({ groupId: id, userId });
    return NextResponse.json(
      { success: true, data: request },
      { status: 201 }
    );
  } catch (err) {
    console.error("Join group error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
