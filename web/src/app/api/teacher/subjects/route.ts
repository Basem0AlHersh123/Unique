import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { College } from "@/models/College";
import { Subject } from "@/models/Subject";
import { Topic } from "@/models/Topic";
import { Unit } from "@/models/Unit";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    await connectDB();

    const subjects = await Subject.find({
      teacherIds: payload.userId,
    }).populate("collegeId", "name");

    const data = await Promise.all(
      subjects.map(async (subj) => {
        const [topics, units] = await Promise.all([
          Topic.find({ subjectId: subj._id }).sort({ order: 1 }),
          Unit.find({ subjectId: subj._id }).sort({ order: 1 }),
        ]);
        return {
          _id: subj._id,
          name: subj.name,
          nameAr: subj.nameAr,
          nameEn: subj.nameEn,
          slug: subj.slug,
          collegeId: subj.collegeId,
          college: (subj.collegeId as { name?: string } | null)?.name || "",
          topics,
          units,
        };
      })
    );

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Teacher subjects error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
