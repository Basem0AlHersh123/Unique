import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Topic } from "@/models/Topic";
import { Question } from "@/models/Question";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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

    const sanitized = questions.map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      order: q.order,
    }));

    return NextResponse.json({
      success: true,
      data: sanitized,
      meta: { total: sanitized.length, topic: topic.title },
    });
  } catch (err) {
    console.error("Get topic questions error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
