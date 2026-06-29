import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Topic } from "@/models/Topic";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

const updateTopicSchema = z.object({
  videoUrl: z.string().optional(),
  videoType: z.enum(["youtube", "direct"]).optional(),
  title: z.string().min(2).optional(),
  aiExplanation: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  vocabulary: z.array(z.object({ word: z.string(), definition: z.string() })).optional(),
  order: z.number().optional(),
  isFree: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateTopicSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const topic = await Topic.findById(id);
    if (!topic) {
      return NextResponse.json(
        { success: false, error: "الموضوع غير موجود" },
        { status: 404 }
      );
    }

    if (payload.role !== "admin" && topic.teacherId?.toString() !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "لا يمكنك تعديل هذا الموضوع" },
        { status: 403 }
      );
    }

    Object.assign(topic, parsed.data);
    await topic.save();

    return NextResponse.json({ success: true, data: topic });
  } catch (err) {
    console.error("Teacher update topic error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
