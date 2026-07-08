import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import Button from "@/components/ui/Button";
import AppTextInput from "@/components/ui/TextInput";
import LogoHeader from "@/components/auth/LogoHeader";
import { ENDPOINTS } from "@/constants/config";
import { saveToken, saveUser, type AuthUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useGoogleAuth } from "@/lib/useGoogleAuth";


export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const { promptAsync, loading: googleLoading, googleConfigured } = useGoogleAuth(
    () => router.replace("/(app)/" as any),
    (msg) => setApiError(msg)
  );

  function validate() {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = "البريد الإلكتروني مطلوب";
    if (!password) newErrors.password = "كلمة المرور مطلوبة";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = await apiFetch<{ accessToken: string; user: Record<string, unknown> }>(
        ENDPOINTS.LOGIN,
        {
          method: "POST",
          body: { email: email.trim(), password },
        }
      );
      if (payload.success && payload.data) {
        await saveToken(payload.data.accessToken);
        await saveUser(payload.data.user);
        if ((payload.data as any).refreshToken) {
          const { saveRefreshToken } = await import("@/lib/auth");
          await saveRefreshToken((payload.data as any).refreshToken);
        }
        router.replace("/(app)/" as any);
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "حدث خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={["#0f0a2e", "#150836", "#0f0a2e"]}
      style={styles.flex}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <LogoHeader />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تسجيل الدخول</Text>

          <AppTextInput
            label="البريد الإلكتروني"
            leftIcon={<Feather name="mail" size={20} color="#94a3b8" />}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <AppTextInput
            label="كلمة المرور"
            isPassword
            leftIcon={<Feather name="lock" size={20} color="#94a3b8" />}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />

          <Pressable onPress={() => router.push("/(auth)/forgot-password" as any)}>
            <Text style={styles.forgot}>نسيت كلمة المرور؟</Text>
          </Pressable>

          <Button
            title="تسجيل الدخول"
            onPress={handleLogin}
            loading={loading}
          />

          {apiError ? (
            <Text style={styles.apiError}>{apiError}</Text>
          ) : null}

          {googleConfigured && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.dividerLine} />
              </View>
              <Pressable
                style={[styles.googleBtn, googleLoading && { opacity: 0.5 }]}
                onPress={() => promptAsync()}
                disabled={googleLoading}
              >
                <Svg width="20" height="20" viewBox="0 0 48 48">
                  <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                  <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </Svg>
                <Text style={styles.googleBtnText}>المتابعة بحساب Google</Text>
              </Pressable>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>ليس لديك حساب؟</Text>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.footerLink}>إنشاء حساب</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#0f0a2e",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "#1a1040",
    borderWidth: 1,
    borderColor: "#2d1f6e",
    borderRadius: 24,
    padding: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "right",
    marginBottom: 20,
    fontFamily: "Cairo_700Bold",
  },
  forgot: {
    color: "#6C63FF",
    textAlign: "right",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 20,
    fontFamily: "Cairo_400Regular",
  },
  apiError: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "right",
    marginTop: 12,
    fontFamily: "Cairo_400Regular",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#2d1f6e",
  },
  dividerText: {
    color: "#94a3b8",
    fontSize: 14,
    marginHorizontal: 12,
    fontFamily: "Cairo_400Regular",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    color: "#94a3b8",
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
  },
  footerLink: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  googleBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#1a1a1a",
  },
});
