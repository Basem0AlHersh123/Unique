import { Schema, model, models, type Document } from "mongoose";

export interface IUnitExamAttempt extends Document {
  userId: Schema.Types.ObjectId;
  unitId: Schema.Types.ObjectId;
  subjectId: Schema.Types.ObjectId;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  attemptNumber: number;
  takenAt: Date;
  createdAt: Date;
}

const UnitExamAttemptSchema = new Schema<IUnitExamAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    score: {
      type: Number,
      required: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      required: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
    },
    takenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

UnitExamAttemptSchema.index({ userId: 1, unitId: 1, takenAt: -1 });
UnitExamAttemptSchema.index({ userId: 1, unitId: 1 });

export const UnitExamAttempt =
  models.UnitExamAttempt || model<IUnitExamAttempt>("UnitExamAttempt", UnitExamAttemptSchema);
