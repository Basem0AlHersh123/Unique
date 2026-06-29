import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IAiMessage {
  role: "user" | "model";
  content: string;
  createdAt: Date;
}

export interface IAiConversation extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: IAiMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const AiMessageSchema = new Schema<IAiMessage>(
  {
    role: { type: String, enum: ["user", "model"], required: true },
    content: {
      type: String,
      required: true,
      maxlength: [8000, "الرسالة طويلة جداً"],
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AiConversationSchema = new Schema<IAiConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "محادثة جديدة",
      maxlength: 200,
      trim: true,
    },
    messages: {
      type: [AiMessageSchema],
      default: [],
      validate: {
        validator: (msgs: IAiMessage[]) => msgs.length <= 100,
        message: "المحادثة وصلت الحد الأقصى من الرسائل",
      },
    },
  },
  { timestamps: true }
);

AiConversationSchema.index({ userId: 1, createdAt: -1 });

export const AiConversation =
  models.AiConversation ||
  model<IAiConversation>("AiConversation", AiConversationSchema);
