import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS, STORAGE_KEYS } from "@/constants/config";
import type { University } from "@/lib/types";

export default function UniversityPickerScreen() {
  const router = useRouter();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [autoSelected, setAutoSelected] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<University[]>(ENDPOINTS.UNIVERSITIES);
        if (res.success && res.data) {
          const active = res.data.filter((u) => u.isActive !== false);
          setUniversities(active);

          if (active.length === 1) {
            setSelected(active[0]._id);
            setAutoSelected(true);
          }
        } else {
          setError("فشل تحميل البيانات");
        }
      } catch {
        setError("تعذر الاتصال بالخادم، تأكد من اتصالك بالإنترنت");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleConfirm() {
    if (!selected) return;
    await SecureStore.setItemAsync(STORAGE_KEYS.UNIVERSITY_ID, selected);
    router.replace("/college-picker" as any);
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
        <View style={s.center}>
          <Feather name="alert-circle" size={48} color="#EF4444" />
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={() => { setLoading(true); setError(""); }}>
            <Text style={s.retryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.top}>
        <Image source={require("@/assets/images/logo.png")} style={s.logo} resizeMode="contain" />
        <Text style={s.title}>اختر جامعتك</Text>
        <Text style={s.subtitle}>ستظهر لك كليات الجامعة التي تختارها</Text>
        {autoSelected && (
          <View style={s.autoBadge}>
            <Feather name="check-circle" size={14} color="#22C55E" />
            <Text style={s.autoBadgeText}>تم اختيار جامعتك تلقائياً</Text>
          </View>
        )}
      </View>

      <FlatList
        data={universities}
        keyExtractor={(u) => u._id}
        contentContainerStyle={s.list}
        numColumns={2}
        columnWrapperStyle={s.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const name = item.nameAr || item.name;
          const isSel = selected === item._id;
          return (
            <Pressable
              style={[
                s.card,
                { borderColor: isSel ? "#6C63FF" : "#2d1f6e" },
                isSel && { borderWidth: 2 },
              ]}
              onPress={() => setSelected(item._id)}
            >
              {isSel && (
                <View style={[s.checkMark, { backgroundColor: "#6C63FF" }]}>
                  <Feather name="check" size={14} color="#fff" />
                </View>
              )}
              <Text style={s.cardEmoji}>🎓</Text>
              <Text style={s.cardName}>{name}</Text>
            </Pressable>
          );
        }}
      />

      <View style={s.footer}>
        <Pressable
          style={[s.confirmBtn, !selected && s.confirmBtnOff]}
          onPress={handleConfirm}
          disabled={!selected}
        >
          <Text style={s.confirmText}>متابعة ←</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0a2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, paddingHorizontal: 40 },
  top: { alignItems: "center", paddingTop: 32, paddingHorizontal: 24, paddingBottom: 24 },
  logo: { width: 60, height: 60, borderRadius: 18, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "bold", color: "#ffffff", marginBottom: 8, fontFamily: "Cairo_700Bold" },
  subtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", fontFamily: "Cairo_400Regular" },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  row: { justifyContent: "space-between", marginBottom: 12 },
  card: {
    width: "48%",
    backgroundColor: "#1a1040",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    alignItems: "center",
    gap: 10,
    height: 160,
    justifyContent: "center",
  },
  cardEmoji: { fontSize: 40 },
  cardName: { fontSize: 14, fontWeight: "600", color: "#ffffff", textAlign: "center", fontFamily: "Cairo_700Bold" },
  checkMark: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  footer: { padding: 24, paddingBottom: 32 },
  confirmBtn: {
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmBtnOff: { opacity: 0.4 },
  confirmText: { fontSize: 16, fontWeight: "700", color: "#ffffff", fontFamily: "Cairo_700Bold" },
  autoBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 12,
  },
  autoBadgeText: { color: "#22C55E", fontSize: 13, fontWeight: "600", fontFamily: "Cairo_400Regular" },
  errorText: { color: "#94a3b8", fontSize: 14, textAlign: "center", fontFamily: "Cairo_400Regular" },
  retryBtn: { backgroundColor: "#6C63FF", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "700", fontFamily: "Cairo_700Bold" },
});
