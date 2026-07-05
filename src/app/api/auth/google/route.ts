import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { isMobileClient } from "@/lib/mobileAuth";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function verifyGoogleIdToken(idToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
} | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    if (!res.ok) return null;
    const data = await res.json();

    const validAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ].filter(Boolean);

    if (!validAudiences.includes(data.aud)) return null;
    if (data.email_verified !== "true" && data.email_verified !== true) return null;

    return {
      sub: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
      email_verified: true,
    };
  } catch {
    return null;
  }
}

async function verifyGoogleAccessToken(
  accessToken: string
): Promise<{
  sub: string;
  email: string;
  name: string;
  picture?: string;
} | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.sub || !data.email) return null;
    return {
      sub: data.sub,
      email: data.email,
      name: data.name || data.email.split("@")[0],
      picture: data.picture,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, accessToken: googleAccessToken, userInfo } = body;

    let googleUser: {
      sub: string;
      email: string;
      name: string;
      picture?: string;
      email_verified?: boolean;
    } | null = null;

    if (idToken && typeof idToken === "string") {
      googleUser = await verifyGoogleIdToken(idToken);
    } else if (googleAccessToken && typeof googleAccessToken === "string") {
      const verified = await verifyGoogleAccessToken(googleAccessToken);
      if (verified) {
        googleUser = { ...verified, email_verified: true };
      } else if (userInfo && typeof userInfo === "object" && userInfo.sub && userInfo.email) {
        googleUser = { ...userInfo, email_verified: true };
      }
    }

    if (!googleUser) {
      return NextResponse.json(
        { success: false, error: "رمز Google غير صالح أو منتهي الصلاحية" },
        { status: 401 }
      );
    }

    await connectDB();

    let user = await User.findOne({
      $or: [{ googleId: googleUser.sub }, { email: googleUser.email }],
    });

    if (!user) {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.sub,
        profileImage: googleUser.picture,
        isVerified: true,
        role: "student",
        tier: "free",
        streak: 1,
        lastActive: new Date(),
      });
    } else {
      if (!user.googleId) user.googleId = googleUser.sub;
      if (!user.profileImage && googleUser.picture) user.profileImage = googleUser.picture;

      const now = new Date();
      const lastActive = user.lastActive ? new Date(user.lastActive) : null;
      if (lastActive) {
        const todayStr = now.toDateString();
        const lastStr = lastActive.toDateString();
        if (lastStr !== todayStr) {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          user.streak = lastStr === yesterday.toDateString() ? (user.streak || 0) + 1 : 1;
        }
      } else {
        user.streak = 1;
      }
      user.lastActive = now;
    }

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      tier: user.tier,
    });
    const refreshToken = signRefreshToken({
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
    });

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    const isMobile = isMobileClient(req);
    const responseData: Record<string, unknown> = {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tier: user.tier,
        streak: user.streak,
        profileImage: user.profileImage,
        collegeId: user.collegeId,
      },
    };
    if (isMobile) responseData.refreshToken = refreshToken;

    const res = NextResponse.json({ success: true, data: responseData });
    if (!isMobile) {
      res.cookies.set("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }
    return res;
  } catch (err) {
    console.error("Google auth error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
