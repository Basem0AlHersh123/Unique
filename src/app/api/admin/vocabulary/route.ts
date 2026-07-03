import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Vocabulary } from "@/models/Vocabulary";
import { requireAdmin } from "@/lib/requireAdmin";

const createVocabularySchema = z.object({
  word: z.string().min(1, "الكلمة مطلوبة"),
  definition: z.string().min(1, "التعريف مطلوب"),
  example: z.string().min(1, "المثال مطلوب"),
  arabicMeaning: z.string().min(1, "المعنى بالعربي مطلوب"),
  imageUrl: z.string().optional(),
  collegeId: z.string().min(1, "الكلية مطلوبة"),
  subjectId: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();
    const collegeId = req.nextUrl.searchParams.get("collegeId");
    const subjectId = req.nextUrl.searchParams.get("subjectId");

    const filter: Record<string, string> = {};
    if (collegeId) filter.collegeId = collegeId;
    if (subjectId) filter.subjectId = subjectId;

    const words = await Vocabulary.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: words });
  } catch (err) {
    console.error("List vocabulary error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const parsed = createVocabularySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();
    const word = await Vocabulary.create(parsed.data);

    return NextResponse.json({ success: true, data: word }, { status: 201 });
  } catch (err) {
    console.error("Create vocabulary error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
