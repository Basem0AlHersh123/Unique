import { Schema, model, models, type Document } from "mongoose";

export interface IAppConfig extends Document {
  minAppVersion: string;
  updateMessage: string;
  updateUrl: string;
  forceUpdateEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const AppConfigSchema = new Schema<IAppConfig>(
  {
    minAppVersion:      { type: String, default: "1.0.0" },
    updateMessage:      { type: String, default: "يرجى تحديث التطبيق للاستمرار" },
    updateUrl:          { type: String, default: "" },
    forceUpdateEnabled: { type: Boolean, default: false },
    maintenanceMode:    { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: "التطبيق في وضع الصيانة، يرجى المحاولة لاحقاً" },
  },
  { timestamps: true, collection: "appconfig" }
);

export const AppConfig =
  models.AppConfig || model<IAppConfig>("AppConfig", AppConfigSchema);
