import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { StudentNote } from "@/models/StudentNote";
import { requireAuth } from "@/lib/requireAuth";

const createNoteSchema = z.object({
  content: z.string().min(1, "المحتوى مطلوب").max(5000),
  title: z.string().max(200).optional(),
  lessonId: z.string().optional(),
  unitId: z.string().optional(),
  subjectId: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(["general", "question", "summary", "important"]).default("general"),
  isStarred: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = req.nextUrl;
    const filter: Record<string, unknown> = { userId: auth.payload.userId };
    if (searchParams.get("lessonId")) filter.lessonId = searchParams.get("lessonId");
    if (searchParams.get("subjectId")) filter.subjectId = searchParams.get("subjectId");
    const typeParam = searchParams.get("type");
    const starredParam = searchParams.get("starred");
    if (typeParam && ["general","question","summary","important"].includes(typeParam)) {
      filter.type = typeParam;
    }
    if (starredParam === "true") filter.isStarred = true;

    const notes = await StudentNote.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: notes });
  } catch (err) {
    console.error("Get notes error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const note = await StudentNote.create({
      userId: auth.payload.userId,
      ...parsed.data,
    });
    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (err) {
    console.error("Create note error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
