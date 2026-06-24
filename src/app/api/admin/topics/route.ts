import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Topic } from "@/models/Topic";
import { Subject } from "@/models/Subject";
import { requireAdmin } from "@/lib/requireAdmin";

const createTopicSchema = z.object({
  title: z.string().min(2, "عنوان الموضوع قصير جداً"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "الرابط غير صالح"),
  subjectId: z.string().min(1, "يجب اختيار مادة"),
  unitId: z.string().optional(),
  videoUrl: z.string().optional(),
  order: z.number().optional(),
  isFree: z.boolean().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

// GET — list topics, optionally filtered by subject.
// Public: students browsing a subject's topic list need this.
// Note: this intentionally does NOT filter by isPublished here —
// that filtering belongs in the student-facing route we'll write later,
// since admins need to see unpublished (draft) topics too.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const subjectId = req.nextUrl.searchParams.get("subjectId");
    const unitId = req.nextUrl.searchParams.get("unitId");

    const filter: Record<string, unknown> = {};
    if (subjectId) filter.subjectId = subjectId;
    if (unitId) filter.unitId = unitId;
    const topics = await Topic.find(filter).sort({ order: 1 });

    return NextResponse.json({ success: true, data: topics });
  } catch (err) {
    console.error("List topics error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

// POST — create a topic under an existing subject. Admin only.
// New topics start unpublished (isPublished: false by schema default) —
// the admin must explicitly publish once the content is actually ready.
export async function POST(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const parsed = createTopicSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const subject = await Subject.findById(parsed.data.subjectId);
    if (!subject) {
      return NextResponse.json(
        { success: false, error: "المادة المحددة غير موجودة" },
        { status: 404 }
      );
    }

    const existingSlug = await Topic.findOne({ slug: parsed.data.slug });
    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: "يوجد رابط مستخدم بالفعل لموضوع آخر" },
        { status: 409 }
      );
    }

    const topic = await Topic.create(parsed.data);

    subject.topics.push(topic._id);
    await subject.save();

    return NextResponse.json({ success: true, data: topic }, { status: 201 });
  } catch (err) {
    console.error("Create topic error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}