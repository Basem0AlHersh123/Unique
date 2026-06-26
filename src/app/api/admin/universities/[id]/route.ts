import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { University } from "@/models/University";
import { requireAdmin } from "@/lib/requireAdmin";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  logo: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  comingSoon: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const university = await University.findById(id);
  if (!university) return NextResponse.json({ success: false, error: "الجامعة غير موجودة" }, { status: 404 });
  return NextResponse.json({ success: true, data: university });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    const university = await University.findByIdAndUpdate(id, { $set: parsed.data }, { new: true });
    if (!university) return NextResponse.json({ success: false, error: "الجامعة غير موجودة" }, { status: 404 });
    return NextResponse.json({ success: true, data: university });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ في الخادم";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;
  try {
    await connectDB();
    const { id } = await params;
    await University.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ في الخادم";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
