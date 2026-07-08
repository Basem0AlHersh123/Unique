import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Subject } from "@/models/Subject";
import { requireAdmin } from "@/lib/requireAdmin";

const itemSchema = z.object({
  name: z.string().min(2, "اسم المادة مطلوب"),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  slug: z.string().optional(),
  collegeId: z.string().min(1, "يجب اختيار كلية"),
  isShared: z.boolean().optional(),
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
      const dangerous = JSON.stringify(item);
      if (dangerous.includes("$where") || dangerous.includes("$expr") || dangerous.includes("__proto__")) {
        errors.push({ index: i, error: "محتوى غير مسموح به" });
        continue;
      }
      try {
        const slug = item.slug || item.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .slice(0, 60);
        await Subject.create({ ...item, slug });
        created.push(i);
      } catch (err) {
        errors.push({ index: i, error: (err as Error).message });
      }
    }

    return NextResponse.json({ success: true, data: { created: created.length, errors } });
  } catch (err) {
    console.error("Bulk create subjects error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
