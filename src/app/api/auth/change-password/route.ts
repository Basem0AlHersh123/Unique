import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/requireAuth";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(auth.payload.userId).select("+password");
    if (!user) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور الحالية غير صحيحة" },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(parsed.data.newPassword, 12);
    await user.save();

    return NextResponse.json({ success: true, data: { message: "تم تغيير كلمة المرور بنجاح" } });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
