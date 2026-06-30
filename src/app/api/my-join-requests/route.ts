import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { JoinRequest } from "@/models/JoinRequest";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const requests = await JoinRequest.find({
      userId: auth.payload.userId,
      status: "pending",
    }).select("groupId status createdAt").lean();

    return NextResponse.json({ success: true, data: requests });
  } catch (err) {
    console.error("My join requests error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
