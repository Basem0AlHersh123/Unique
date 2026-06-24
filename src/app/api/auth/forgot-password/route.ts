import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { sendResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "البريد الإلكتروني مطلوب" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json({
        success: true,
        message: "إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Send email before persisting token — if email fails, no orphaned token.
    try {
      await sendResetEmail(email, resetToken);
    } catch (emailErr) {
      console.error("Failed to send reset email:", emailErr);
      const message =
        process.env.NODE_ENV === "development"
          ? `تعذر إرسال البريد الإلكتروني: ${(emailErr as Error).message}`
          : "حدث خطأ في إرسال البريد الإلكتروني. تحقق من إعدادات SMTP.";
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();

    return NextResponse.json({
      success: true,
      message: "إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
