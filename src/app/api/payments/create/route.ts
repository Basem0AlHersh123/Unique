import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { requireAuth } from "@/lib/requireAuth";
import { sanitizeData } from "@/lib/data-sanitizer";

export const PLANS = {
  monthly: { label: "شهري", labelEn: "Monthly", amount: 2000, durationDays: 30 },
  quarterly: { label: "ربع سنوي", labelEn: "Quarterly (3 months)", amount: 5000, durationDays: 90 },
  lifetime: { label: "مدى الحياة", labelEn: "Lifetime", amount: 15000, durationDays: null },
} as const;

const bodySchema = z.object({ plan: z.enum(["monthly", "quarterly", "lifetime"]) });

function signPayload(orderId: string, amount: number, appId: string): string {
  const merchantKey = process.env.BAS_MERCHANT_KEY;
  if (!merchantKey) throw new Error("BAS_MERCHANT_KEY not configured");
  const payload = `${orderId}|${amount}|YER|${appId}`;
  return crypto.createHmac("sha256", merchantKey).update(payload).digest("hex");
}

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const sanitizeError = sanitizeData(body);
    if (sanitizeError) return sanitizeError;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { plan } = parsed.data;
    const planConfig = PLANS[plan];
    const amount = planConfig.amount;

    const basUrl = process.env.BAS_BASE_URL;
    const clientId = process.env.BAS_CLIENT_ID;
    const clientSecret = process.env.BAS_CLIENT_SECRET;
    const appId = process.env.BAS_APP_ID;

    if (!basUrl || !clientId || !clientSecret || !appId) {
      return NextResponse.json(
        { success: false, error: "بوابة الدفع غير مُعدَّة بعد. يرجى التواصل مع الإدارة." },
        { status: 503 }
      );
    }

    await connectDB();

    const orderId = `UNIQUE-SUB-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const signature = signPayload(orderId, amount, appId);

    const basRes = await fetch(`${basUrl}/v1/transaction/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-ID": clientId,
        "X-Client-Secret": clientSecret,
      },
      body: JSON.stringify({
        app_id: appId,
        order_id: orderId,
        amount,
        currency: "YER",
        signature,
        description: `UNIQUE Platform — ${planConfig.labelEn}`,
        metadata: { userId, plan },
      }),
    });

    if (!basRes.ok) {
      const errText = await basRes.text();
      console.error("BAS initiate error:", errText);
      return NextResponse.json({ success: false, error: "فشل في بدء عملية الدفع. حاول مرة أخرى." }, { status: 502 });
    }

    const basData = await basRes.json();
    const transactionToken = basData?.data?.transaction_token || basData?.transaction_token;

    if (!transactionToken) {
      return NextResponse.json({ success: false, error: "لم يتم استلام رمز المعاملة من بوابة الدفع." }, { status: 502 });
    }

    await Payment.create({
      userId,
      orderId,
      plan,
      amount,
      currency: "YER",
      status: "pending",
      transactionToken,
      expiresAt: planConfig.durationDays
        ? new Date(Date.now() + planConfig.durationDays * 86400000)
        : null,
    });

    return NextResponse.json({
      success: true,
      data: { transactionToken, orderId, amount, plan, planLabel: planConfig.label },
    });
  } catch (err) {
    console.error("Payment create error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: Object.entries(PLANS).map(([key, p]) => ({
      id: key,
      label: p.label,
      labelEn: p.labelEn,
      amount: p.amount,
      currency: "YER",
      durationDays: p.durationDays,
    })),
  });
}
