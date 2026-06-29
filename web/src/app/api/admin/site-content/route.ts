import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SiteContent } from "@/models/SiteContent";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  const adminCheck = requireAdmin(undefined as unknown as NextRequest);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();
    const contents = await SiteContent.find().sort({ section: 1 }).lean();
    return NextResponse.json({ success: true, data: contents });
  } catch (err) {
    console.error("List site content error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const { section, data } = body;

    if (!section || typeof section !== "string") {
      return NextResponse.json(
        { success: false, error: "معرف القسم مطلوب" },
        { status: 400 }
      );
    }

    await connectDB();

    const content = await SiteContent.findOneAndUpdate(
      { section },
      { section, data },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: content });
  } catch (err) {
    console.error("Update site content error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
