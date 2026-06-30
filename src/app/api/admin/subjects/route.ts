import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Subject } from "@/models/Subject";
import { College } from "@/models/College";
import { requireAdmin } from "@/lib/requireAdmin";

const createSubjectSchema = z.object({
  name: z.string().min(2, "اسم المادة قصير جداً"),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "الرابط غير صالح"),
  collegeId: z.string().min(1, "يجب اختيار كلية"),
  isShared: z.boolean().optional(),
  imageType: z.enum(["icon", "url", "cloudinary"]).optional(),
  imageUrl: z.string().optional(),
  icon: z.string().optional(),
  aiModel: z.string().optional(),
});

// GET — list subjects, optionally filtered by college.
// Public: students need this to browse a college's subjects.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const collegeId = req.nextUrl.searchParams.get("collegeId");

    const filter = collegeId ? { collegeId } : {};
    const subjects = await Subject.find(filter).sort({ createdAt: 1 });

    return NextResponse.json({ success: true, data: subjects });
  } catch (err) {
    console.error("List subjects error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

// POST — create a subject under an existing college. Admin only.
export async function POST(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const parsed = createSubjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    // The professional rule we just agreed on: refuse to create a Subject
    // pointing to a College that doesn't actually exist.
    const college = await College.findById(parsed.data.collegeId);
    if (!college) {
      return NextResponse.json(
        { success: false, error: "الكلية المحددة غير موجودة" },
        { status: 404 }
      );
    }

    const existingSlug = await Subject.findOne({ slug: parsed.data.slug });
    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: "يوجد رابط مستخدم بالفعل لمادة أخرى" },
        { status: 409 }
      );
    }

    const subject = await Subject.create(parsed.data);

    // Keep the relationship visible from both sides: the College's
    // `subjects` array needs to know this new Subject belongs to it.
    college.subjects.push(subject._id);
    await college.save();

    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (err) {
    console.error("Create subject error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}