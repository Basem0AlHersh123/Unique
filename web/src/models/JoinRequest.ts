import { Schema, model, models, type Document } from "mongoose";

export interface IJoinRequest extends Document {
  groupId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const JoinRequestSchema = new Schema<IJoinRequest>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

JoinRequestSchema.index({ groupId: 1, userId: 1 }, { unique: true });
JoinRequestSchema.index({ groupId: 1, status: 1 });
JoinRequestSchema.index({ userId: 1 });

export const JoinRequest =
  models.JoinRequest || model<IJoinRequest>("JoinRequest", JoinRequestSchema);
