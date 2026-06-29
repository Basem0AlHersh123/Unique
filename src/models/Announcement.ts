import { Schema, model, models, type Document } from "mongoose";

export interface IAnnouncement extends Document {
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
  ctaTextAr?: string;
  ctaTextEn?: string;
  ctaUrl?: string;
  imageUrl?: string;
  type: "info" | "promo" | "warning" | "success";
  targetAudience: "all" | "free" | "paid";
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    titleAr:        { type: String, required: true, trim: true },
    titleEn:        { type: String, required: true, trim: true },
    bodyAr:         { type: String, default: "" },
    bodyEn:         { type: String, default: "" },
    ctaTextAr:      { type: String, default: "" },
    ctaTextEn:      { type: String, default: "" },
    ctaUrl:         { type: String, default: "" },
    imageUrl:       { type: String, default: "" },
    type:           { type: String, enum: ["info","promo","warning","success"], default: "info" },
    targetAudience: { type: String, enum: ["all","free","paid"], default: "all" },
    isActive:       { type: Boolean, default: true },
    startsAt:       { type: Date },
    endsAt:         { type: Date },
    priority:       { type: Number, default: 0 },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ isActive: 1, priority: -1 });
AnnouncementSchema.index({ targetAudience: 1 });

export const Announcement =
  models.Announcement || model<IAnnouncement>("Announcement", AnnouncementSchema);
