import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Attempt } from "@/models/Attempt";
import { LessonProgress } from "@/models/LessonProgress";
import { StudentNote } from "@/models/StudentNote";
import { requireAuth } from "@/lib/requireAuth";

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const userId = auth.payload.userId;
    await Promise.all([
      Attempt.deleteMany({ userId }),
      LessonProgress.deleteMany({ userId }),
      StudentNote.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);
    const res = NextResponse.json({ success: true, data: { message: "تم حذف الحساب بنجاح" } });
    res.cookies.delete("refreshToken");
    return res;
  } catch {
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
