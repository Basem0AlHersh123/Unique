import { NextRequest } from "next/server";

export function isMobileClient(req: NextRequest): boolean {
  const mobileKey = req.headers.get("x-mobile-key");
  const serverKey = process.env.MOBILE_API_KEY;

  if (!serverKey) {
    return false;
  }

  return mobileKey === serverKey;
}
