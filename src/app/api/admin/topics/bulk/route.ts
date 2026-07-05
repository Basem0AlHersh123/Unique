import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Topic } from "@/models/Topic";
import { requireAdmin } from "@/lib/requireAdmin";

const itemSchema = z.object({
  title: z.string().min(2, "عنوان الدرس قصير جداً"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "الرابط غير صالح").optional(),
  subjectId: z.string().min(1, "يجب اختيار مادة"),
  unitId: z.string().optional(),
  videoUrl: z.string().optional(),
  videoType: z.enum(["youtube", "direct"]).default("youtube"),
  contentType: z.enum(["video", "audio", "text", "pdf"]).default("video"),
  audioUrl: z.string().optional(),
  pdfUrl: z.string().optional(),
  richContent: z.string().optional(),
  order: z.number().optional(),
  isFree: z.boolean().optional(),
  isEssential: z.boolean().default(true),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  isPublished: z.boolean().optional(),
  summaryText: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
});

const bulkSchema = z.object({
  items: z.array(itemSchema).min(1).max(200),
});

export async function POST(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();
    const created: number[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < parsed.data.items.length; i++) {
      const item = parsed.data.items[i];
      try {
        const slug = item.slug || item.title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .slice(0, 60);
        await Topic.create({ ...item, slug });
        created.push(i);
      } catch (err) {
        errors.push({ index: i, error: (err as Error).message });
      }
    }

    return NextResponse.json({ success: true, data: { created: created.length, errors } });
  } catch (err) {
    console.error("Bulk create topics error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
