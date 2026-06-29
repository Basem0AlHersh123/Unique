import { Schema, model, models, type Document } from "mongoose";

export interface ILevel extends Document {
  title: string;
  titleEn?: string;
  subjectId: Schema.Types.ObjectId;
  order: number;
  isPublished: boolean;
  comingSoon: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LevelSchema = new Schema<ILevel>(
  {
    title: {
      type: String,
      required: true,
    },
    titleEn: {
      type: String,
      default: "",
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
  },
  { timestamps: true }
);

LevelSchema.index({ subjectId: 1, order: 1 });
LevelSchema.index({ subjectId: 1, isPublished: 1 });

LevelSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    const { Unit } = await import("@/models/Unit");
    await Unit.deleteMany({ levelId: doc._id });
  }
});

export const Level = models.Level || model<ILevel>("Level", LevelSchema);
