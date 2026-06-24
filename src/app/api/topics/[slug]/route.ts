import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Topic } from "@/models/Topic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectDB();
    const topic = await Topic.findOne({ slug, isPublished: true });
    if (!topic) {
      return NextResponse.json(
        { success: false, error: "الموضوع غير موجود" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: topic });
  } catch (err) {
    console.error("Get topic by slug error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
