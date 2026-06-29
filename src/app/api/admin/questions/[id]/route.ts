import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Question } from "@/models/Question";
import { requireAdmin } from "@/lib/requireAdmin";

const updateQuestionSchema = z.object({
  question: z.string().min(2, "نص السؤال قصير جداً").optional(),
  options: z.array(z.string()).min(2).max(6).optional(),
  correctAnswer: z.number().min(0).optional(),
  topicId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  explanation: z.string().optional(),
  order: z.number().optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateQuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    if (parsed.data.options && parsed.data.correctAnswer !== undefined) {
      if (parsed.data.correctAnswer >= parsed.data.options.length) {
        return NextResponse.json(
          { success: false, error: "الإجابة الصحيحة خارج نطاق الخيارات" },
          { status: 400 }
        );
      }
    }

    await connectDB();

    const question = await Question.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: "السؤال غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: question });
  } catch (err) {
    console.error("Update question error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    await connectDB();

    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      return NextResponse.json(
        { success: false, error: "السؤال غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Delete question error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
