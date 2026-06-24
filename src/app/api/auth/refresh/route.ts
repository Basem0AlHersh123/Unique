import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى" },
        { status: 401 }
      );
    }

    const payload = verifyRefreshToken(refreshToken);

    await connectDB();
    const user = await User.findById(payload.userId).select("+refreshTokenHash");
    if (!user) {
      return NextResponse.json(
        { success: false, error: "الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى" },
        { status: 401 }
      );
    }

    if (user.refreshTokenHash && user.refreshTokenHash !== hashToken(refreshToken)) {
      return NextResponse.json(
        { success: false, error: "الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى" },
        { status: 401 }
      );
    }

    const newRefreshToken = signRefreshToken({
      userId: payload.userId,
      role: user.role,
      name: user.name,
    });
    const accessToken = signAccessToken({
      userId: payload.userId,
      role: user.role,
      name: user.name,
      tier: user.tier,
    });

    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    const res = NextResponse.json({
      success: true,
      data: { accessToken },
    });

    res.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى" },
      { status: 401 }
    );
  }
}
