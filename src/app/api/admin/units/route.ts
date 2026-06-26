import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Unit } from "@/models/Unit";
import { Level } from "@/models/Level";
import { Subject } from "@/models/Subject";
import { requireAdmin } from "@/lib/requireAdmin";

const createUnitSchema = z.object({
  title: z.string().min(1, "عنوان الوحدة مطلوب"),
  titleEn: z.string().optional(),
  levelId: z.string().min(1, "يجب اختيار مستوى"),
  subjectId: z.string().min(1, "يجب اختيار مادة"),
  order: z.number().optional(),
  description: z.string().optional(),
  comingSoon: z.boolean().optional(),
  examEnabled: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const levelId = req.nextUrl.searchParams.get("levelId");
    const subjectId = req.nextUrl.searchParams.get("subjectId");

    const filter: Record<string, string> = {};
    if (levelId) filter.levelId = levelId;
    if (subjectId) filter.subjectId = subjectId;

    const units = await Unit.find(filter).sort({ order: 1 });

    return NextResponse.json({ success: true, data: units });
  } catch (err) {
    console.error("List units error:", err);
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
    const parsed = createUnitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const level = await Level.findById(parsed.data.levelId);
    if (!level) {
      return NextResponse.json(
        { success: false, error: "المستوى المحدد غير موجود" },
        { status: 404 }
      );
    }

    const subject = await Subject.findById(parsed.data.subjectId);
    if (!subject) {
      return NextResponse.json(
        { success: false, error: "المادة المحددة غير موجودة" },
        { status: 404 }
      );
    }

    const unit = await Unit.create(parsed.data);

    return NextResponse.json({ success: true, data: unit }, { status: 201 });
  } catch (err) {
    console.error("Create unit error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
