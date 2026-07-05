import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Question } from "@/models/Question";
import { Subject } from "@/models/Subject";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

const itemSchema = z.object({
  question: z.string().min(2, "نص السؤال قصير جداً"),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.number().min(0),
  topicId: z.string().optional(),
  unitId: z.string().optional(),
  subjectId: z.string().min(1, "يجب اختيار مادة"),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  explanation: z.string().optional(),
  order: z.number().optional(),
});

const bulkSchema = z.object({
  items: z.array(itemSchema).min(1).max(200),
});

export async function POST(req: NextRequest) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    const body = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const ownSubjectIds = await Subject.find({ teacherIds: payload.userId })
      .distinct("_id")
      .then((ids) => ids.map((id) => id.toString()));

    const created: number[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < parsed.data.items.length; i++) {
      const item = parsed.data.items[i];
      try {
        if (!ownSubjectIds.includes(item.subjectId)) {
          errors.push({ index: i, error: "لا تملك صلاحية إضافة أسئلة لهذه المادة" });
          continue;
        }
        if (item.correctAnswer >= item.options.length) {
          errors.push({ index: i, error: "الإجابة الصحيحة خارج نطاق الخيارات" });
          continue;
        }
        if (!item.topicId && !item.unitId) {
          errors.push({ index: i, error: "يجب اختيار درس أو وحدة" });
          continue;
        }
        await Question.create(item);
        created.push(i);
      } catch (err) {
        errors.push({ index: i, error: (err as Error).message });
      }
    }

    return NextResponse.json({ success: true, data: { created: created.length, errors } });
  } catch (err) {
    console.error("Teacher bulk create questions error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
