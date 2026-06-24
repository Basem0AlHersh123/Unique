export interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
}

export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error("Expo push error:", err);
  }
}
