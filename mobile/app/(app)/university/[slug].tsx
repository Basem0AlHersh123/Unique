import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";
import type { University } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";

const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  GraduationCap: "book",
  BookOpen: "book-open",
  Brain: "cpu",
  Flask: "feather",
  Calculator: "hash",
  Globe: "globe",
  Heart: "heart",
  Star: "star",
  Award: "award",
};

function getIcon(name?: string): keyof typeof Feather.glyphMap {
  return (name && ICON_MAP[name]) || "book-open";
}

export default function UniversityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { colors } = useTheme();
  const [university, setUniversity] = useState<University | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch<University>(ENDPOINTS.UNIVERSITY(slug));
        if (!cancelled && res.success && res.data) {
          setUniversity(res.data);
        } else if (!cancelled) {
          setError(t("university.not_found"));
        }
      } catch {
        if (!cancelled) setError(t("university.load_error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !university) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-right" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={s.center}>
          <Feather name="alert-circle" size={48} color={colors.danger} />
          <Text style={[s.errorText, { color: colors.textSecondary }]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const uniName = lang === "ar" ? (university.nameAr || university.name) : (university.nameEn || university.name);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-right" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>{uniName}</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          {university.colleges?.length || 0} {t("university.colleges")}
        </Text>
      </View>

      <FlatList
        data={university.colleges || []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={s.row}
        renderItem={({ item }) => {
          const iconName = getIcon(item.icon);
          const color = item.color || colors.accent;
          const collegeName = lang === "ar" ? (item.nameAr || item.name) : (item.nameEn || item.name);
          return (
            <Pressable
              style={[s.card, { backgroundColor: colors.card, borderColor: color + "40" }]}
              onPress={() => router.push(`/(app)/college/${item.slug}` as any)}
            >
              <View style={[s.iconWrap, { backgroundColor: color + "20" }]}>
                <Feather name={iconName} size={28} color={color} />
              </View>
              <Text style={[s.cardName, { color: colors.text }]}>{collegeName}</Text>
              {item.comingSoon && (
                <View style={s.comingBadge}>
                  <Text style={s.comingText}>{t("colleges.coming_soon")}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={s.center}>
            <Feather name="book" size={56} color={colors.border} />
            <Text style={[s.emptyText, { color: colors.textTertiary }]}>{t("colleges.empty")}</Text>
          </View>
        }
      />
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
  list: { padding: 16, paddingBottom: 32 },
  row: { justifyContent: "space-between" },
  card: { width: "48%", borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", marginBottom: 16 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  cardName: { fontSize: 15, fontWeight: "600", textAlign: "center", fontFamily: "Cairo_700Bold" },
  comingBadge: { marginTop: 8, backgroundColor: "rgba(245, 158, 11, 0.2)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  comingText: { fontSize: 11, fontWeight: "600", color: "#F59E0B", fontFamily: "Cairo_400Regular" },
  errorText: { fontSize: 15, textAlign: "center", marginTop: 12, fontFamily: "Cairo_400Regular" },
  emptyText: { fontSize: 15, marginTop: 16, fontFamily: "Cairo_400Regular" },
});
