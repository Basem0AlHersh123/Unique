import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { StudentNote } from "@/models/StudentNote";
import { requireAuth } from "@/lib/requireAuth";

const updateNoteSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  title: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const note = await StudentNote.findOneAndUpdate(
      { _id: id, userId: auth.payload.userId },
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!note) {
      return NextResponse.json({ success: false, error: "الملاحظة غير موجودة أو لا تملك صلاحية التعديل" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: note });
  } catch (err) {
    console.error("Update note error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await connectDB();
    const note = await StudentNote.findOneAndDelete({ _id: id, userId: auth.payload.userId });
    if (!note) {
      return NextResponse.json({ success: false, error: "الملاحظة غير موجودة أو لا تملك صلاحية الحذف" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Delete note error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
