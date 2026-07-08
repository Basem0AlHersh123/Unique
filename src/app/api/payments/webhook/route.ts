import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { sanitizeData } from "@/lib/data-sanitizer";

function verifyWebhookSignature(rawBody: string, receivedSig: string): boolean {
  const merchantKey = process.env.BAS_MERCHANT_KEY;
  if (!merchantKey || !receivedSig) return false;
  try {
    const expected = crypto
      .createHmac("sha256", merchantKey)
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(receivedSig, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-bas-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[BAS Webhook] Signature mismatch");
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: { status: string; order_id: string; transaction_id?: string; amount?: number };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const sanitizeError = sanitizeData(payload);
  if (sanitizeError) return sanitizeError;

  const { status, order_id, transaction_id } = payload;

  if (status !== "success" && status !== "SUCCESS") {
    console.log(`[BAS Webhook] Non-success status: ${status} for order ${order_id}`);
    return NextResponse.json({ success: true, data: { acknowledged: true } });
  }

  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findOne({ orderId: order_id }).session(session);

    if (!payment) {
      await session.abortTransaction();
      return NextResponse.json({ success: true, data: { acknowledged: true } });
    }

    if (payment.status === "success") {
      await session.abortTransaction();
      return NextResponse.json({ success: true, data: { acknowledged: true } });
    }

    payment.status = "success";
    payment.basTransactionId = transaction_id;
    payment.paidAt = new Date();
    payment.webhookPayload = rawBody;
    await payment.save({ session });

    await User.findByIdAndUpdate(
      payment.userId,
      {
        tier: "paid",
        isVerified: true,
        ...(payment.expiresAt ? { tierExpiresAt: payment.expiresAt } : {}),
      },
      { session }
    );

    await session.commitTransaction();
    return NextResponse.json({ success: true, data: { processed: true } });
  } catch (err) {
    await session.abortTransaction();
    console.error("[BAS Webhook] Transaction failed:", err);
    return NextResponse.json({ success: false, error: "Internal error — will retry" }, { status: 500 });
  } finally {
    session.endSession();
  }
}
