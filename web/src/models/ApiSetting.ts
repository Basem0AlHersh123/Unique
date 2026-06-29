import { Schema, model, models, type Document } from "mongoose";

export interface IApiSetting extends Document {
  key: string;
  provider: string;
  aiModel: string;
  updatedAt: Date;
}

const ApiSettingSchema = new Schema<IApiSetting>(
  {
    key: { type: String, required: [true, "API key is required"] },
    provider: { type: String, default: "gemini" },
    aiModel: { type: String, default: "gemini-2.0-flash" },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "apisetting" }
);

ApiSettingSchema.index({ provider: 1 });

export const ApiSetting =
  models.ApiSetting || model<IApiSetting>("ApiSetting", ApiSettingSchema);
