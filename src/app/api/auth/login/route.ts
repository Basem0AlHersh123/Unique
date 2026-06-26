import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword, signAccessToken, signRefreshToken } from "@/lib/auth";
import { verifyTurnstile } from "@/lib/turnstile";
import { isMobileClient } from "@/lib/mobileAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, turnstileToken } = parsed.data;

    const mobile = isMobileClient(req);
    if (!mobile) {
      if (!turnstileToken) {
        return NextResponse.json(
          { success: false, error: "يرجى تأكيد أنك لست برنامجاً آلياً" },
          { status: 400 }
        );
      }
      const isHuman = await verifyTurnstile(turnstileToken);
      if (!isHuman) {
        return NextResponse.json(
          { success: false, error: "فشل التحقق من أنك لست برنامجاً آلياً" },
          { status: 400 }
        );
      }
    }

    await connectDB();

    // .select("+password") is required because the schema marks
    // password as select: false by default — we explicitly opt back in
    // here, ONLY for this comparison, then never send it back to the client.
    const user = await User.findOne({ email }).select("+password");

    // IMPORTANT: we return the exact same generic error whether the email
    // doesn't exist OR the password is wrong. If we said "email not found"
    // vs "wrong password" separately, an attacker could use that to discover
    // which emails are registered on the platform (an enumeration attack).
    if (!user) {
      return NextResponse.json(
        { success: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role, name: user.name, tier: user.tier });
    const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role, name: user.name });

    user.lastActive = new Date();
    user.refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await user.save();

    const responseData: Record<string, unknown> = {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tier: user.tier,
      },
    };

    if (mobile) {
      responseData.refreshToken = refreshToken;
    }

    const res = NextResponse.json({ success: true, data: responseData });

    if (!mobile) {
      res.cookies.set("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}
