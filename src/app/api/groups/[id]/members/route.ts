import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Group } from "@/models/Group";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/requireAuth";
import { z } from "zod";

type GroupDoc = {
  createdBy?: { _id?: { toString(): string }; toString(): string };
  groupAdmins?: Array<{ _id?: { toString(): string }; toString(): string }>;
  members?: Array<{ _id?: { toString(): string }; toString(): string }>;
  blockedMembers?: Array<{ _id?: { toString(): string }; toString(): string }>;
};

function canManageMembers(group: GroupDoc, userId: string, role: string): boolean {
  if (role === "admin") return true;
  const cid = group.createdBy?._id?.toString() || group.createdBy?.toString();
  if (cid === userId) return true;
  const isAdmin = (group.groupAdmins || []).some(
    (a) => (a._id?.toString() || a.toString()) === userId
  );
  return isAdmin;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    let targetUserId: string | undefined = body.userId;

    if (!targetUserId && body.email) {
      const emailResult = z.string().email().safeParse(body.email);
      if (!emailResult.success) {
        return NextResponse.json(
          { success: false, error: "البريد الإلكتروني غير صالح" },
          { status: 400 }
        );
      }
      const foundUser = await User.findOne({ email: emailResult.data.toLowerCase().trim() }).select("_id");
      if (!foundUser) {
        return NextResponse.json(
          { success: false, error: "المستخدم غير موجود" },
          { status: 404 }
        );
      }
      targetUserId = foundUser._id.toString();
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "معرف المستخدم أو البريد الإلكتروني مطلوب" },
        { status: 400 }
      );
    }

    const group = (await Group.findById(id)) as GroupDoc | null;
    if (!group) {
      return NextResponse.json(
        { success: false, error: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    if (!canManageMembers(group, auth.payload.userId, auth.payload.role)) {
      return NextResponse.json(
        { success: false, error: "ليس لديك صلاحية" },
        { status: 403 }
      );
    }

    const updated = await Group.findByIdAndUpdate(
      id,
      { $addToSet: { members: targetUserId } },
      { new: true }
    )
      .populate("createdBy", "name email")
      .populate("groupAdmins", "name email")
      .populate("members", "name email role")
      .populate("blockedMembers", "name email");

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Add member error:", err);
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
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

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

    const requesterId = auth.payload.userId;
    const requesterRole = auth.payload.role;

    if (requesterRole !== "admin" && requesterId !== targetUserId) {
      if (!canManageMembers(group, requesterId, requesterRole)) {
        return NextResponse.json(
          { success: false, error: "ليس لديك صلاحية" },
          { status: 403 }
        );
      }
    }

    const updated = await Group.findByIdAndUpdate(
      id,
      {
        $pull: {
          members: targetUserId,
          groupAdmins: targetUserId,
          blockedMembers: targetUserId,
        },
      },
      { new: true }
    )
      .populate("createdBy", "name email")
      .populate("groupAdmins", "name email")
      .populate("members", "name email role")
      .populate("blockedMembers", "name email");

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Remove member error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
