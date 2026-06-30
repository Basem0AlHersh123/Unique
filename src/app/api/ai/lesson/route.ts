import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Topic } from "@/models/Topic";
import { Subject } from "@/models/Subject";
import { requireAuth } from "@/lib/requireAuth";
import { callGemini } from "@/lib/gemini";

const schema = z.object({
  lessonId: z.string().min(1),
  question: z.string().min(1, "السؤال مطلوب").max(500, "السؤال طويل جداً"),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { lessonId, question } = parsed.data;
    const userId = auth.payload.userId;

    await connectDB();

    const lesson = await Topic.findById(lessonId).lean();
    if (!lesson || !lesson.isPublished) {
      return NextResponse.json(
        { success: false, error: "الدرس غير موجود" },
        { status: 404 }
      );
    }

    const lessonContext = [
      `عنوان الدرس: ${lesson.title}`,
      lesson.summaryText ? `ملخص الدرس: ${lesson.summaryText}` : "",
      lesson.keyPoints?.length
        ? `النقاط الرئيسية:\n${lesson.keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}`
        : "",
      lesson.aiExplanation ? `شرح إضافي: ${lesson.aiExplanation}` : "",
      lesson.vocabulary?.length
        ? `المفردات:\n${lesson.vocabulary.map((v: { word: string; definition: string }) => `- ${v.word}: ${v.definition}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const systemInstruction = `أنت مساعد تعليمي ذكي لمنصة UNIQUE التعليمية اليمنية. 
مهمتك مساعدة الطلاب على فهم درس محدد فقط.

محتوى الدرس الذي تشرحه:
${lessonContext}

قواعد صارمة يجب اتباعها:
1. أجب فقط عن أسئلة تتعلق بهذا الدرس تحديداً.
2. إذا سألك الطالب عن إجابات أسئلة الاختبار أو قال "ما هي الإجابة الصحيحة؟" أو ما شابه، ارفض بلطف وقل له إن الاختبار لقياس فهمه هو.
3. اشرح بأسلوب بسيط ومشجع.
4. استخدم أمثلة من الحياة اليومية اليمنية إن أمكن.
5. أجب باللغة التي يسأل بها الطالب (عربي أو إنجليزي).
6. لا تخرج عن موضوع الدرس أبداً.`;

    const geminiMessages = [
      { role: "user" as const, parts: [{ text: question }] },
    ];

    let modelOverride: string | undefined;
    if (lesson.subjectId) {
      try {
        const subject = await Subject.findById(lesson.subjectId).select("aiModel").lean();
        if (subject?.aiModel) modelOverride = subject.aiModel;
      } catch { /* fallback to default model */ }
    }

    const result = await callGemini(
      geminiMessages,
      systemInstruction,
      userId,
      "lesson-ai",
      modelOverride
    );

    return NextResponse.json({
      success: true,
      data: { answer: result.text },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "حدث خطأ في الخادم";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
