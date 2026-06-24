import { Schema, model, models, type Document } from "mongoose";

export interface IApiUsage extends Document {
  userId: Schema.Types.ObjectId;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  aiModel: string;
  endpoint: string;
  createdAt: Date;
}

const ApiUsageSchema = new Schema<IApiUsage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
    },
    provider: { type: String, default: "gemini" },
    tokensIn: { type: Number, required: true, default: 0 },
    tokensOut: { type: Number, required: true, default: 0 },
    aiModel: { type: String, default: "gemini-2.0-flash" },
    endpoint: { type: String, required: [true, "endpoint is required"] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ApiUsageSchema.index({ userId: 1, createdAt: -1 });
ApiUsageSchema.index({ createdAt: 1 });
ApiUsageSchema.index({ provider: 1, createdAt: -1 });

export const ApiUsage =
  models.ApiUsage || model<IApiUsage>("ApiUsage", ApiUsageSchema);
