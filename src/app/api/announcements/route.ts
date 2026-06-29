import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Announcement } from "@/models/Announcement";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const now = new Date();
    let userTier = "free";
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = verifyAccessToken(authHeader.slice(7));
        userTier = (payload as any).tier ?? "free";
      } catch {}
    }
    const filter: Record<string,unknown> = {
      isActive: true,
      $or: [{ targetAudience:"all" }, { targetAudience:userTier }],
      $and: [
        { $or: [{ startsAt:{ $exists:false } }, { startsAt:null }, { startsAt:{ $lte:now } }] },
        { $or: [{ endsAt:{ $exists:false } }, { endsAt:null }, { endsAt:{ $gte:now } }] },
      ],
    };
    const announcements = await Announcement.find(filter)
      .sort({ priority:-1, createdAt:-1 }).limit(5).lean();
    return NextResponse.json({ success:true, data:announcements });
  } catch {
    return NextResponse.json({ success:true, data:[] });
  }
}
