import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme/context";
import { useLanguage } from "@/lib/i18n/context";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";

const TYPES = [
  { value: "bug", label: "🐛 تقرير خطأ", color: "#EF4444" },
  { value: "suggestion", label: "💡 اقتراح", color: "#F59E0B" },
  { value: "question", label: "❓ سؤال", color: "#6C63FF" },
  { value: "other", label: "📝 أخرى", color: "#94a3b8" },
] as const;

export default function ContactScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();

  const [type, setType] = useState<"bug" | "suggestion" | "question" | "other">("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (message.trim().length < 10) {
      Alert.alert(lang === "ar" ? "خطأ" : "Error", lang === "ar" ? "الرسالة قصيرة جداً (10 أحرف على الأقل)" : "Message too short (min 10 chars)");
      return;
    }
    setSending(true);
    try {
      const res = await apiFetch(ENDPOINTS.CONTACT ?? "/api/contact", {
        method: "POST",
        body: { name: "App User", email: "app@unique.edu", type, message: message.trim() },
      });
      if (res.success) {
        Alert.alert(
          lang === "ar" ? "تم الإرسال ✓" : "Sent ✓",
          lang === "ar" ? "شكراً! سنراجع رسالتك قريباً." : "Thank you! We'll review your message soon.",
          [{ text: lang === "ar" ? "حسناً" : "OK", onPress: () => router.back() }]
        );
      }
    } catch {
      Alert.alert(lang === "ar" ? "خطأ" : "Error", lang === "ar" ? "فشل الإرسال، حاول مرة أخرى" : "Failed to send, please try again");
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-right" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>
          {lang === "ar" ? "تواصل معنا" : "Contact Us"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Type selector */}
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.label, { color: colors.text }]}>{lang === "ar" ? "نوع الرسالة" : "Message Type"}</Text>
          <View style={s.typeRow}>
            {TYPES.map(t => (
              <Pressable key={t.value} style={[s.typeBtn, { borderColor: type === t.value ? t.color : colors.border, backgroundColor: type === t.value ? t.color + "20" : "transparent" }]} onPress={() => setType(t.value)}>
                <Text style={[s.typeText, { color: type === t.value ? t.color : colors.textSecondary }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Message */}
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.label, { color: colors.text }]}>{lang === "ar" ? "رسالتك" : "Your Message"}</Text>
          <TextInput
            style={[s.textarea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            textAlign="right"
            placeholder={lang === "ar" ? "اكتب رسالتك هنا..." : "Write your message here..."}
            placeholderTextColor={colors.textTertiary}
            maxLength={2000}
          />
          <Text style={[s.counter, { color: colors.textTertiary }]}>{message.length} / 2000</Text>
        </View>

        <Pressable style={[s.sendBtn, sending && { opacity: 0.6 }]} onPress={handleSend} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="send" size={18} color="#fff" />}
          <Text style={s.sendText}>{lang === "ar" ? "إرسال" : "Send"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  back: { padding: 4 },
  title: { fontSize: 18, fontFamily: "Cairo_700Bold", flex: 1, textAlign: "right" },
  scroll: { padding: 16, gap: 12 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  label: { fontSize: 14, fontFamily: "Cairo_700Bold", textAlign: "right" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeText: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  textarea: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Cairo_400Regular", minHeight: 120 },
  counter: { fontSize: 11, fontFamily: "Cairo_400Regular", textAlign: "left" },
  sendBtn: { backgroundColor: "#6C63FF", borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  sendText: { color: "#fff", fontSize: 16, fontFamily: "Cairo_700Bold" },
});
