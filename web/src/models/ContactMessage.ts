import { Schema, model, models, type Document } from "mongoose";

export interface IContactMessage extends Document {
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: {
      type: String,
      required: [true, "الاسم مطلوب"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "البريد الإلكتروني مطلوب"],
      lowercase: true,
      trim: true,
    },
    message: {
      type: String,
      required: [true, "الرسالة مطلوبة"],
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const ContactMessage =
  models.ContactMessage || model<IContactMessage>("ContactMessage", ContactMessageSchema);
