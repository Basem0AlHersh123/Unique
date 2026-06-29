import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Unit } from "@/models/Unit";
import { Topic } from "@/models/Topic";
import { Question } from "@/models/Question";
import { requireAuth } from "@/lib/requireAuth";

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
    return shuffleArray([...easy, ...medium, ...hard]);
  }

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

    const unit = await Unit.findById(unitId);
    if (!unit) {
      return NextResponse.json(
        { success: false, error: "الوحدة غير موجودة" },
        { status: 404 }
      );
    }

    const topics = await Topic.find({ unitId, isPublished: true }).select("_id");
    const topicIds = topics.map((t) => t._id);

    if (topicIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "لا توجد دروس منشورة في هذه الوحدة" },
        { status: 400 }
      );
    }

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

    const easy = allQuestions.filter((q) => q.difficulty === "easy");
    const medium = allQuestions.filter((q) => q.difficulty === "medium");
    const hard = allQuestions.filter((q) => q.difficulty === "hard");

    const selected = pickQuestions(easy, medium, hard);

    const questions = selected.map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
    }));

    return NextResponse.json({
      success: true,
      data: {
        unitId,
        subjectId: unit.subjectId,
        totalQuestions: questions.length,
        questions,
      },
    });
  } catch (err) {
    console.error("Get exam questions error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
