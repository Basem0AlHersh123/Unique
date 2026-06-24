import { Schema, model, models, type Document } from "mongoose";

export interface IMessage extends Document {
  groupId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
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
    content: {
      type: String,
      required: [true, "محتوى الرسالة مطلوب"],
      trim: true,
    },
  },
  { timestamps: true }
);

MessageSchema.index({ groupId: 1, createdAt: 1 });
MessageSchema.index({ userId: 1 });

export const Message =
  models.Message || model<IMessage>("Message", MessageSchema);
