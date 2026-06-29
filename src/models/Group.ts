import { Schema, model, models, type Document } from "mongoose";

export interface IGroup extends Document {
  name: string;
  description?: string;
  type: "announcement" | "subject" | "general";
  subjectId?: Schema.Types.ObjectId;
  members: Schema.Types.ObjectId[];
  groupAdmins: Schema.Types.ObjectId[];
  blockedMembers: Schema.Types.ObjectId[];
  createdBy: Schema.Types.ObjectId;
  isLocked: boolean;
  joinMode: "open" | "request";
  isVisible: boolean;
  allowImages: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["announcement", "subject", "general"],
      default: "general",
    },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    groupAdmins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isLocked: { type: Boolean, default: false },
    joinMode: { type: String, enum: ["open", "request"], default: "open" },
    isVisible: {
      type: Boolean,
      default: true,
    },
    allowImages: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

GroupSchema.index({ createdBy: 1 });
GroupSchema.index({ type: 1 });

GroupSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    const { Message } = await import("@/models/Message");
    const { JoinRequest } = await import("@/models/JoinRequest");
    await Message.deleteMany({ groupId: doc._id });
    await JoinRequest.deleteMany({ groupId: doc._id });
  }
});

export const Group = models.Group || model<IGroup>("Group", GroupSchema);
