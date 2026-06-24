import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Question } from "@/models/Question";
import { Subject } from "@/models/Subject";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

const questionSchema = z.object({
  question: z.string().min(2, "نص السؤال قصير جداً"),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.number().min(0),
  topicId: z.string().min(1),
  subjectId: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  explanation: z.string().optional(),
  order: z.number().optional(),
});

export async function GET(req: NextRequest) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    const topicId = req.nextUrl.searchParams.get("topicId");
    const subjectId = req.nextUrl.searchParams.get("subjectId");

    await connectDB();

    const ownSubjectIds = await Subject.find({ teacherIds: payload.userId }).distinct("_id");
    const ownStr = ownSubjectIds.map((id) => id.toString());

    const filter: Record<string, unknown> = {};
    if (topicId) filter.topicId = topicId;
    if (subjectId) filter.subjectId = subjectId;
    if (payload.role !== "admin") {
      filter.subjectId = { $in: ownSubjectIds };
    }

    const questions = await Question.find(filter).sort({ order: 1 });
    return NextResponse.json({ success: true, data: questions });
  } catch (err) {
    console.error("Teacher list questions error:", err);
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
    const parsed = questionSchema.safeParse(body);
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
      !subj.teacherIds.map((id: unknown) => (id as { toString(): string }).toString()).includes(payload.userId)
    ) {
      return NextResponse.json(
        { success: false, error: "لا يمكنك إضافة أسئلة لهذه المادة" },
        { status: 403 }
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
    console.error("Teacher create question error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
