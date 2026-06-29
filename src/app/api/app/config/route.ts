import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AppConfig } from "@/models/AppConfig";

export async function GET() {
  try {
    await connectDB();
    let config = await AppConfig.findOne().lean();
    if (!config) {
      const created = await AppConfig.create({});
      config = created.toObject();
    }
    return NextResponse.json({
      success: true,
      data: {
        minAppVersion:      config.minAppVersion,
        updateMessage:      config.updateMessage,
        updateUrl:          config.updateUrl,
        forceUpdateEnabled: config.forceUpdateEnabled,
        maintenanceMode:    config.maintenanceMode,
        maintenanceMessage: config.maintenanceMessage,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: { minAppVersion:"1.0.0", updateMessage:"", updateUrl:"",
              forceUpdateEnabled:false, maintenanceMode:false, maintenanceMessage:"" },
    });
  }
}
