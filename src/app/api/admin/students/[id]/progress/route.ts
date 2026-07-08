import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/requireAdmin";
import { sanitizeData } from "@/lib/data-sanitizer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  await connectDB();

  const { id } = await params;
  const user = await User.findById(id).select("progress");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ progress: user.progress || {} });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  const body = await req.json();
  const sanitizeError = sanitizeData(body);
  if (sanitizeError) return sanitizeError;
  await connectDB();

  const { id } = await params;
  const user = await User.findById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (typeof body.progress !== "object") {
    return NextResponse.json({ error: "progress must be an object" }, { status: 400 });
  }

  user.progress = { ...(user.progress || {}), ...body.progress };
  await user.save();

  return NextResponse.json({ progress: user.progress });
}
