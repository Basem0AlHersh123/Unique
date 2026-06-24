import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Subject } from "@/models/Subject";
import { requireAdmin } from "@/lib/requireAdmin";

const updateTeacherSchema = z.object({
  name: z.string().min(2).optional(),
  tier: z.enum(["free", "paid"]).optional(),
  role: z.enum(["student", "teacher"]).optional(),
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
    const parsed = updateTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    if (parsed.data.role === "student") {
      await Subject.updateMany(
        { teacherIds: id },
        { $pull: { teacherIds: id } }
      );
    }

    const user = await User.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    }).select("-password -refreshTokenHash");

    if (!user) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (err) {
    console.error("Update teacher error:", err);
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

    await Subject.updateMany(
      { teacherIds: id },
      { $pull: { teacherIds: id } }
    );

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Delete teacher error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
