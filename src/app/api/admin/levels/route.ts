import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Level } from "@/models/Level";
import { Subject } from "@/models/Subject";
import { requireAdmin } from "@/lib/requireAdmin";

const createLevelSchema = z.object({
  title: z.string().min(1, "عنوان المستوى مطلوب"),
  titleEn: z.string().optional(),
  subjectId: z.string().min(1, "يجب اختيار مادة"),
  order: z.number().optional(),
  description: z.string().optional(),
  comingSoon: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const subjectId = req.nextUrl.searchParams.get("subjectId");

    const filter = subjectId ? { subjectId } : {};
    const levels = await Level.find(filter).sort({ order: 1 });

    return NextResponse.json({ success: true, data: levels });
  } catch (err) {
    console.error("List levels error:", err);
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
    const parsed = createLevelSchema.safeParse(body);

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

    const level = await Level.create(parsed.data);

    return NextResponse.json({ success: true, data: level }, { status: 201 });
  } catch (err) {
    console.error("Create level error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
