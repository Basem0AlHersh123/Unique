import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/requireAuth";

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if ("status" in authResult) return authResult;

  await connectDB();
  await User.findByIdAndUpdate(authResult.payload.userId, {
    $set: { isActive: false, deactivatedAt: new Date(), refreshTokenHash: null },
  });

  return NextResponse.json({ success: true, data: { message: "تم تعطيل الحساب بنجاح" } });
}
