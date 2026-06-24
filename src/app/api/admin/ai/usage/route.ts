import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ApiUsage } from "@/models/ApiUsage";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/requireAdmin";

interface ByUserEntry {
  userId: string;
  name: string;
  email: string;
  tokensIn: number;
  tokensOut: number;
  requests: number;
}

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();

    const daysParam = req.nextUrl.searchParams.get("days");
    const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const matchStage = { $match: { createdAt: { $gte: since } } };

    const [totalsResult] = await ApiUsage.aggregate<{
      totalTokensIn: number;
      totalTokensOut: number;
      totalRequests: number;
    }>([
      matchStage,
      {
        $group: {
          _id: null,
          totalTokensIn: { $sum: "$tokensIn" },
          totalTokensOut: { $sum: "$tokensOut" },
          totalRequests: { $sum: 1 },
        },
      },
    ]);

    const byUserAgg = await ApiUsage.aggregate<{
      _id: string;
      tokensIn: number;
      tokensOut: number;
      requests: number;
    }>([
      matchStage,
      {
        $group: {
          _id: "$userId",
          tokensIn: { $sum: "$tokensIn" },
          tokensOut: { $sum: "$tokensOut" },
          requests: { $sum: 1 },
        },
      },
    ]);

    const userIds = byUserAgg
      .map((u) => u._id)
      .filter((id): id is string => !!id);

    const users = await User.find({ _id: { $in: userIds } })
      .select("name email")
      .lean();

    const userMap = new Map(
      users.map((u) => [u._id.toString(), { name: u.name, email: u.email }])
    );

    const byUser: ByUserEntry[] = byUserAgg
      .filter((u) => u._id)
      .map((u) => {
        const info = userMap.get(u._id.toString()) ?? {};
        return {
          userId: u._id.toString(),
          name: (info as { name?: string }).name ?? "—",
          email: (info as { email?: string }).email ?? "—",
          tokensIn: u.tokensIn,
          tokensOut: u.tokensOut,
          requests: u.requests,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        totalTokensIn: totalsResult?.totalTokensIn ?? 0,
        totalTokensOut: totalsResult?.totalTokensOut ?? 0,
        totalRequests: totalsResult?.totalRequests ?? 0,
        byUser,
      },
    });
  } catch (err) {
    console.error("Admin AI usage GET error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
