import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IStudentNote extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  title?: string;
  content: string;
  color?: string;
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
  },
  { timestamps: true }
);

export const StudentNote: mongoose.Model<IStudentNote> =
  models.StudentNote ||
  model<IStudentNote>("StudentNote", StudentNoteSchema);
