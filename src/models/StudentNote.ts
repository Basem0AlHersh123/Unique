import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IStudentNote extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  title?: string;
  content: string;
  color: string;
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
    unitId: { type: Schema.Types.ObjectId, ref: "Unit" },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    title: { type: String, trim: true, maxlength: 200, default: "" },
    content: {
      type: String,
      required: [true, "محتوى الملاحظة مطلوب"],
      trim: true,
      maxlength: [10000, "الملاحظة طويلة جداً"],
    },
    color: {
      type: String,
      default: "#6C63FF",
      match: [/^#[0-9A-Fa-f]{6}$/, "لون غير صالح"],
    },
  },
  { timestamps: true }
);

StudentNoteSchema.index({ userId: 1, createdAt: -1 });
StudentNoteSchema.index({ userId: 1, lessonId: 1 });
StudentNoteSchema.index({ userId: 1, subjectId: 1 });

export const StudentNote =
  models.StudentNote || model<IStudentNote>("StudentNote", StudentNoteSchema);
