import { Schema, model, models, type Document } from "mongoose";

export interface ILessonProgress extends Document {
  userId: Schema.Types.ObjectId;
  lessonId: Schema.Types.ObjectId;
  unitId: Schema.Types.ObjectId;
  subjectId: Schema.Types.ObjectId;
  watchedVideo: boolean;
  passedQuiz: boolean;
  score?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LessonProgressSchema = new Schema<ILessonProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    watchedVideo: {
      type: Boolean,
      default: false,
    },
    passedQuiz: {
      type: Boolean,
      default: false,
    },
    score: {
      type: Number,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

LessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
LessonProgressSchema.index({ userId: 1, unitId: 1 });
LessonProgressSchema.index({ userId: 1, subjectId: 1 });

export const LessonProgress =
  models.LessonProgress || model<ILessonProgress>("LessonProgress", LessonProgressSchema);
