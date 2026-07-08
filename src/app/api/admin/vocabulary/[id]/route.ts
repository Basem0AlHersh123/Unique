import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Vocabulary } from "@/models/Vocabulary";
import { requireAdmin } from "@/lib/requireAdmin";
import { sanitizeData } from "@/lib/data-sanitizer";

const updateVocabularySchema = z.object({
  word: z.string().min(1, "الكلمة مطلوبة").optional(),
  definition: z.string().min(1, "التعريف مطلوب").optional(),
  example: z.string().min(1, "المثال مطلوب").optional(),
  arabicMeaning: z.string().min(1, "المعنى بالعربي مطلوب").optional(),
  imageUrl: z.string().optional(),
  collegeId: z.string().min(1, "الكلية مطلوبة").optional(),
  subjectId: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    await connectDB();

    const word = await Vocabulary.findById(id);
    if (!word) {
      return NextResponse.json(
        { success: false, error: "الكلمة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: word });
  } catch (err) {
    console.error("Get vocabulary error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    const body = await req.json();
    const sanitizeError = sanitizeData(body);
    if (sanitizeError) return sanitizeError;
    const parsed = updateVocabularySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const word = await Vocabulary.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!word) {
      return NextResponse.json(
        { success: false, error: "الكلمة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: word });
  } catch (err) {
    console.error("Update vocabulary error:", err);
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

    const word = await Vocabulary.findByIdAndDelete(id);
    if (!word) {
      return NextResponse.json(
        { success: false, error: "الكلمة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Delete vocabulary error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
