import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { registerSchema } from "@/lib/validation/auth";
import { hashPassword, signAccessToken, signRefreshToken } from "@/lib/auth";
import { verifyTurnstile } from "@/lib/turnstile";
import { isMobileClient } from "@/lib/mobileAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate shape + rules BEFORE touching the database.
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, turnstileToken } = parsed.data;

    // 2. Bypass Turnstile for mobile clients using shared API key.
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

    // 3. Reject duplicate emails with a clear message.
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "هذا البريد الإلكتروني مسجل بالفعل" },
        { status: 409 }
      );
    }

    // 4. Never store the plain password — only the bcrypt hash.
    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // 5. Issue tokens immediately so the user is logged in right after registering.
    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role, name: user.name, tier: user.tier });
    const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role, name: user.name });

    await User.updateOne(
      { _id: user._id },
      { refreshTokenHash: crypto.createHash("sha256").update(refreshToken).digest("hex") }
    );

    const res = NextResponse.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tier: user.tier,
        },
      },
    });

    // httpOnly = JavaScript in the browser can NEVER read this cookie.
    // This is the main defense against XSS stealing the refresh token.
    res.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days, matches token expiry
    });

    return res;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم، حاول مرة أخرى" },
      { status: 500 }
    );
  }
}
