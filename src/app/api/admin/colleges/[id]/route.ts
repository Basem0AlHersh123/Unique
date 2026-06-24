import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { College } from "@/models/College";
import { Subject } from "@/models/Subject";
import { requireAdmin } from "@/lib/requireAdmin";

const updateCollegeSchema = z.object({
  name: z.string().min(2, "اسم الكلية قصير جداً").optional(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  comingSoon: z.boolean().optional(),
  isActive: z.boolean().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCollegeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const college = await College.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!college) {
      return NextResponse.json(
        { success: false, error: "الكلية غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: college });
  } catch (err) {
    console.error("Update college error:", err);
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

    const subjectCount = await Subject.countDocuments({ collegeId: id });
    if (subjectCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `لا يمكن حذف الكلية، تحتوي على ${subjectCount} مادة. احذف المواد أولاً`,
        },
        { status: 409 }
      );
    }

    const college = await College.findByIdAndDelete(id);
    if (!college) {
      return NextResponse.json(
        { success: false, error: "الكلية غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Delete college error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
