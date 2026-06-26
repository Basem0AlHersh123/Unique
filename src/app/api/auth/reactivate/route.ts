import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, password } = await req.json();

  const user = await User.findOne({ email }).select("+password");
  if (!user) return NextResponse.json({ success: false, error: "البيانات غير صحيحة" }, { status: 401 });

  const valid = await verifyPassword(password, user.password);
  if (!valid) return NextResponse.json({ success: false, error: "البيانات غير صحيحة" }, { status: 401 });

  await User.findByIdAndUpdate(user._id, {
    $set: { isActive: true, deactivatedAt: null },
  });

  return NextResponse.json({ success: true, data: { message: "تم إعادة تفعيل الحساب بنجاح" } });
}
