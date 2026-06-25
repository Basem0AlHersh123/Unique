import crypto from "crypto";
import { NextRequest } from "next/server";

export function isMobileClient(req: NextRequest): boolean {
  const mobileKey = req.headers.get("x-mobile-key");
  const serverKey = process.env.MOBILE_API_KEY;

  if (!serverKey || !mobileKey) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(mobileKey, "utf8"),
      Buffer.from(serverKey, "utf8")
    );
  } catch {
    return false;
  }
}
