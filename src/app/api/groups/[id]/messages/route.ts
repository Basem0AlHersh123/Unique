import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Group } from "@/models/Group";
import { Message } from "@/models/Message";
import { requireAuth } from "@/lib/requireAuth";

type MemberLike = { _id?: { toString(): string }; toString(): string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || 50,
      100
    );
    const before = req.nextUrl.searchParams.get("before");

    await connectDB();

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    if (auth.payload.role !== "admin") {
      const isMember = (group.members || []).some(
        (m: MemberLike) => (m._id?.toString() || m.toString()) === auth.payload.userId
      );
      if (!isMember) {
        return NextResponse.json(
          { success: false, error: "لست عضواً في هذه المجموعة" },
          { status: 403 }
        );
      }
    }

    const filter: Record<string, unknown> = { groupId: id };
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name role")
      .lean();

    return NextResponse.json({
      success: true,
      data: messages.reverse(),
    });
  } catch (err) {
    console.error("List messages error:", err);
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
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: "محتوى الرسالة مطلوب" },
        { status: 400 }
      );
    }

    if (content.trim().length > 5000) {
      return NextResponse.json(
        { success: false, error: "الرسالة طويلة جداً (الحد الأقصى 5000 حرف)" },
        { status: 400 }
      );
    }

    await connectDB();

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    if (group.isLocked) {
      return NextResponse.json(
        { success: false, error: "المجموعة مقفلة، لا يمكن إرسال رسائل جديدة" },
        { status: 403 }
      );
    }

    const isBlocked = (group.blockedMembers || []).some(
      (m: MemberLike) => (m._id?.toString() || m.toString()) === auth.payload.userId
    );
    if (isBlocked) {
      return NextResponse.json(
        { success: false, error: "تم حظرك من هذه المجموعة" },
        { status: 403 }
      );
    }

    const isMember = (group.members || []).some(
      (m: MemberLike) => (m._id?.toString() || m.toString()) === auth.payload.userId
    );
    if (!isMember) {
      return NextResponse.json(
        { success: false, error: "لست عضواً في هذه المجموعة" },
        { status: 403 }
      );
    }

    const message = await Message.create({
      groupId: id,
      userId: auth.payload.userId,
      content: content.trim(),
    });

    const populated = await message.populate("userId", "name role");

    return NextResponse.json(
      { success: true, data: populated },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create message error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
