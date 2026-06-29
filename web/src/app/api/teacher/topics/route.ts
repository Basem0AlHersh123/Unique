import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Topic } from "@/models/Topic";
import { Subject } from "@/models/Subject";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

const createTopicSchema = z.object({
  title: z.string().min(2, "عنوان الموضوع قصير جداً"),
  subjectId: z.string().min(1, "يجب اختيار مادة"),
  unitId: z.string().optional(),
  videoUrl: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  isPublished: z.boolean().optional(),
  isFree: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    const body = await req.json();
    const parsed = createTopicSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const subj = await Subject.findById(parsed.data.subjectId);
    if (!subj) {
      return NextResponse.json(
        { success: false, error: "المادة غير موجودة" },
        { status: 404 }
      );
    }

    if (
      payload.role !== "admin" &&
      !subj.teacherIds.map((id: unknown) => String(id)).includes(payload.userId)
    ) {
      return NextResponse.json(
        { success: false, error: "لا يمكنك إضافة موضوع لهذه المادة" },
        { status: 403 }
      );
    }

    const slug = parsed.data.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || `topic-${Date.now()}`;

    let uniqueSlug = slug;
    let counter = 1;
    while (await Topic.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const topic = await Topic.create({
      ...parsed.data,
      slug: uniqueSlug,
      teacherId: payload.userId,
    });

    return NextResponse.json({ success: true, data: topic }, { status: 201 });
  } catch (err) {
    console.error("Teacher create topic error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
