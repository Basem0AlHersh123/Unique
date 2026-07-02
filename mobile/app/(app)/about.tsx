import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme/context";
import { useLanguage } from "@/lib/i18n/context";

const APP_VERSION = "1.0.0";

const FEATURES = [
  { icon: "book-open" as const, text: "دروس تفاعلية بالفيديو" },
  { icon: "check-square" as const, text: "اختبارات وتقييم فوري" },
  { icon: "cpu" as const, text: "شرح بالذكاء الاصطناعي" },
  { icon: "edit-3" as const, text: "ملاحظات شخصية" },
  { icon: "users" as const, text: "مجموعات للنقاش" },
  { icon: "bar-chart-2" as const, text: "تتبع التقدم" },
];

export default function AboutScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-right" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>
          {lang === "ar" ? "عن المنصة" : "About"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Logo area */}
        <View style={[s.logoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>U</Text>
          </View>
          <Text style={[s.appName, { color: colors.text }]}>UNIQUE</Text>
          <Text style={[s.appSub, { color: colors.textSecondary }]}>
            {lang === "ar" ? "منصة الاستعداد الجامعي" : "University Prep Platform"}
          </Text>
          <Text style={[s.version, { color: colors.textTertiary }]}>
            {lang === "ar" ? `الإصدار ${APP_VERSION}` : `Version ${APP_VERSION}`}
          </Text>
        </View>

        {/* Mission */}
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>
            {lang === "ar" ? "مهمتنا" : "Our Mission"}
          </Text>
          <Text style={[s.bodyText, { color: colors.textSecondary }]}>
            {lang === "ar"
              ? "نساعد الطلاب اليمنيين على الاستعداد لاختبارات القبول الجامعي بأسلوب ذكي وممتع، مع دعم الذكاء الاصطناعي وتتبع التقدم الشخصي."
              : "We help Yemeni students prepare for university entrance exams in a smart and engaging way, powered by AI and personal progress tracking."}
          </Text>
        </View>

        {/* Features */}
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>
            {lang === "ar" ? "مميزات المنصة" : "Features"}
          </Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Feather name={f.icon} size={18} color="#6C63FF" />
              <Text style={[s.featureText, { color: colors.textSecondary }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Links */}
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable style={s.linkRow} onPress={() => Linking.openURL("https://unique-4uck.vercel.app")}>
            <Feather name="globe" size={18} color="#6C63FF" />
            <Text style={[s.linkText, { color: "#6C63FF" }]}>
              {lang === "ar" ? "الموقع الرسمي" : "Official Website"}
            </Text>
            <Feather name="external-link" size={14} color="#6C63FF" />
          </Pressable>
        </View>
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
  logoBox: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#6C63FF", alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 36, fontFamily: "Cairo_700Bold", color: "#fff" },
  appName: { fontSize: 24, fontFamily: "Cairo_700Bold" },
  appSub: { fontSize: 14, fontFamily: "Cairo_400Regular" },
  version: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Cairo_700Bold", textAlign: "right" },
  bodyText: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "right", lineHeight: 22 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 14, fontFamily: "Cairo_400Regular", flex: 1, textAlign: "right" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkText: { fontSize: 14, fontFamily: "Cairo_700Bold", flex: 1, textAlign: "right" },
});
