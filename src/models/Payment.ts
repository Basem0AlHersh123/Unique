import { Schema, model, models, type Document, type Types } from "mongoose";

export type PaymentStatus = "pending" | "success" | "failed" | "expired";
export type PaymentPlan = "monthly" | "quarterly" | "lifetime";

export interface IPayment extends Document {
  userId: Types.ObjectId;
  orderId: string;
  plan: PaymentPlan;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionToken?: string;
  basTransactionId?: string;
  webhookPayload?: string;
  paidAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId:           { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId:          { type: String, required: true, unique: true },
    plan:             { type: String, enum: ["monthly", "quarterly", "lifetime"], required: true },
    amount:           { type: Number, required: true },
    currency:         { type: String, default: "YER" },
    status:           { type: String, enum: ["pending", "success", "failed", "expired"], default: "pending", index: true },
    transactionToken: { type: String },
    basTransactionId: { type: String },
    webhookPayload:   { type: String, select: false },
    paidAt:           { type: Date },
    expiresAt:        { type: Date },
  },
  { timestamps: true }
);

export const Payment = models.Payment || model<IPayment>("Payment", PaymentSchema);
