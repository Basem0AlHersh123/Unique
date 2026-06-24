import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/requireAuth";
import { signAccessToken } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(2, "الاسم قصير جداً").max(100).optional(),
  pushToken: z.string().optional(),
  dailyGoal: z.number().min(1).max(20).optional(),
  studyReminderTime: z.string().regex(/^\d{2}:\d{2}$/, "صيغة الوقت يجب أن تكون HH:MM").optional(),
  studyReminderEnabled: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const user = await User.findById(auth.payload.userId).select("name email role createdAt");
    if (!user) {
      return NextResponse.json(
        { success: false, error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: user });
  } catch (err) {
    console.error("Get profile error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(
      auth.payload.userId,
      { $set: parsed.data },
      { new: true }
    ).select("name email role tier pushToken dailyGoal studyReminderTime studyReminderEnabled");

    const accessToken = signAccessToken({
      userId: auth.payload.userId,
      role: user!.role,
      name: user!.name,
      tier: user!.tier,
    });

    return NextResponse.json({ success: true, data: user, accessToken });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
