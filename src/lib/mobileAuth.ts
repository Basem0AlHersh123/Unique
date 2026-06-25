import crypto from "crypto";
import { NextRequest } from "next/server";

export function isMobileClient(req: NextRequest): boolean {
  const mobileKey = req.headers.get("x-mobile-key");
  const serverKey = process.env.MOBILE_API_KEY;

  console.error("[mobileAuth] x-mobile-key header:", mobileKey ?? "MISSING");
  console.error("[mobileAuth] MOBILE_API_KEY env:", serverKey ?? "MISSING");
  console.error("[mobileAuth] keys match length:", mobileKey?.length, "vs", serverKey?.length);

  if (!serverKey || !mobileKey) {
    console.error("[mobileAuth] returning false — one key is missing");
    return false;
  }

  try {
    const result = crypto.timingSafeEqual(
      Buffer.from(mobileKey, "utf8"),
      Buffer.from(serverKey, "utf8")
    );
    console.error("[mobileAuth] timingSafeEqual result:", result);
    return result;
  } catch (e) {
    console.error("[mobileAuth] timingSafeEqual threw (length mismatch?):", e);
    return false;
  }
}
