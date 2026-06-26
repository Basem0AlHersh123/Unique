import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { University } from "@/models/University";
import { requireAdmin } from "@/lib/requireAdmin";

const updateUniversitySchema = z.object({
  name: z.string().min(2, "اسم الجامعة قصير جداً").optional(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  imageType: z.enum(["icon", "url", "cloudinary"]).optional(),
  imageUrl: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
  comingSoon: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const university = await University.findById(id);
    if (!university) {
      return NextResponse.json(
        { success: false, error: "الجامعة غير موجودة" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: university });
  } catch (err) {
    console.error("Get university error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateUniversitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const university = await University.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!university) {
      return NextResponse.json(
        { success: false, error: "الجامعة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: university });
  } catch (err) {
    console.error("Update university error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    await connectDB();

    const university = await University.findByIdAndDelete(id);
    if (!university) {
      return NextResponse.json(
        { success: false, error: "الجامعة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Delete university error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
