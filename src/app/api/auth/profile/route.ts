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
  profileImage: z.string().url().optional(),
  collegeId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const user = await User.findById(auth.payload.userId).select("name email role createdAt collegeId profileImage");
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
    const updateFields: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateFields.name = parsed.data.name;
    if (parsed.data.pushToken !== undefined) updateFields.pushToken = parsed.data.pushToken;
    if (parsed.data.dailyGoal !== undefined) updateFields.dailyGoal = parsed.data.dailyGoal;
    if (parsed.data.studyReminderTime !== undefined) updateFields.studyReminderTime = parsed.data.studyReminderTime;
    if (parsed.data.studyReminderEnabled !== undefined) updateFields.studyReminderEnabled = parsed.data.studyReminderEnabled;
    if (parsed.data.profileImage !== undefined) updateFields.profileImage = parsed.data.profileImage;
    if (parsed.data.collegeId !== undefined) updateFields.collegeId = parsed.data.collegeId;
    const user = await User.findByIdAndUpdate(
      auth.payload.userId,
      { $set: updateFields },
      { new: true }
    ).select("name email role tier pushToken profileImage dailyGoal studyReminderTime studyReminderEnabled collegeId");

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
