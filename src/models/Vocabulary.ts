import { Schema, model, models, type Document } from "mongoose";

export interface IVocabulary extends Document {
  word: string;
  definition: string;
  example: string;
  arabicMeaning: string;
  imageUrl?: string;
  collegeId: Schema.Types.ObjectId;
  subjectId?: Schema.Types.ObjectId;
  difficulty: "easy" | "medium" | "hard";
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VocabularySchema = new Schema<IVocabulary>(
  {
    word: { type: String, required: [true, "الكلمة مطلوبة"], trim: true },
    definition: { type: String, required: [true, "التعريف مطلوب"], trim: true },
    example: { type: String, required: [true, "المثال مطلوب"], trim: true },
    arabicMeaning: { type: String, required: [true, "المعنى بالعربي مطلوب"], trim: true },
    imageUrl: { type: String, default: "" },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Vocabulary = models.Vocabulary || model<IVocabulary>("Vocabulary", VocabularySchema);
