import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/requireAdmin";

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["student", "teacher"]),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();
    const updateData: Record<string, unknown> = { role: parsed.data.role };
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    const user = await User.findByIdAndUpdate(
      parsed.data.userId,
      updateData,
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
    });
  } catch (err) {
    console.error("Update teacher role error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();
    const teachers = await User.find({ role: "teacher" }).select("name email role isActive createdAt");
    return NextResponse.json({ success: true, data: teachers });
  } catch (err) {
    console.error("List teachers error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
