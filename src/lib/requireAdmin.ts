import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

/**
 * Call this at the top of any admin-only API route. It reads the JWT
 * from the Authorization header, verifies it's valid and unexpired,
 * and checks the role embedded in it is "admin".
 *
 * Returns null if everything checks out (caller should proceed).
 * Returns a NextResponse if it should be sent back immediately as
 * the rejection (caller should `return` this directly).
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
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
    if (payload.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "هذا الإجراء مخصص للمدير فقط" },
        { status: 403 }
      );
    }
    return null; // all good, let the route continue
  } catch {
    return NextResponse.json(
      { success: false, error: "الجلسة منتهية، يرجى تسجيل الدخول مرة أخرى" },
      { status: 401 }
    );
  }
}
