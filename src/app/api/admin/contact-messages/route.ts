import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ContactMessage } from "@/models/ContactMessage";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: messages });
  } catch (err) {
    console.error("List contact messages error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const { id, read } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "معرف الرسالة مطلوب" },
        { status: 400 }
      );
    }

    await connectDB();
    const msg = await ContactMessage.findByIdAndUpdate(
      id,
      { read: read ?? true },
      { new: true }
    );

    if (!msg) {
      return NextResponse.json(
        { success: false, error: "الرسالة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: msg });
  } catch (err) {
    console.error("Update contact message error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
