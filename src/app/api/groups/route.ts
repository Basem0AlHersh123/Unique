import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Group } from "@/models/Group";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/requireAuth";

function canCreateGroup(role: string, tier: string): boolean {
  if (role === "admin" || role === "teacher") return true;
  if (role === "student" && tier === "paid") return true;
  return false;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { role, userId } = auth.payload;

    let groups;
    const populate = (q: unknown) => {
      interface Chain extends PromiseLike<unknown> { populate(f: string, s: string): Chain; sort(o: Record<string, unknown>): Chain }
      const chain = q as unknown as Chain;
      return chain
        .populate("subjectId", "name")
        .populate("createdBy", "name email")
        .populate("members", "name email role")
        .populate("groupAdmins", "name email")
        .populate("blockedMembers", "name email")
        .sort({ createdAt: -1 });
    };

    if (role === "admin") {
      groups = await populate(Group.find());
    } else {
      groups = await populate(
        Group.find({
          $or: [
            { members: userId },
            { joinMode: { $in: ["open", "request"] } },
          ],
        })
      );
    }

    return NextResponse.json({ success: true, data: groups });
  } catch (err) {
    console.error("List groups error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { name, description, type, subjectId, joinMode } = await req.json();
    const { userId, role } = auth.payload;

    await connectDB();

    const user = await User.findById(userId).select("tier").lean();
    const tier = user?.tier || "free";

    if (!canCreateGroup(role, tier)) {
      return NextResponse.json(
        { success: false, error: "ليس لديك صلاحية إنشاء مجموعة" },
        { status: 403 }
      );
    }

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "اسم المجموعة مطلوب" },
        { status: 400 }
      );
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || "",
      type: type || "general",
      subjectId: subjectId || undefined,
      members: [userId],
      groupAdmins: [userId],
      createdBy: userId,
      joinMode: joinMode || "open",
    });

    return NextResponse.json({ success: true, data: group }, { status: 201 });
  } catch (err) {
    console.error("Create group error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
