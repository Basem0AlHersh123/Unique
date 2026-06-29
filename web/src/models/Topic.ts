import { Schema, model, models, type Document } from "mongoose";

export interface IVocabularyItem {
  word: string;
  definition: string;
}

export interface ITopic extends Document {
  title: string;
  slug: string;
  subjectId: Schema.Types.ObjectId;
  unitId?: Schema.Types.ObjectId;
  teacherId?: Schema.Types.ObjectId;
  videoUrl: string;
  videoType?: "youtube" | "direct";
  aiExplanation?: string;
  keyPoints: string[];
  vocabulary: IVocabularyItem[];
  order: number;
  isFree: boolean;
  isPublished: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
  summaryText?: string;
  isEssential: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema = new Schema<ITopic>(
  {
    title: {
      type: String,
      required: [true, "عنوان الموضوع مطلوب"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "الرابط يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وشرطات فقط"],
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    videoUrl: {
      type: String,
      default: "",
    },
    videoType: {
      type: String,
      enum: ["youtube", "direct"],
      default: "youtube",
    },
    aiExplanation: {
      type: String,
      default: "",
    },
    keyPoints: {
      type: [String],
      default: [],
    },
    vocabulary: [
      {
        word: { type: String, required: true },
        definition: { type: String, required: true },
      },
    ],
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: false, // admin marks the first 1-2 topics per subject as free
    },
    isPublished: {
      type: Boolean,
      default: false, // students never see a topic until admin flips this on
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    summaryText: {
      type: String,
      default: "",
    },
    isEssential: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

TopicSchema.index({ subjectId: 1, order: 1 });
TopicSchema.index({ subjectId: 1 });
TopicSchema.index({ isPublished: 1, isFree: 1 });
TopicSchema.index({ unitId: 1, order: 1 });

TopicSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    const { Question } = await import("@/models/Question");
    await Question.deleteMany({ topicId: doc._id });
  }
});

export const Topic = models.Topic || model<ITopic>("Topic", TopicSchema);
