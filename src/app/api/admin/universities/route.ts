import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { University } from "@/models/University";
import { requireAdmin } from "@/lib/requireAdmin";

const createUniversitySchema = z.object({
  name: z.string().min(2, "اسم الجامعة قصير جداً"),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "الرابط غير صالح"),
  logo: z.string().optional(),
  isActive: z.boolean().optional(),
  comingSoon: z.boolean().optional(),
});

export async function GET() {
  try {
    await connectDB();
    const universities = await University.find().sort({ createdAt: 1 });
    return NextResponse.json({ success: true, data: universities });
  } catch (err) {
    console.error("List universities error:", err);
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
    const parsed = createUniversitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await University.findOne({ slug: parsed.data.slug });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "يوجد رابط مستخدم بالفعل لجامعة أخرى" },
        { status: 409 }
      );
    }

    const university = await University.create(parsed.data);
    return NextResponse.json({ success: true, data: university }, { status: 201 });
  } catch (err) {
    console.error("Create university error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
