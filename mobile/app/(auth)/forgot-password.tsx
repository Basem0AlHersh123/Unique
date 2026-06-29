import { useState } from "react";
import {
  View, Text, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import Button from "@/components/ui/Button";
import AppTextInput from "@/components/ui/TextInput";
import { API_BASE_URL, ENDPOINTS } from "@/constants/config";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setError("");
    const trimmed = email.trim();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}${ENDPOINTS.FORGOT_PASSWORD}`,
        { email: trimmed },
        { headers: { "Content-Type": "application/json" } }
      );
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <View style={s.iconWrap}>
            <Feather name="mail" size={40} color="#6C63FF" />
          </View>
          <Text style={s.title}>تحقق من بريدك</Text>
          <Text style={s.subtitle}>
            إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور خلال دقائق.
          </Text>
          <Text style={s.spamNote}>تحقق من مجلد الرسائل غير المرغوب فيها إذا لم تجدها.</Text>
          <Pressable style={s.backBtn} onPress={() => router.replace("/(auth)/login" as any)}>
            <Text style={s.backBtnText}>العودة لتسجيل الدخول</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={s.safe}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={s.topBack} onPress={() => router.back()}>
            <Feather name="arrow-right" size={22} color="#94a3b8" />
          </Pressable>

          <View style={s.iconWrap}>
            <Feather name="lock" size={40} color="#6C63FF" />
          </View>

          <Text style={s.title}>نسيت كلمة المرور؟</Text>
          <Text style={s.subtitle}>
            أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
          </Text>

          <View style={s.card}>
            <AppTextInput
              label="البريد الإلكتروني"
              leftIcon={<Feather name="mail" size={20} color="#94a3b8" />}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <Button
              title="إرسال رابط الاسترداد"
              onPress={handleSubmit}
              loading={loading}
            />
          </View>

          <Pressable style={s.loginLink} onPress={() => router.back()}>
            <Text style={s.loginLinkText}>العودة لتسجيل الدخول</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0f0a2e" },
  safe: { flex: 1, backgroundColor: "#0f0a2e" },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, gap: 16 },
  topBack: { alignSelf: "flex-start", padding: 4, marginBottom: 24 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(108,99,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16, alignSelf: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#ffffff", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 22, marginBottom: 8 },
  spamNote: { fontSize: 12, color: "#475569", textAlign: "center" },
  card: { backgroundColor: "#1a1040", borderRadius: 20, borderWidth: 1, borderColor: "#2d1f6e", padding: 24, marginTop: 8, gap: 8 },
  error: { color: "#ef4444", fontSize: 13, textAlign: "right" },
  backBtn: { backgroundColor: "#6C63FF", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  backBtnText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  loginLink: { alignSelf: "center", marginTop: 24 },
  loginLinkText: { fontSize: 14, color: "#6C63FF", fontWeight: "600" },
});
