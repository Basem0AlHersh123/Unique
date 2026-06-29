import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { UnitExamAttempt } from "@/models/UnitExamAttempt";
import { LessonProgress } from "@/models/LessonProgress";
import { Question } from "@/models/Question";
import { Topic } from "@/models/Topic";
import { Unit } from "@/models/Unit";
import { requireAuth } from "@/lib/requireAuth";

function getTodayMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Shared eligibility check used by both GET and POST
async function checkEligibility(
  userId: string,
  unitId: string
): Promise<{
  eligible: boolean;
  reason?: string;
  nextAttemptAt?: Date | null;
  alreadyPassed?: boolean;
  attemptsToday?: number;
  attemptsRemaining?: number;
}> {
  const todayMidnight = getTodayMidnight();

  const [todayAttempts, passedAttempt] = await Promise.all([
    UnitExamAttempt.find({
      userId,
      unitId,
      takenAt: { $gte: todayMidnight },
    }).sort({ takenAt: -1 }),
    UnitExamAttempt.findOne({ userId, unitId, passed: true })
      .sort({ takenAt: -1 })
      .lean(),
  ]);

  const count = todayAttempts.length;

  if (count >= 3) {
    return {
      eligible: false,
      reason: "daily_limit",
      nextAttemptAt: null,
      attemptsToday: count,
      attemptsRemaining: 0,
    };
  }

  if (count > 0) {
    const lastAttempt = todayAttempts[0];
    const cooldownEnd = new Date(lastAttempt.takenAt.getTime() + 30 * 60 * 1000);
    if (new Date() < cooldownEnd) {
      return {
        eligible: false,
        reason: "cooldown",
        nextAttemptAt: cooldownEnd,
        attemptsToday: count,
        attemptsRemaining: 3 - count,
      };
    }
  }

  return {
    eligible: true,
    alreadyPassed: !!passedAttempt,
    attemptsToday: count,
    attemptsRemaining: 3 - count,
  };
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickQuestions<T>(
  easy: T[],
  medium: T[],
  hard: T[]
): T[] {
  const total = 20;
  let easyTarget = 6;
  let mediumTarget = 9;
  let hardTarget = 5;

  const availableEasy = easy.length;
  const availableMedium = medium.length;
  const availableHard = hard.length;
  const totalAvailable = availableEasy + availableMedium + availableHard;

  if (totalAvailable < total) {
    // Not enough questions — return all we have
    return shuffleArray([...easy, ...medium, ...hard]);
  }

  // If any category is short, redistribute proportionally
  if (availableEasy < easyTarget) {
    const shortfall = easyTarget - availableEasy;
    easyTarget = availableEasy;
    mediumTarget += Math.round(shortfall * (availableMedium / (availableMedium + availableHard)));
    hardTarget += shortfall - Math.round(shortfall * (availableMedium / (availableMedium + availableHard)));
  }
  if (availableMedium < mediumTarget) {
    const shortfall = mediumTarget - availableMedium;
    mediumTarget = availableMedium;
    easyTarget += Math.round(shortfall * (availableEasy / (availableEasy + availableHard)));
    hardTarget += shortfall - Math.round(shortfall * (availableEasy / (availableEasy + availableHard)));
  }
  if (availableHard < hardTarget) {
    const shortfall = hardTarget - availableHard;
    hardTarget = availableHard;
    easyTarget += Math.round(shortfall * (availableEasy / (availableEasy + availableMedium)));
    mediumTarget += shortfall - Math.round(shortfall * (availableEasy / (availableEasy + availableMedium)));
  }

  return [
    ...shuffleArray(easy).slice(0, easyTarget),
    ...shuffleArray(medium).slice(0, mediumTarget),
    ...shuffleArray(hard).slice(0, hardTarget),
  ];
}

const submitExamSchema = z.object({
  unitId: z.string().min(1),
  subjectId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string(),
      answer: z.number(),
    })
  ),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const unitId = req.nextUrl.searchParams.get("unitId");
    const subjectId = req.nextUrl.searchParams.get("subjectId");

    if (subjectId) {
      const attempts = await UnitExamAttempt.find({
        userId: auth.payload.userId,
        subjectId,
      }).sort({ takenAt: -1 });

      return NextResponse.json({ success: true, data: attempts });
    }

    if (!unitId) {
      return NextResponse.json(
        { success: false, error: "unitId أو subjectId مطلوب" },
        { status: 400 }
      );
    }

    const eligibility = await checkEligibility(auth.payload.userId, unitId);

    const attempts = await UnitExamAttempt.find({
      userId: auth.payload.userId,
      unitId,
    }).sort({ takenAt: -1 });

    return NextResponse.json({ success: true, data: { ...eligibility, attempts } });
  } catch (err) {
    console.error("Exam eligibility error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = submitExamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const { unitId, subjectId, answers } = parsed.data;
    const userId = auth.payload.userId;

    // Eligibility check
    const eligibility = await checkEligibility(userId, unitId);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          success: false,
          error:
            eligibility.reason === "daily_limit"
              ? "لقد استنفذت محاولات اليوم"
              : "يرجى الانتظار قبل المحاولة مرة أخرى",
          data: eligibility,
        },
        { status: 403 }
      );
    }

    // Fetch unit to get lesson IDs
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة" },
        { status: 404 }
      );
    }

    // Fetch all published lessons (topics) for this unit
    const topics = await Topic.find({ unitId, isPublished: true }).select("_id");
    const topicIds = topics.map((t) => t._id);

    if (topicIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "لا توجد دروس منشورة في هذه الوحدة" },
        { status: 400 }
      );
    }

    // Fetch published questions from those topics
    const allQuestions = await Question.find({
      topicId: { $in: topicIds },
      isPublished: true,
    }).lean();

    if (allQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: "لا توجد أسئلة منشورة لهذه الوحدة" },
        { status: 400 }
      );
    }

    // Separate by difficulty
    const easy = allQuestions.filter((q) => q.difficulty === "easy");
    const medium = allQuestions.filter((q) => q.difficulty === "medium");
    const hard = allQuestions.filter((q) => q.difficulty === "hard");

    const selectedQuestions = pickQuestions(easy, medium, hard);

    // Verify answers against DB
    const questionMap = new Map(
      selectedQuestions.map((q) => [q._id.toString(), q])
    );

    let correctAnswers = 0;
    for (const { questionId, answer } of answers) {
      const question = questionMap.get(questionId);
      if (question && question.correctAnswer === answer) {
        correctAnswers++;
      }
    }

    const totalQuestions = selectedQuestions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= 70;

    // Determine attempt number for today
    const todayMidnight = getTodayMidnight();
    const todayAttempts = await UnitExamAttempt.countDocuments({
      userId,
      unitId,
      takenAt: { $gte: todayMidnight },
    });
    const attemptNumber = todayAttempts + 1;

    // Create the attempt record
    const attempt = await UnitExamAttempt.create({
      userId,
      unitId,
      subjectId,
      score,
      passed,
      totalQuestions,
      correctAnswers,
      attemptNumber,
    });

    // If passed, mark all unit lessons as completed via LessonProgress
    if (passed) {
      const now = new Date();
      const bulkOps = topicIds.map((topicId) => ({
        updateOne: {
          filter: { userId, lessonId: topicId },
          update: {
            $set: {
              userId,
              lessonId: topicId,
              unitId,
              subjectId,
              watchedVideo: true,
              passedQuiz: true,
              completedAt: now,
            },
          },
          upsert: true,
        },
      }));
      await LessonProgress.bulkWrite(bulkOps);
    }

    // Compute next attempt info
    let nextAttemptAt: Date | null = null;
    if (!passed && eligibility.attemptsRemaining! - 1 > 0) {
      nextAttemptAt = new Date(Date.now() + 30 * 60 * 1000);
    }

    return NextResponse.json({
      success: true,
      data: {
        passed,
        score,
        correctAnswers,
        totalQuestions,
        attemptNumber,
        nextAttemptAt,
      },
    });
  } catch (err) {
    console.error("Submit exam error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
