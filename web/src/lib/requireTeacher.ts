import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

export function requireTeacher(
  req: NextRequest
): NextResponse | null {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "غير مصرح لك بهذا الإجراء" },
      { status: 401 }
    );
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    if (payload.role !== "teacher" && payload.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "هذا الإجراء مخصص للمدرسين فقط" },
        { status: 403 }
      );
    }
    return null;
  } catch {
    return NextResponse.json(
      { success: false, error: "الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى" },
      { status: 401 }
    );
  }
}
