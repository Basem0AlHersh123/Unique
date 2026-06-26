import mongoose, { Schema, model, models, type Document } from "mongoose";

/**
 * This interface gives us TypeScript autocomplete and type-checking
 * everywhere we use a User document in our code.
 */
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  collegeId?: mongoose.Types.ObjectId;
  role: "student" | "admin" | "teacher";
  tier: "free" | "paid";
  isVerified: boolean;
  isActive: boolean;
  deactivatedAt?: Date;
  streak: number;
  lastActive: Date;
  examDate?: Date;
  refreshTokenHash?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  pushToken?: string;
  dailyGoal: number;
  studyReminderTime: string;
  studyReminderEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "الاسم مطلوب"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "البريد الإلكتروني مطلوب"],
      unique: true,
      lowercase: true,
      trim: true,
      // Basic email shape check at the DB layer too — defense in depth,
      // even though Zod already validates this before it gets here.
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "بريد إلكتروني غير صالح"],
    },
    password: {
      type: String,
      required: true,
      // We never return password by default in queries (see select: false).
      select: false,
    },
    collegeId: {
      type: Schema.Types.ObjectId,
      ref: "College",
    },
    role: {
      type: String,
      enum: ["student", "admin", "teacher"],
      default: "student",
    },
    tier: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date },
    streak: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    examDate: {
      type: Date,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    pushToken: {
      type: String,
      default: "",
      select: false,
    },
    dailyGoal: {
      type: Number,
      default: 1,
      min: 1,
      max: 20,
    },
    studyReminderTime: {
      type: String,
      default: "",
    },
    studyReminderEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

UserSchema.index({ role: 1 });
UserSchema.index({ collegeId: 1 });
UserSchema.index({ tier: 1 });

// Prevents "Cannot overwrite model" errors during Next.js hot-reload —
// re-use the existing compiled model if it already exists.
export const User = models.User || model<IUser>("User", UserSchema);
