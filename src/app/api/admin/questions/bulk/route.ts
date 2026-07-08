import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Question } from "@/models/Question";
import { requireAdmin } from "@/lib/requireAdmin";

const bulkQuestionSchema = z.object({
  items: z
    .array(
      z.object({
        question: z.string().min(2, "نص السؤال قصير جداً"),
        options: z
          .array(z.string())
          .min(2, "يجب إضافة خيارين على الأقل")
          .max(6, "الحد الأقصى 6 خيارات"),
        correctAnswer: z.number().min(0, "يجب تحديد الإجابة الصحيحة"),
        topicId: z.string().optional(),
        unitId: z.string().optional(),
        subjectId: z.string().min(1, "يجب اختيار مادة"),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        explanation: z.string().optional(),
        order: z.number().optional(),
      })
    )
    .min(1, "يجب إدخال عنصر واحد على الأقل")
    .max(100, "الحد الأقصى 100 عنصر في المرة الواحدة"),
});

export async function POST(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const parsed = bulkQuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const created: number[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < parsed.data.items.length; i++) {
      const item = parsed.data.items[i];
      const dangerous = JSON.stringify(item);
      if (dangerous.includes("$where") || dangerous.includes("$expr") || dangerous.includes("__proto__")) {
        errors.push({ index: i, error: "محتوى غير مسموح به" });
        continue;
      }
      try {
        if (item.correctAnswer >= item.options.length) {
          errors.push({ index: i, error: "الإجابة الصحيحة خارج نطاق الخيارات" });
          continue;
        }
        const record: Record<string, unknown> = { ...item };
        if (!record.unitId && !record.topicId) {
          errors.push({ index: i, error: "يجب اختيار موضوع أو وحدة" });
          continue;
        }
        await Question.create(record);
        created.push(i);
      } catch (err) {
        errors.push({ index: i, error: (err as Error).message });
      }
    }

    return NextResponse.json({
      success: true,
      data: { created: created.length, errors },
    });
  } catch (err) {
    console.error("Bulk create questions error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
