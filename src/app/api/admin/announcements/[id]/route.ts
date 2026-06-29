import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Announcement } from "@/models/Announcement";
import { requireAdmin } from "@/lib/requireAdmin";

const updateSchema = z.object({
  titleAr:        z.string().min(1).max(200).optional(),
  titleEn:        z.string().min(1).max(200).optional(),
  bodyAr:         z.string().max(1000).optional(),
  bodyEn:         z.string().max(1000).optional(),
  ctaTextAr:      z.string().max(100).optional(),
  ctaTextEn:      z.string().max(100).optional(),
  ctaUrl:         z.string().optional(),
  imageUrl:       z.string().optional(),
  type:           z.enum(["info","promo","warning","success"]).optional(),
  targetAudience: z.enum(["all","free","paid"]).optional(),
  isActive:       z.boolean().optional(),
  startsAt:       z.string().datetime({ offset:true }).optional().nullable(),
  endsAt:         z.string().datetime({ offset:true }).optional().nullable(),
  priority:       z.number().min(0).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = requireAdmin(req);
  if (check) return check;
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success:false, error:parsed.error.issues[0].message }, { status:400 });
    }
    await connectDB();
    const ann = await Announcement.findByIdAndUpdate(id, { $set:parsed.data }, { new:true });
    if (!ann) return NextResponse.json({ success:false, error:"الإعلان غير موجود" }, { status:404 });
    return NextResponse.json({ success:true, data:ann });
  } catch {
    return NextResponse.json({ success:false, error:"حدث خطأ في الخادم" }, { status:500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = requireAdmin(req);
  if (check) return check;
  try {
    const { id } = await params;
    await connectDB();
    await Announcement.findByIdAndDelete(id);
    return NextResponse.json({ success:true, data:{ id } });
  } catch {
    return NextResponse.json({ success:false, error:"حدث خطأ في الخادم" }, { status:500 });
  }
}
