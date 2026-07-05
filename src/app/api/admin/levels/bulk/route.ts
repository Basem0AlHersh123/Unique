import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Level } from "@/models/Level";
import { requireAdmin } from "@/lib/requireAdmin";

const itemSchema = z.object({
  title: z.string().min(1, "عنوان المستوى مطلوب"),
  titleEn: z.string().optional(),
  subjectId: z.string().min(1, "يجب اختيار مادة"),
  order: z.number().optional(),
  description: z.string().optional(),
  comingSoon: z.boolean().optional(),
  isPublished: z.boolean().optional(),
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
      try {
        await Level.create(parsed.data.items[i]);
        created.push(i);
      } catch (err) {
        errors.push({ index: i, error: (err as Error).message });
      }
    }

    return NextResponse.json({ success: true, data: { created: created.length, errors } });
  } catch (err) {
    console.error("Bulk create levels error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
