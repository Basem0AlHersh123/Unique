import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Unit } from "@/models/Unit";
import { requireAdmin } from "@/lib/requireAdmin";

const updateUnitSchema = z.object({
  title: z.string().min(1, "عنوان الوحدة مطلوب").optional(),
  titleEn: z.string().optional(),
  levelId: z.string().optional(),
  subjectId: z.string().optional(),
  order: z.number().optional(),
  description: z.string().optional(),
  comingSoon: z.boolean().optional(),
  examEnabled: z.boolean().optional(),
  passingScore: z.number().min(1).max(100).optional(),
  questionCount: z.number().min(1).max(100).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const unit = await Unit.findById(id);
    if (!unit) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: unit });
  } catch (err) {
    console.error("Get unit error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
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

    const unit = await Unit.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: unit });
  } catch (err) {
    console.error("Update unit error:", err);
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
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    await connectDB();

    const unit = await Unit.findOneAndDelete({ _id: id });
    if (!unit) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Delete unit error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
