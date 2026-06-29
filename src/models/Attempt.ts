import { Schema, model, models, type Document } from "mongoose";

export interface IAttemptAnswer {
  questionId: string;
  selected: number;
  correct: number;
  isCorrect: boolean;
}

export interface IAttempt extends Document {
  userId: Schema.Types.ObjectId;
  topicId: Schema.Types.ObjectId;
  subjectId: Schema.Types.ObjectId;
  score: number;
  total: number;
  answers: IAttemptAnswer[];
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttemptSchema = new Schema<IAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    topicId: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
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
    total: {
      type: Number,
      required: true,
    },
    answers: [
      {
        questionId: { type: String, required: true },
        selected: { type: Number, required: true },
        correct: { type: Number, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

AttemptSchema.index({ userId: 1, completedAt: -1 });
AttemptSchema.index({ topicId: 1, userId: 1 });
AttemptSchema.index({ topicId: 1 });

export const Attempt =
  models.Attempt || model<IAttempt>("Attempt", AttemptSchema);
