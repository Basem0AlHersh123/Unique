import { Schema, model, models, type Document } from "mongoose";

export interface IUniversity extends Document {
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  imageType: "icon" | "url" | "cloudinary";
  imageUrl?: string;
  icon: string;
  isActive: boolean;
  comingSoon: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UniversitySchema = new Schema<IUniversity>(
  {
    name: {
      type: String,
      required: [true, "اسم الجامعة مطلوب"],
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
      default: "GraduationCap",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    comingSoon: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

UniversitySchema.index({ isActive: 1, comingSoon: 1 });

UniversitySchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    const { College } = await import("@/models/College");
    await College.updateMany(
      { universityId: doc._id },
      { $unset: { universityId: "" } }
    );
  }
});

export const University = models.University || model<IUniversity>("University", UniversitySchema);
