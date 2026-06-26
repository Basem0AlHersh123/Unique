import { connectDB } from "@/lib/db";
import { ApiSetting } from "@/models/ApiSetting";
import { ApiUsage } from "@/models/ApiUsage";
import { decrypt } from "@/lib/encryption";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

export async function callGemini(
  messages: GeminiMessage[],
  systemInstruction: string,
  userId: string,
  endpoint: string
): Promise<GeminiResult> {
  await connectDB();

  const setting = await ApiSetting.findOne().lean();
  if (!setting?.key) {
    throw new Error("لم يتم إعداد مفتاح الذكاء الاصطناعي بعد، تواصل مع المدير");
  }

  const apiKey = decrypt(setting.key);

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: messages,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", errText);
    throw new Error("فشل الاتصال بالذكاء الاصطناعي، حاول مرة أخرى");
  }

  const data = await response.json();

  const text: string =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "لم أتمكن من الإجابة، حاول مرة أخرى";

  const tokensIn: number = data.usageMetadata?.promptTokenCount ?? 0;
  const tokensOut: number = data.usageMetadata?.candidatesTokenCount ?? 0;

  ApiUsage.create({
    userId,
    provider: "gemini",
    tokensIn,
    tokensOut,
    aiModel: "gemini-2.0-flash",
    endpoint,
  }).catch((e) => console.error("Usage log error:", e));

  return { text, tokensIn, tokensOut };
}
