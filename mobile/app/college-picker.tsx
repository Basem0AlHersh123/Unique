import { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS, STORAGE_KEYS } from "@/constants/config";
import { useLanguage } from "@/lib/i18n/context";
import { getToken } from "@/lib/auth";
import type { College, University } from "@/lib/types";

const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  GraduationCap: "book", BookOpen: "book-open", Brain: "cpu",
  Calculator: "hash", Globe: "globe", Award: "award",
};

export default function CollegePickerScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [colleges, setColleges] = useState<College[]>([]);
  const [universityName, setUniversityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const universityId = await SecureStore.getItemAsync(STORAGE_KEYS.UNIVERSITY_ID);

        // Fetch colleges
        const res = await apiFetch<College[]>(ENDPOINTS.COLLEGES);
        if (res.success && res.data) {
          let active = res.data.filter((c: College) => c.isActive !== false);
          if (universityId) {
            active = active.filter((c: College) => c.universityId === universityId);
          }
          setColleges(active);
        } else {
          setError(t("common.error_loading"));
        }

        // Fetch university name for display
        if (universityId) {
          const uniRes = await apiFetch<University[]>(ENDPOINTS.UNIVERSITIES);
          if (uniRes.success && uniRes.data) {
            const uni = uniRes.data.find((u) => u._id === universityId);
            if (uni) setUniversityName(uni.nameAr || uni.name);
          }
        }
      } catch {
        setError(t("ui.server_error"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleConfirm() {
    if (!selected || saving) return;
    setSaving(true);
    await SecureStore.setItemAsync(STORAGE_KEYS.COLLEGE_ID, selected);
    const token = await getToken();
    if (token) {
      router.replace("/(app)/" as any);
    } else {
      router.replace("/(auth)/login" as any);
    }
  }

  async function handleChangeUniversity() {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.UNIVERSITY_ID);
    router.replace("/university-picker" as any);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator color="#6C63FF" size="large" /></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.errorBox}>
          <Feather name="alert-circle" size={24} color="#ef4444" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* very top left back link */}
      <Pressable style={s.backUni} onPress={handleChangeUniversity}>
        <Feather name="arrow-right" size={14} color="#6C63FF" />
        <Text style={s.backUniText}>← تغيير الجامعة</Text>
      </Pressable>

      <View style={s.top}>
        <Image source={require("@/assets/images/logo.png")} style={s.logo} resizeMode="contain" />
        <Text style={s.title}>{t("colleges.title")}</Text>
        {universityName ? (
          <Text style={s.uniBadge}>{universityName}</Text>
        ) : null}
        <Text style={s.subtitle}>{t("colleges.desc")}</Text>
      </View>

      <FlatList
        data={colleges}
        keyExtractor={(c) => c._id}
        contentContainerStyle={s.list}
        numColumns={2}
        columnWrapperStyle={s.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const color = item.color || "#6C63FF";
          const icon = ICON_MAP[item.icon ?? ""] || "book-open";
          const isSel = selected === item._id;
          return (
            <Pressable
              style={[s.card, { borderColor: isSel ? color : color + "30" }, isSel && s.cardSel, item.comingSoon && s.cardDim]}
              onPress={() => !item.comingSoon && setSelected(item._id)}
            >
              {isSel && <View style={[s.checkMark, { backgroundColor: color }]}><Feather name="check" size={12} color="#fff" /></View>}
              <View style={[s.iconWrap, { backgroundColor: color + "20" }]}>
                <Feather name={icon} size={30} color={color} />
              </View>
              <Text style={s.cardName}>{item.nameAr || item.name}</Text>
              {item.comingSoon && <View style={s.soonBadge}><Text style={s.soonText}>{t("colleges.coming_soon")}</Text></View>}
            </Pressable>
          );
        }}
      />

      {colleges.length === 0 && !loading && (
        <View style={s.emptyBox}>
          <Feather name="inbox" size={40} color="#475569" />
          <Text style={s.emptyText}>{t("colleges.no_colleges_desc")}</Text>
        </View>
      )}

      <View style={s.footer}>
        <Pressable
          style={[s.confirmBtn, !selected && s.confirmBtnOff]}
          onPress={handleConfirm}
          disabled={!selected || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmText}>{t("colleges.confirm")} ←</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0a2e" },
  top: { alignItems: "center", paddingTop: 32, paddingHorizontal: 24, paddingBottom: 16 },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff", marginBottom: 4, fontFamily: "Cairo_700Bold" },
  uniBadge: { fontSize: 13, color: "#6C63FF", fontWeight: "600", marginBottom: 8, fontFamily: "Cairo_700Bold" },
  subtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 20, fontFamily: "Cairo_400Regular" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  row: { justifyContent: "space-between", marginBottom: 14 },
  card: { width: "48%", backgroundColor: "#1a1040", borderRadius: 18, borderWidth: 1.5, padding: 20, alignItems: "center", gap: 10 },
  cardSel: { backgroundColor: "#1a1040" },
  cardDim: { opacity: 0.45 },
  checkMark: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  cardName: { fontSize: 14, fontWeight: "600", color: "#fff", textAlign: "center", fontFamily: "Cairo_700Bold" },
  soonBadge: { backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  soonText: { fontSize: 10, color: "#F59E0B", fontWeight: "600", fontFamily: "Cairo_400Regular" },
  footer: { padding: 20, paddingBottom: 32 },
  confirmBtn: { backgroundColor: "#6C63FF", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  confirmBtnOff: { backgroundColor: "#1a1040", borderWidth: 1, borderColor: "#2d1f6e" },
  confirmText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: "Cairo_700Bold" },
  errorBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingHorizontal: 24 },
  errorText: { color: "#ef4444", fontSize: 14, textAlign: "center", fontFamily: "Cairo_400Regular" },
  backUni: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  backUniText: { fontSize: 13, color: "#6C63FF", fontFamily: "Cairo_400Regular" },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingHorizontal: 32 },
  emptyText: { color: "#475569", fontSize: 14, textAlign: "center", fontFamily: "Cairo_400Regular" },
});
