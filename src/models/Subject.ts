import { Schema, model, models, type Document } from "mongoose";

export interface ISubject extends Document {
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  collegeId: Schema.Types.ObjectId;
  isShared: boolean;
  imageType: "icon" | "url" | "cloudinary";
  imageUrl?: string;
  icon: string;
  topics: Schema.Types.ObjectId[];
  teacherIds: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: [true, "اسم المادة مطلوب"],
      trim: true,
    },
    nameAr: {
      type: String,
      trim: true,
      default: "",
    },
    nameEn: {
      type: String,
      trim: true,
      default: "",
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "الرابط يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وشرطات فقط"],
    },
    collegeId: {
      type: Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    imageType: {
      type: String,
      enum: ["icon", "url", "cloudinary"],
      default: "icon",
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    icon: {
      type: String,
      default: "BookOpen",
    },
    topics: [
      {
        type: Schema.Types.ObjectId,
        ref: "Topic",
      },
    ],
    teacherIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

SubjectSchema.index({ collegeId: 1, slug: 1 });
SubjectSchema.index({ collegeId: 1 });
SubjectSchema.index({ teacherIds: 1 });

SubjectSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    const { Topic } = await import("@/models/Topic");
    const { Question } = await import("@/models/Question");
    await Topic.deleteMany({ subjectId: doc._id });
    await Question.deleteMany({ subjectId: doc._id });
  }
});

export const Subject = models.Subject || model<ISubject>("Subject", SubjectSchema);
