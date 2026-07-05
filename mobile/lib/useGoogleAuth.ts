import { useCallback, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { saveToken, saveUser, saveRefreshToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth(onSuccess: () => void, onError: (msg: string) => void) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["profile", "email"],
  });

  const handleResponse = useCallback(async () => {
    if (response?.type !== "success") return;

    const idToken = response.authentication?.idToken;
    if (!idToken) {
      onError("فشل الحصول على رمز Google");
      return;
    }

    try {
      const payload = await apiFetch<{
        accessToken: string;
        refreshToken?: string;
        user: Record<string, unknown>;
      }>("/api/auth/google", {
        method: "POST",
        body: { idToken },
      });

      if (payload.success && payload.data) {
        await saveToken(payload.data.accessToken);
        await saveUser(payload.data.user);
        if (payload.data.refreshToken) {
          await saveRefreshToken(payload.data.refreshToken);
        }
        onSuccess();
      } else {
        onError(payload.error || "فشل تسجيل الدخول");
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "حدث خطأ");
    }
  }, [response, onSuccess, onError]);

  useEffect(() => {
    if (response) {
      handleResponse();
    }
  }, [response, handleResponse]);

  return { request, promptAsync };
}
