import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { College } from "@/models/College";
import { requireAdmin } from "@/lib/requireAdmin";

const createCollegeSchema = z.object({
  name: z.string().min(2, "اسم الكلية قصير جداً"),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "الرابط غير صالح"),
  comingSoon: z.boolean().optional(),
  isActive: z.boolean().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  imageType: z.enum(["icon", "url", "cloudinary"]).optional(),
  imageUrl: z.string().optional(),
  universityId: z.string().optional(),
});

// GET — list all colleges. Public colleges browsing also needs this
// later, so we don't lock this one behind requireAdmin.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const url = req.nextUrl;
    const universityId = url.searchParams.get("universityId");
    const filter: Record<string, unknown> = {};
    if (universityId) filter.universityId = universityId;
    const colleges = await College.find(filter).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, data: colleges });
  } catch (err) {
    console.error("List colleges error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

// POST — create a new college. Admin only.
export async function POST(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck; // rejection — stop here

  try {
    const body = await req.json();
    const parsed = createCollegeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await College.findOne({ slug: parsed.data.slug });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "يوجد رابط مستخدم بالفعل لكلية أخرى" },
        { status: 409 }
      );
    }

    const college = await College.create(parsed.data);
    return NextResponse.json({ success: true, data: college }, { status: 201 });
  } catch (err) {
    console.error("Create college error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}