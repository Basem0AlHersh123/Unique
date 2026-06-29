import { useState } from "react";
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
import Button from "@/components/ui/Button";
import AppTextInput from "@/components/ui/TextInput";
import LogoHeader from "@/components/auth/LogoHeader";
import { ENDPOINTS } from "@/constants/config";
import { saveToken, saveUser, type AuthUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";


export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

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

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.dividerLine} />
          </View>

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
});
