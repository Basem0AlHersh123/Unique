import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ApiSetting } from "@/models/ApiSetting";
import { ApiUsage } from "@/models/ApiUsage";
import { requireAdmin } from "@/lib/requireAdmin";
import { encrypt, decrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();

    const setting = await ApiSetting.findOne().lean();

    let maskedKey: string | null = null;
    if (setting?.key) {
      try {
        const raw = decrypt(setting.key);
        maskedKey =
          raw.length > 4
            ? "*".repeat(raw.length - 4) + raw.slice(-4)
            : "*".repeat(raw.length);
      } catch {
        maskedKey = "***";
      }
    }

    const totals = await ApiUsage.aggregate<{
      totalTokensIn: number;
      totalTokensOut: number;
      totalRequests: number;
    }>([
      {
        $group: {
          _id: null,
          totalTokensIn: { $sum: "$tokensIn" },
          totalTokensOut: { $sum: "$tokensOut" },
          totalRequests: { $sum: 1 },
        },
      },
    ]);

    const usage = totals[0] ?? {
      totalTokensIn: 0,
      totalTokensOut: 0,
      totalRequests: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        key: maskedKey,
        provider: setting?.provider ?? "gemini",
        updatedAt: setting?.updatedAt ?? null,
        usage,
      },
    });
  } catch (err) {
    console.error("Admin AI GET error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    const body = await req.json();
    const { key } = body;

    if (!key || typeof key !== "string" || !key.trim()) {
      return NextResponse.json(
        { success: false, error: "مفتاح API مطلوب" },
        { status: 400 }
      );
    }

    await connectDB();

    const encrypted = encrypt(key.trim());

    const setting = await ApiSetting.findOneAndUpdate(
      {},
      { key: encrypted, provider: "gemini", updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        provider: setting.provider,
        updatedAt: setting.updatedAt,
      },
    });
  } catch (err) {
    console.error("Admin AI POST error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
