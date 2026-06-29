import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AiConversation } from "@/models/AiConversation";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await connectDB();

    const conversation = await AiConversation.findOne({
      _id: id,
      userId: auth.payload.userId,
    }).lean();

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "المحادثة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: conversation });
  } catch (err) {
    console.error("AI conversation GET error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
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
    await connectDB();

    const deleted = await AiConversation.findOneAndDelete({
      _id: id,
      userId: auth.payload.userId,
    });

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "المحادثة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("AI conversation DELETE error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
