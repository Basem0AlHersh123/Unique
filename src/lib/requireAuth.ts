import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type TokenPayload } from "@/lib/auth";

export function requireAuth(
  req: NextRequest
): { payload: TokenPayload } | NextResponse {
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
    return { payload };
  } catch {
    return NextResponse.json(
      { success: false, error: "الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى" },
      { status: 401 }
    );
  }
}
