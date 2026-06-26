import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { University } from "@/models/University";
import { requireAdmin } from "@/lib/requireAdmin";

const createSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().default(""),
  nameEn: z.string().default(""),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  logo: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
  comingSoon: z.boolean().default(false),
});

export async function GET() {
  await connectDB();
  const universities = await University.find().sort({ createdAt: 1 });
  return NextResponse.json({ success: true, data: universities });
}

export async function POST(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;
  try {
    await connectDB();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    const university = await University.create(parsed.data);
    return NextResponse.json({ success: true, data: university }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ في الخادم";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
