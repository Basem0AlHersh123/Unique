import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Subject } from "@/models/Subject";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/requireAdmin";

const assignSchema = z.object({
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const teacher = await User.findOne({ _id: parsed.data.teacherId, role: "teacher" }).select("_id");
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: "المدرس غير موجود" },
        { status: 404 }
      );
    }

    const subject = await Subject.findByIdAndUpdate(
      parsed.data.subjectId,
      { $addToSet: { teacherIds: parsed.data.teacherId } },
      { new: true }
    ).populate("teacherIds", "name email");

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "المادة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subject });
  } catch (err) {
    console.error("Assign teacher error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const subject = await Subject.findByIdAndUpdate(
      parsed.data.subjectId,
      { $pull: { teacherIds: parsed.data.teacherId } },
      { new: true }
    );

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "المادة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subject });
  } catch (err) {
    console.error("Unassign teacher error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
