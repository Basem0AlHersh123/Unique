import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { requireAdmin } from "@/lib/requireAdmin";

const schema = z.object({
  newPassword: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير واحد على الأقل")
    .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const hashedPassword = await hashPassword(parsed.data.newPassword);

    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: { password: hashedPassword },
        $unset: { refreshTokenHash: "" },
      },
      { new: true }
    ).select("name email role");

    if (!user) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: "تم تعيين كلمة المرور الجديدة بنجاح" },
    });
  } catch (err) {
    console.error("Admin reset password error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
