import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { StudentNote } from "@/models/StudentNote";
import { requireAuth } from "@/lib/requireAuth";

const updateNoteSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  title: z.string().max(200).optional(),
  color: z.string().optional(),
  type: z.enum(["general", "question", "summary", "important"]).optional(),
  isStarred: z.boolean().optional(),
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

    const note = await StudentNote.findById(id);
    if (!note) {
      return NextResponse.json({ success: false, error: "الملاحظة غير موجودة" }, { status: 404 });
    }

    if (note.userId.toString() !== auth.payload.userId) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 403 });
    }

    const updated = await StudentNote.findByIdAndUpdate(id, parsed.data, { new: true });
    return NextResponse.json({ success: true, data: updated });
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

    const note = await StudentNote.findById(id);
    if (!note) {
      return NextResponse.json({ success: false, error: "الملاحظة غير موجودة" }, { status: 404 });
    }

    if (note.userId.toString() !== auth.payload.userId) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 403 });
    }

    await StudentNote.findByIdAndDelete(id);
    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    console.error("Delete note error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
