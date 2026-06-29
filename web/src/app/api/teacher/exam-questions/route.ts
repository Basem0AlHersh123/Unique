import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Question } from "@/models/Question";
import { Unit } from "@/models/Unit";
import { Subject } from "@/models/Subject";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

const createExamQSchema = z.object({
  question: z.string().min(2, "السؤال قصير جداً"),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.number().min(0),
  unitId: z.string().min(1),
  subjectId: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  explanation: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    const unitId = req.nextUrl.searchParams.get("unitId");

    await connectDB();

    const ownSubjectIds = await Subject.find({
      teacherIds: payload.userId,
    }).distinct("_id");
    const ownStr = ownSubjectIds.map((id) => String(id));

    const filter: Record<string, unknown> = {};
    if (unitId) filter.unitId = unitId;
    if (payload.role !== "admin") {
      filter.subjectId = { $in: ownSubjectIds };
    }

    const questions = await Question.find(filter).sort({ order: 1 });
    return NextResponse.json({ success: true, data: questions });
  } catch (err) {
    console.error("Teacher list exam questions error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    const body = await req.json();
    const parsed = createExamQSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const subj = await Subject.findById(parsed.data.subjectId);
    if (!subj) {
      return NextResponse.json(
        { success: false, error: "المادة غير موجودة" },
        { status: 404 }
      );
    }

    if (
      payload.role !== "admin" &&
      !subj.teacherIds.map((id: unknown) => String(id)).includes(payload.userId)
    ) {
      return NextResponse.json(
        { success: false, error: "لا يمكنك إضافة سؤال لهذه المادة" },
        { status: 403 }
      );
    }

    const unit = await Unit.findById(parsed.data.unitId);
    if (!unit) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة" },
        { status: 404 }
      );
    }

    const { correctAnswer, options } = parsed.data;
    if (correctAnswer >= options.length) {
      return NextResponse.json(
        { success: false, error: "الإجابة الصحيحة خارج نطاق الخيارات" },
        { status: 400 }
      );
    }

    const question = await Question.create(parsed.data);
    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (err) {
    console.error("Teacher create exam question error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
