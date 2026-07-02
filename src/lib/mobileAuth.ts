import crypto from "crypto";
import { NextRequest } from "next/server";

export function isMobileClient(req: NextRequest): boolean {
  const mobileKey = req.headers.get("x-mobile-key");
  const serverKey = process.env.MOBILE_API_KEY;

  if (!serverKey || !mobileKey) return false;

  try {
    const a = Buffer.from(mobileKey, "utf8");
    const b = Buffer.from(serverKey, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
