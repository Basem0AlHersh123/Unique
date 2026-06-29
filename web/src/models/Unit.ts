import { Schema, model, models, type Document } from "mongoose";

export interface IUnit extends Document {
  title: string;
  titleEn?: string;
  levelId: Schema.Types.ObjectId;
  subjectId: Schema.Types.ObjectId;
  order: number;
  isPublished: boolean;
  comingSoon: boolean;
  description?: string;
  examEnabled: boolean;
  passingScore: number;
  questionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema = new Schema<IUnit>(
  {
    title: {
      type: String,
      required: true,
    },
    titleEn: {
      type: String,
      default: "",
    },
    levelId: {
      type: Schema.Types.ObjectId,
      ref: "Level",
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    comingSoon: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
    },
    examEnabled: {
      type: Boolean,
      default: true,
    },
    passingScore: {
      type: Number,
      default: 70,
      min: 1,
      max: 100,
    },
    questionCount: {
      type: Number,
      default: 20,
      min: 1,
      max: 100,
    },
  },
  { timestamps: true }
);

UnitSchema.index({ levelId: 1, order: 1 });
UnitSchema.index({ subjectId: 1 });

UnitSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    const { Topic } = await import("@/models/Topic");
    await Topic.deleteMany({ unitId: doc._id });
    const { UnitExamAttempt } = await import("@/models/UnitExamAttempt");
    await UnitExamAttempt.deleteMany({ unitId: doc._id });
  }
});

export const Unit = models.Unit || model<IUnit>("Unit", UnitSchema);
