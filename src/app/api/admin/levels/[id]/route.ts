import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Level } from "@/models/Level";
import { requireAdmin } from "@/lib/requireAdmin";

const updateLevelSchema = z.object({
  title: z.string().min(1, "عنوان المستوى مطلوب").optional(),
  titleEn: z.string().optional(),
  subjectId: z.string().optional(),
  order: z.number().optional(),
  description: z.string().optional(),
  comingSoon: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const level = await Level.findById(id);
    if (!level) {
      return NextResponse.json(
        { success: false, error: "المستوى غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: level });
  } catch (err) {
    console.error("Get level error:", err);
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
    const parsed = updateLevelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const level = await Level.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!level) {
      return NextResponse.json(
        { success: false, error: "المستوى غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: level });
  } catch (err) {
    console.error("Update level error:", err);
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

    const level = await Level.findOneAndDelete({ _id: id });
    if (!level) {
      return NextResponse.json(
        { success: false, error: "المستوى غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Delete level error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
