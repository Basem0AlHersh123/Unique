import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AppConfig } from "@/models/AppConfig";
import { requireAdmin } from "@/lib/requireAdmin";

const schema = z.object({
  minAppVersion:      z.string().regex(/^\d+\.\d+\.\d+$/, "يجب أن يكون بصيغة 1.0.0").optional(),
  updateMessage:      z.string().max(300).optional(),
  updateUrl:          z.string().optional(),
  forceUpdateEnabled: z.boolean().optional(),
  maintenanceMode:    z.boolean().optional(),
  maintenanceMessage: z.string().max(300).optional(),
});

export async function GET(req: NextRequest) {
  const check = requireAdmin(req);
  if (check) return check;
  await connectDB();
  let config = await AppConfig.findOne().lean();
  if (!config) config = (await AppConfig.create({})).toObject();
  return NextResponse.json({ success: true, data: config });
}

export async function PATCH(req: NextRequest) {
  const check = requireAdmin(req);
  if (check) return check;
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success:false, error:parsed.error.issues[0].message }, { status:400 });
    }
    await connectDB();
    const config = await AppConfig.findOneAndUpdate(
      {}, { $set: parsed.data }, { new:true, upsert:true }
    );
    return NextResponse.json({ success:true, data:config });
  } catch {
    return NextResponse.json({ success:false, error:"حدث خطأ في الخادم" }, { status:500 });
  }
}
