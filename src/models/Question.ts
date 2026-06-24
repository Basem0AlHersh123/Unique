import { Schema, model, models, type Document } from "mongoose";

export interface IQuestion extends Document {
  question: string;
  options: string[];
  correctAnswer: number;
  topicId: Schema.Types.ObjectId;
  subjectId: Schema.Types.ObjectId;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    question: {
      type: String,
      required: [true, "نص السؤال مطلوب"],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, "خيارات الإجابة مطلوبة"],
      validate: {
        validator: (v: string[]) => v.length >= 2 && v.length <= 6,
        message: "يجب أن يكون بين 2 و 6 خيارات",
      },
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
    },
    topicId: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      required: [true, "الموضوع مطلوب"],
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "المادة مطلوبة"],
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    explanation: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

QuestionSchema.index({ topicId: 1, order: 1 });
QuestionSchema.index({ subjectId: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ topicId: 1, difficulty: 1 });

export const Question =
  models.Question || model<IQuestion>("Question", QuestionSchema);
