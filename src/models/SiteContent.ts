import { Schema, model, models, type Document } from "mongoose";

export interface ISiteContent extends Document {
  section: string;
  data: Record<string, unknown>;
  updatedAt: Date;
}

const SiteContentSchema = new Schema<ISiteContent>(
  {
    section: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  { timestamps: true }
);

export const SiteContent =
  models.SiteContent || model<ISiteContent>("SiteContent", SiteContentSchema);
