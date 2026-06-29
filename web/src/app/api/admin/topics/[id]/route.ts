import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Topic } from "@/models/Topic";
import { Subject } from "@/models/Subject";
import { requireAdmin } from "@/lib/requireAdmin";

const updateTopicSchema = z.object({
  title: z.string().min(2, "عنوان الموضوع قصير جداً").optional(),
  videoUrl: z.string().optional(),
  contentType: z.enum(["video", "audio", "text", "pdf"]).optional(),
  audioUrl: z.string().optional(),
  pdfUrl: z.string().optional(),
  richContent: z.string().max(50000).optional(),
  aiExplanation: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  vocabulary: z
    .array(z.object({ word: z.string(), definition: z.string() }))
    .optional(),
  order: z.number().optional(),
  isFree: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
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
    const parsed = updateTopicSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const previousTopic = await Topic.findById(id).select("isPublished");

    const topic = await Topic.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!topic) {
      return NextResponse.json(
        { success: false, error: "الموضوع غير موجود" },
        { status: 404 }
      );
    }

    if (parsed.data.isPublished === true && !previousTopic?.isPublished) {
      (async () => {
        try {
          const subject = await Subject.findById(topic.subjectId).select("collegeId nameAr name");
          if (!subject) return;

          const { User } = await import("@/models/User");
          const students = await User.find({
            collegeId: subject.collegeId,
            role: "student",
            pushToken: { $ne: "" },
          }).select("+pushToken").lean();

          const tokens = students
            .map((u: Record<string, unknown>) => u.pushToken)
            .filter((t): t is string => typeof t === "string" && t.startsWith("ExponentPushToken"));

          if (tokens.length === 0) return;

          const { sendPushNotifications } = await import("@/lib/expoPush");
          await sendPushNotifications([{
            to: tokens,
            title: "درس جديد 📚",
            body: `تم إضافة درس جديد: ${topic.title} في ${subject.nameAr || subject.name}`,
            data: { lessonId: topic._id.toString(), subjectId: topic.subjectId.toString() },
            sound: "default",
          }]);
        } catch (err) {
          console.error("Push notification error:", err);
        }
      })();
    }

    return NextResponse.json({ success: true, data: topic });
  } catch (err) {
    console.error("Update topic error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

// Topics have no children (questions reference topics, but we won't
// block topic deletion over orphaned questions until we build the
// question bank — flagged here as a known gap to revisit then).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    await connectDB();

    const topic = await Topic.findByIdAndDelete(id);
    if (!topic) {
      return NextResponse.json(
        { success: false, error: "الموضوع غير موجود" },
        { status: 404 }
      );
    }

    await Subject.findByIdAndUpdate(topic.subjectId, {
      $pull: { topics: topic._id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Delete topic error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}