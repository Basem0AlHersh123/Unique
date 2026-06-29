import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Subject } from "@/models/Subject";
import { College } from "@/models/College";
import { Topic } from "@/models/Topic";
import { requireAdmin } from "@/lib/requireAdmin";

const updateSubjectSchema = z.object({
  name: z.string().min(2, "اسم المادة قصير جداً").optional(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  isShared: z.boolean().optional(),
  imageType: z.enum(["icon", "url", "cloudinary"]).optional(),
  imageUrl: z.string().optional(),
  icon: z.string().optional(),
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
    const parsed = updateSubjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const subject = await Subject.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "المادة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subject });
  } catch (err) {
    console.error("Update subject error:", err);
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

    const topicCount = await Topic.countDocuments({ subjectId: id });
    if (topicCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `لا يمكن حذف المادة، تحتوي على ${topicCount} موضوع. احذف المواضيع أولاً`,
        },
        { status: 409 }
      );
    }

    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) {
      return NextResponse.json(
        { success: false, error: "المادة غير موجودة" },
        { status: 404 }
      );
    }

    // Keep the bidirectional relationship clean: pull this subject's ID
    // out of its parent college's `subjects` array too.
    await College.findByIdAndUpdate(subject.collegeId, {
      $pull: { subjects: subject._id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Delete subject error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}