import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Question } from "@/models/Question";
import { requireAdmin } from "@/lib/requireAdmin";

const createQuestionSchema = z.object({
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
}).refine(
  (data) => data.topicId || data.unitId,
  { message: "يجب اختيار موضوع أو وحدة للاختبار" }
);

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();
    const topicId = req.nextUrl.searchParams.get("topicId");
    const unitId = req.nextUrl.searchParams.get("unitId");
    const subjectId = req.nextUrl.searchParams.get("subjectId");

    const filter: Record<string, string> = {};
    if (topicId) filter.topicId = topicId;
    if (unitId) filter.unitId = unitId;
    if (subjectId) filter.subjectId = subjectId;

    const questions = await Question.find(filter).sort({ order: 1 });
    return NextResponse.json({ success: true, data: questions });
  } catch (err) {
    console.error("List questions error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const parsed = createQuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { correctAnswer, options } = parsed.data;
    if (correctAnswer >= options.length) {
      return NextResponse.json(
        { success: false, error: "الإجابة الصحيحة خارج نطاق الخيارات" },
        { status: 400 }
      );
    }

    await connectDB();
    const question = await Question.create(parsed.data);

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (err) {
    console.error("Create question error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
