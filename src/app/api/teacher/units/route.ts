import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Unit } from "@/models/Unit";
import { Level } from "@/models/Level";
import { Subject } from "@/models/Subject";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

const createUnitSchema = z.object({
  title: z.string().min(1, "عنوان الوحدة مطلوب"),
  titleEn: z.string().optional(),
  levelId: z.string().min(1, "يجب اختيار مستوى"),
  subjectId: z.string().min(1, "يجب اختيار مادة"),
  description: z.string().optional(),
  examEnabled: z.boolean().optional(),
  passingScore: z.number().min(1).max(100).optional(),
  questionCount: z.number().min(1).max(100).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    await connectDB();
    const subjectId = req.nextUrl.searchParams.get("subjectId");

    const ownSubjectIds = await Subject.find({
      teacherIds: payload.userId,
    }).distinct("_id");
    const ownStr = ownSubjectIds.map((id) => String(id));

    const filter: Record<string, unknown> = {};
    if (subjectId) filter.subjectId = subjectId;
    if (payload.role !== "admin") {
      filter.subjectId = { $in: ownSubjectIds };
    }

    const units = await Unit.find(filter).sort({ order: 1 });
    return NextResponse.json({ success: true, data: units });
  } catch (err) {
    console.error("Teacher list units error:", err);
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
    const parsed = createUnitSchema.safeParse(body);

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
        { success: false, error: "لا يمكنك إضافة وحدة لهذه المادة" },
        { status: 403 }
      );
    }

    const level = await Level.findById(parsed.data.levelId);
    if (!level) {
      return NextResponse.json(
        { success: false, error: "المستوى المحدد غير موجود" },
        { status: 404 }
      );
    }

    const unit = await Unit.create(parsed.data);

    return NextResponse.json({ success: true, data: unit }, { status: 201 });
  } catch (err) {
    console.error("Teacher create unit error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
