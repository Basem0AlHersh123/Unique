import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { ContactMessage } from "@/models/ContactMessage";
import { sanitizeData } from "@/lib/data-sanitizer";

const contactSchema = z.object({
  name: z.string().min(2, "الاسم قصير جداً").max(100),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  message: z.string().min(10, "الرسالة قصيرة جداً").max(2000, "الرسالة طويلة جداً"),
  type: z.enum(["suggestion", "complaint", "other"]).default("other"),
  imageUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sanitizeError = sanitizeData(body);
    if (sanitizeError) return sanitizeError;
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();
    const msg = await ContactMessage.create(parsed.data);

    return NextResponse.json(
      { success: true, data: { id: msg._id } },
      { status: 201 }
    );
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
