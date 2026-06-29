import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AiConversation } from "@/models/AiConversation";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/requireAuth";
import { callGemini } from "@/lib/gemini";

const sendSchema = z.object({
  message: z.string().min(1, "الرسالة مطلوبة").max(2000, "الرسالة طويلة جداً"),
  conversationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { message, conversationId } = parsed.data;
    const userId = auth.payload.userId;

    await connectDB();

    const user = await User.findById(userId).select("name collegeId").lean();

    let conversation;
    if (conversationId) {
      conversation = await AiConversation.findOne({
        _id: conversationId,
        userId: userId,
      });
      if (!conversation) {
        return NextResponse.json(
          { success: false, error: "المحادثة غير موجودة" },
          { status: 404 }
        );
      }
    } else {
      conversation = await AiConversation.create({
        userId,
        title: message.slice(0, 60),
        messages: [],
      });
    }

    if (conversation.messages.length >= 100) {
      return NextResponse.json(
        { success: false, error: "وصلت هذه المحادثة للحد الأقصى، ابدأ محادثة جديدة" },
        { status: 400 }
      );
    }

    const historySlice = conversation.messages.slice(-20);
    const geminiMessages = [
      ...historySlice.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "model",
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const systemInstruction = `أنت مساعد ذكي شخصي لمنصة UNIQUE التعليمية اليمنية.
اسم الطالب: ${user?.name ?? "الطالب"}.
مهمتك مساعدة الطالب في كل ما يحتاجه — رياضيات، لغة إنجليزية، لغة عربية، أسئلة عامة، وأي شيء آخر.

أسلوبك:
- مشجع، صبور، وودود
- تستخدم أمثلة من البيئة اليمنية عند الشرح
- تجيب باللغة التي يكتب بها الطالب (عربية أو إنجليزية)
- إجاباتك مختصرة وواضحة ما لم يطلب الطالب شرحاً مفصلاً
- لا تتجاهل أي سؤال — إذا لم تعرف الإجابة قل ذلك بصدق`;

    const result = await callGemini(
      geminiMessages,
      systemInstruction,
      userId,
      "general-chat"
    );

    conversation.messages.push({ role: "user", content: message, createdAt: new Date() });
    conversation.messages.push({ role: "model", content: result.text, createdAt: new Date() });
    await conversation.save();

    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversation._id,
        reply: result.text,
        messageCount: conversation.messages.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "حدث خطأ في الخادم";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const conversations = await AiConversation.find(
      { userId: auth.payload.userId },
      { title: 1, createdAt: 1, updatedAt: 1, messages: { $slice: -1 } }
    )
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ success: true, data: conversations });
  } catch (err) {
    console.error("AI chat GET error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
