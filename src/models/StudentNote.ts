import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IStudentNote extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  title?: string;
  content: string;
  color?: string;
  type: "general" | "question" | "summary" | "important" | "word" | "equation";
  isStarred: boolean;
  tags: string[];
  reminderAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const StudentNoteSchema = new Schema<IStudentNote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lessonId: { type: Schema.Types.ObjectId, ref: "Topic" },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit" },
    title: { type: String, trim: true, maxlength: 200 },
    content: {
      type: String,
      required: [true, "محتوى الملاحظة مطلوب"],
      trim: true,
      maxlength: [5000, "الملاحظة طويلة جداً"],
    },
    color: { type: String, default: "#6C63FF" },
    type: {
      type: String,
      enum: ["general", "question", "summary", "important", "word", "equation"],
      default: "general",
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 20,
        message: "لا يمكن إضافة أكثر من 20 وسم",
      },
    },
    reminderAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

StudentNoteSchema.index({ userId: 1, type: 1 });
StudentNoteSchema.index({ userId: 1, isStarred: 1 });
StudentNoteSchema.index({ userId: 1, reminderAt: 1 });

export const StudentNote: mongoose.Model<IStudentNote> =
  models.StudentNote ||
  model<IStudentNote>("StudentNote", StudentNoteSchema);
