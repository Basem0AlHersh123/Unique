import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Announcement } from "@/models/Announcement";
import { requireAdmin } from "@/lib/requireAdmin";

const createSchema = z.object({
  titleAr:        z.string().min(1).max(200),
  titleEn:        z.string().min(1).max(200),
  bodyAr:         z.string().max(1000).optional(),
  bodyEn:         z.string().max(1000).optional(),
  ctaTextAr:      z.string().max(100).optional(),
  ctaTextEn:      z.string().max(100).optional(),
  ctaUrl:         z.string().optional(),
  imageUrl:       z.string().optional(),
  type:           z.enum(["info","promo","warning","success"]).default("info"),
  targetAudience: z.enum(["all","free","paid"]).default("all"),
  isActive:       z.boolean().default(true),
  startsAt:       z.string().datetime({ offset:true }).optional(),
  endsAt:         z.string().datetime({ offset:true }).optional(),
  priority:       z.number().min(0).max(100).default(0),
});

export async function GET(req: NextRequest) {
  const check = requireAdmin(req);
  if (check) return check;
  await connectDB();
  const announcements = await Announcement.find().sort({ priority:-1, createdAt:-1 }).lean();
  return NextResponse.json({ success:true, data:announcements });
}

export async function POST(req: NextRequest) {
  const check = requireAdmin(req);
  if (check) return check;
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success:false, error:parsed.error.issues[0].message }, { status:400 });
    }
    await connectDB();
    const ann = await Announcement.create(parsed.data);
    return NextResponse.json({ success:true, data:ann }, { status:201 });
  } catch {
    return NextResponse.json({ success:false, error:"حدث خطأ في الخادم" }, { status:500 });
  }
}
