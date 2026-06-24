import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { LessonProgress } from "@/models/LessonProgress";
import { requireAuth } from "@/lib/requireAuth";

const createProgressSchema = z.object({
  lessonId: z.string().min(1, "lessonId مطلوب"),
  unitId: z.string().min(1, "unitId مطلوب"),
  subjectId: z.string().min(1, "subjectId مطلوب"),
  action: z.enum(["watched", "passed"]),
  score: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = createProgressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const { lessonId, unitId, subjectId, action, score } = parsed.data;
    const userId = auth.payload.userId;

    // Build the update: toggle the relevant flag
    const setFields: Record<string, unknown> = {};
    if (action === "watched") setFields.watchedVideo = true;
    if (action === "passed") {
      setFields.passedQuiz = true;
      if (score !== undefined) setFields.score = score;
    }

    // Upsert the progress record
    const progress = await LessonProgress.findOneAndUpdate(
      { userId, lessonId },
      { $set: setFields, $setOnInsert: { userId, lessonId, unitId, subjectId } },
      { upsert: true, new: true }
    );

    // If both flags are true now, mark completedAt
    if (progress.watchedVideo && progress.passedQuiz && !progress.completedAt) {
      progress.completedAt = new Date();
      await progress.save();
    }

    return NextResponse.json({ success: true, data: progress });
  } catch (err) {
    console.error("Update lesson progress error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const unitId = req.nextUrl.searchParams.get("unitId");

    if (!unitId) {
      return NextResponse.json(
        { success: false, error: "unitId مطلوب" },
        { status: 400 }
      );
    }

    const progress = await LessonProgress.find({
      userId: auth.payload.userId,
      unitId,
    });

    return NextResponse.json({ success: true, data: progress });
  } catch (err) {
    console.error("Get lesson progress error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
