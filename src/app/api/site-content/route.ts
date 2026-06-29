import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SiteContent } from "@/models/SiteContent";

export async function GET(req: NextRequest) {
  try {
    const section = req.nextUrl.searchParams.get("section");
    if (!section) {
      return NextResponse.json(
        { success: false, error: "معرف القسم مطلوب" },
        { status: 400 }
      );
    }

    await connectDB();
    const content = await SiteContent.findOne({ section }).lean();

    return NextResponse.json({
      success: true,
      data: content?.data ?? null,
    });
  } catch (err) {
    console.error("Get site content error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
