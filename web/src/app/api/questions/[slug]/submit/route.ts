import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Topic } from "@/models/Topic";
import { Question } from "@/models/Question";
import { Attempt } from "@/models/Attempt";
import { requireAuth } from "@/lib/requireAuth";

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selected: z.number().min(0),
    })
  ).min(1, "يجب تقديم إجابة واحدة على الأقل"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { slug } = await params;
    const body = await req.json();
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const topic = await Topic.findOne({ slug });
    if (!topic) {
      return NextResponse.json(
        { success: false, error: "الموضوع غير موجود" },
        { status: 404 }
      );
    }

    const questions = await Question.find({
      topicId: topic._id,
      isPublished: true,
    }).sort({ order: 1 });

    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    let score = 0;
    const gradedAnswers = parsed.data.answers.map((a) => {
      const question = questionMap.get(a.questionId);
      if (!question) return null;
      const isCorrect = a.selected === question.correctAnswer;
      if (isCorrect) score++;
      return {
        questionId: a.questionId,
        selected: a.selected,
        correct: question.correctAnswer,
        isCorrect,
      };
    }).filter(Boolean) as {
      questionId: string;
      selected: number;
      correct: number;
      isCorrect: boolean;
    }[];

    const attempt = await Attempt.create({
      userId: auth.payload.userId,
      topicId: topic._id,
      subjectId: topic.subjectId,
      score,
      total: questions.length,
      answers: gradedAnswers,
    });

    const result = gradedAnswers.map((a) => ({
      questionId: a.questionId,
      selected: a.selected,
      correct: a.correct,
      isCorrect: a.isCorrect,
      explanation: questionMap.get(a.questionId)?.explanation ?? "",
      question: questionMap.get(a.questionId)?.question ?? "",
      options: questionMap.get(a.questionId)?.options ?? [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt._id,
        score,
        total: questions.length,
        percentage: questions.length > 0 ? Math.round((score / questions.length) * 100) : 0,
        answers: result,
      },
    });
  } catch (err) {
    console.error("Submit quiz error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
