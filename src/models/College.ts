import { Schema, model, models, type Document } from "mongoose";

export interface ICollege extends Document {
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  subjects: Schema.Types.ObjectId[];
  isActive: boolean;
  comingSoon: boolean;
  icon: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeSchema = new Schema<ICollege>(
  {
    name: {
      type: String,
      required: [true, "اسم الكلية مطلوب"],
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
      // Only lowercase letters, numbers, and hyphens — this is what
      // makes it safe to put directly into a URL like /colleges/computer-science
      match: [/^[a-z0-9-]+$/, "الرابط يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وشرطات فقط"],
    },
    subjects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    comingSoon: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
      default: "GraduationCap", // a Lucide icon name, used later in the UI
    },
    color: {
      type: String,
      default: "#6C63FF", // matches our primary brand color by default
    },
  },
  { timestamps: true }
);

CollegeSchema.index({ isActive: 1, comingSoon: 1 });
CollegeSchema.index({ isActive: 1 });

CollegeSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    const { Subject } = await import("@/models/Subject");
    await Subject.deleteMany({ collegeId: doc._id });
  }
});

export const College = models.College || model<ICollege>("College", CollegeSchema);
