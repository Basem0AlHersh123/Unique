import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import type { Lesson, LessonProgress, Unit } from "@/lib/types";
import LessonRow from "@/components/learning/LessonRow";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";

export default function UnitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { colors } = useTheme();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [essentialMode, setEssentialMode] = useState(false);

  async function loadData() {
    try {
      const [essentialVal, topicsRes, progressRes, unitRes] = await Promise.all([
        SecureStore.getItemAsync("unique_essential_mode"),
        apiFetch<Lesson[]>(`/api/admin/topics?unitId=${id}`),
        apiFetch<LessonProgress[]>(`/api/progress/lesson?unitId=${id}`),
        apiFetch<Unit>(`/api/admin/units/${id}`),
      ]);

      setEssentialMode(essentialVal === "true");

      if (unitRes.success && unitRes.data) {
        setUnit(unitRes.data);
      }

      if (topicsRes.success && topicsRes.data) {
        let all = topicsRes.data
          .filter(t => t.isPublished)
          .sort((a, b) => a.order - b.order);
        if (essentialVal === "true") {
          all = all.filter(t => t.isEssential);
        }
        setLessons(all);
      }

      if (progressRes.success && progressRes.data) {
        setProgress(progressRes.data);
      }
    } catch {
      setError(lang === "ar" ? "حدث خطأ في تحميل البيانات" : "Error loading data");
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setError("");
    loadData();
  }, [id]));

  const progressMap = new Map(progress.map(p => [p.lessonId, p]));

  function isUnlocked(index: number): boolean {
    if (index === 0) return true;
    const prev = lessons[index - 1];
    const prevProgress = progressMap.get(prev._id);
    return (prevProgress?.watchedVideo === true && prevProgress?.passedQuiz === true);
  }

  if (loading) return <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}><View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View></SafeAreaView>;
  if (error) return <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}><View style={s.center}><Feather name="alert-circle" size={48} color={colors.danger} /><Text style={[s.errorText, { color: colors.textSecondary }]}>{error}</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-right" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>{unit?.title ?? t("level.lessons")}</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          {lessons.length} {lang === "ar" ? "درس" : "lessons"}
          {essentialMode && ` · ${t("essential.title")}`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {essentialMode && (
          <View style={[s.essentialBanner, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "40" }]}>
            <Feather name="bookmark" size={14} color={colors.accent} />
            <Text style={[s.essentialBannerText, { color: colors.accent }]}>{t("essential.filter_active")}</Text>
          </View>
        )}

        {lessons.map((lesson, idx) => (
          <View key={lesson._id} style={{ marginBottom: 10 }}>
            <LessonRow
              lesson={lesson}
              index={idx}
              progress={progressMap.get(lesson._id)}
              unlocked={isUnlocked(idx)}
              onPress={() => router.push(`/(app)/lesson/${lesson.slug}` as any)}
            />
          </View>
        ))}

        {unit?.examEnabled && (
          <Pressable
            style={[s.examBtn, { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" }]}
            onPress={() => router.push(`/(app)/unit/${id}/exam` as any)}
          >
            <Feather name="zap" size={20} color="#F59E0B" />
            <View style={s.examBtnBody}>
              <Text style={s.examBtnTitle}>{lang === "ar" ? "اختبار الوحدة" : "Unit Exam"}</Text>
              <Text style={s.examBtnSub}>
                {lang === "ar" ? "اجتز الاختبار لفتح كل دروس الوحدة دفعة واحدة" : "Pass the exam to unlock all lessons at once"}
              </Text>
            </View>
            <Feather name="chevron-left" size={18} color="#F59E0B" />
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "right", fontFamily: "Cairo_700Bold" },
  subtitle: { fontSize: 14, textAlign: "right", marginTop: 4, fontFamily: "Cairo_400Regular" },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  essentialBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  essentialBannerText: { fontSize: 13, fontWeight: "600", fontFamily: "Cairo_400Regular" },
  examBtn: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 8, gap: 12 },
  examBtnBody: { flex: 1, alignItems: "flex-end" },
  examBtnTitle: { fontSize: 15, fontWeight: "700", color: "#F59E0B", textAlign: "right", fontFamily: "Cairo_700Bold" },
  examBtnSub: { fontSize: 12, color: "#94a3b8", textAlign: "right", marginTop: 3, fontFamily: "Cairo_400Regular" },
  errorText: { fontSize: 16, marginTop: 12, textAlign: "center", fontFamily: "Cairo_400Regular" },
});
