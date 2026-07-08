import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();

    const [totals, paidStudents] = await Promise.all([
      Payment.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ["$status", "success"] }, "$amount", 0] } },
          },
        },
      ]),
      User.countDocuments({ tier: "paid" }),
    ]);

    const stats: Record<string, number> = { total: 0, successful: 0, pending: 0, failed: 0, revenue: 0, paidStudents };
    for (const row of totals) {
      stats.total += row.count;
      if (row._id === "success") { stats.successful = row.count; stats.revenue = row.revenue; }
      if (row._id === "pending") stats.pending = row.count;
      if (row._id === "failed") stats.failed = row.count;
    }

    return NextResponse.json({ success: true, data: stats });
  } catch (err) {
    console.error("Admin payment stats error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
