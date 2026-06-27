import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Unit } from "@/models/Unit";
import { Subject } from "@/models/Subject";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

const updateUnitSchema = z.object({
  title: z.string().min(1).optional(),
  titleEn: z.string().optional(),
  description: z.string().optional(),
  examEnabled: z.boolean().optional(),
  passingScore: z.number().min(1).max(100).optional(),
  questionCount: z.number().min(1).max(100).optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateUnitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const unit = await Unit.findById(id);
    if (!unit) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة" },
        { status: 404 }
      );
    }

    const subj = await Subject.findById(unit.subjectId);
    if (
      payload.role !== "admin" &&
      subj &&
      !subj.teacherIds.map((tid: unknown) => String(tid)).includes(payload.userId)
    ) {
      return NextResponse.json(
        { success: false, error: "لا يمكنك تعديل هذه الوحدة" },
        { status: 403 }
      );
    }

    Object.assign(unit, parsed.data);
    await unit.save();

    return NextResponse.json({ success: true, data: unit });
  } catch (err) {
    console.error("Teacher update unit error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    const { id } = await params;

    await connectDB();

    const unit = await Unit.findById(id);
    if (!unit) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة" },
        { status: 404 }
      );
    }

    const subj = await Subject.findById(unit.subjectId);
    if (
      payload.role !== "admin" &&
      subj &&
      !subj.teacherIds.map((tid: unknown) => String(tid)).includes(payload.userId)
    ) {
      return NextResponse.json(
        { success: false, error: "لا يمكنك حذف هذه الوحدة" },
        { status: 403 }
      );
    }

    await Unit.findOneAndDelete({ _id: id });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Teacher delete unit error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
