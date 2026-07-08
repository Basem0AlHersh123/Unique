import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { saveToken, saveUser, saveRefreshToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const googleConfigured = !!(webClientId && androidClientId);

let GoogleSigninModule: any = null;

try {
  GoogleSigninModule = require("@react-native-google-signin/google-signin");
  if (googleConfigured) {
    GoogleSigninModule.GoogleSignin.configure({
      webClientId,
      androidClientId,
      offlineAccess: false,
    });
  }
} catch {
  // Native module not available (Expo Go / dev without native build)
}

export function useGoogleAuth(onSuccess: () => void, onError: (msg: string) => void) {
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const [loading, setLoading] = useState(false);

  const promptAsync = useCallback(async () => {
    if (!googleConfigured) {
      onErrorRef.current("لم يتم تكوين تسجيل الدخول بواسطة Google");
      return;
    }

    if (!GoogleSigninModule) {
      onErrorRef.current(
        Platform.OS === "android"
          ? "تسجيل الدخول بواسطة Google متاح فقط في النسخة النهائية. قم ببناء التطبيق باستخدام EAS."
          : "Google Sign-In is only available in a production build. Build the app with EAS."
      );
      return;
    }

    try {
      const { GoogleSignin, statusCodes } = GoogleSigninModule;

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      setLoading(true);

      const { idToken } = await GoogleSignin.signIn();
      if (!idToken) {
        onErrorRef.current("فشل الحصول على رمز Google");
        return;
      }

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
        onSuccessRef.current();
      } else {
        onErrorRef.current(payload.error || "فشل تسجيل الدخول");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        const code = (err as any).code;
        if (code === "SIGN_IN_CANCELLED") return;
        if (code === "PLAY_SERVICES_NOT_AVAILABLE" || err.message?.includes("Play Services")) {
          onErrorRef.current("خدمات Google غير متوفرة على هذا الجهاز");
          return;
        }
        onErrorRef.current(err.message || "حدث خطأ");
      } else {
        onErrorRef.current("حدث خطأ");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { request: null, promptAsync, loading, googleConfigured };
}
