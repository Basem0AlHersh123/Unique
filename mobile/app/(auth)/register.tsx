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
import { apiFetch } from "@/lib/api";
import { saveToken, saveUser } from "@/lib/auth";

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
  }>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    const newErrors: typeof errors = {};
    if (name.trim().length < 2) newErrors.name = "الاسم يجب أن يكون حرفين على الأقل";
    if (!email.includes("@") || !email.includes("."))
      newErrors.email = "البريد الإلكتروني غير صالح";
    if (password.length < 8)
      newErrors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    else if (!/[A-Z]/.test(password))
      newErrors.password = "يجب أن تحتوي على حرف كبير واحد على الأقل";
    else if (!/[0-9]/.test(password))
      newErrors.password = "يجب أن تحتوي على رقم واحد على الأقل";
    if (confirm !== password) newErrors.confirm = "كلمة المرور غير متطابقة";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    setApiError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = await apiFetch<{ accessToken: string; user: Record<string, unknown> }>(
        ENDPOINTS.REGISTER,
        {
          method: "POST",
          body: { name: name.trim(), email: email.trim(), password },
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
            <Text style={styles.cardTitle}>إنشاء حساب</Text>

            <AppTextInput
              label="الاسم الكامل"
              leftIcon={<Feather name="user" size={20} color="#94a3b8" />}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={errors.name}
            />

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

            <AppTextInput
              label="تأكيد كلمة المرور"
              isPassword
              leftIcon={<Feather name="lock" size={20} color="#94a3b8" />}
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
            />

            <Button title="إنشاء حساب" onPress={handleRegister} loading={loading} />

            {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>أو</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>لديك حساب بالفعل؟</Text>
              <Pressable onPress={() => router.push("/(auth)/login" as any)}>
                <Text style={styles.footerLink}>تسجيل الدخول</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0f0a2e" },
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
  apiError: { color: "#ef4444", fontSize: 14, textAlign: "right", marginTop: 12, fontFamily: "Cairo_400Regular" },
  divider: { flexDirection: "row", alignItems: "center", marginTop: 24, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#2d1f6e" },
  dividerText: { color: "#94a3b8", fontSize: 14, marginHorizontal: 12, fontFamily: "Cairo_400Regular" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 },
  footerText: { color: "#94a3b8", fontSize: 14, fontFamily: "Cairo_400Regular" },
  footerLink: { color: "#6C63FF", fontSize: 14, fontWeight: "700", fontFamily: "Cairo_700Bold" },
});
