import { Schema, model, models, type Document } from "mongoose";

export interface IUniversity extends Document {
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  logo?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  comingSoon: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UniversitySchema = new Schema<IUniversity>(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true, default: "" },
    nameEn: { type: String, trim: true, default: "" },
    slug: {
      type: String, required: true, unique: true,
      lowercase: true, trim: true,
      match: [/^[a-z0-9-]+$/, "الرابط يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وشرطات فقط"],
    },
    logo: { type: String, trim: true, default: "" },
    icon: { type: String, default: "🎓" },
    color: { type: String, default: "#6C63FF" },
    isActive: { type: Boolean, default: true },
    comingSoon: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const University = models.University || model<IUniversity>("University", UniversitySchema);
