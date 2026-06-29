import { Schema, model, models, type Document } from "mongoose";

export interface IMessage extends Document {
  groupId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  content: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Schema.Types.ObjectId;
  isEdited: boolean;
  editedAt?: Date;
  imageUrl?: string;
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
      maxlength: [5000, "الرسالة طويلة جداً"],
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

MessageSchema.index({ groupId: 1, createdAt: 1 });
MessageSchema.index({ userId: 1 });

export const Message =
  models.Message || model<IMessage>("Message", MessageSchema);
