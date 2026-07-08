import { NextResponse } from "next/server";

const DANGEROUS_PATTERNS = ["$where", "$expr", "__proto__"];

export function sanitizeData(data: unknown): NextResponse | null {
  const json = JSON.stringify(data);
  for (const pattern of DANGEROUS_PATTERNS) {
    if (json.includes(pattern)) {
      return NextResponse.json(
        { success: false, error: "محتوى غير مسموح به" },
        { status: 400 }
      );
    }
  }
  return null;
}
