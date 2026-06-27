import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();

    const search = req.nextUrl.searchParams.get("search") || "";

    const filter: Record<string, unknown> = { role: "student" };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const students = await User.find(filter)
      .select("-password -refreshTokenHash")
      .sort({ createdAt: -1 })
      .lean();

    const studentsWithActive = students.map((s) => ({
      ...s,
      isActive: s.isActive ?? true,
    }));

    return NextResponse.json({ success: true, data: students });
  } catch (err) {
    console.error("List students error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
