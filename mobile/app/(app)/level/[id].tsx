import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import type { Unit, Level } from "@/lib/types";

export default function LevelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [level, setLevel] = useState<Level | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Get all levels to find ours by id
        const lvlRes = await apiFetch<Level[]>("/api/admin/levels");
        if (cancelled) return;
        if (lvlRes.success && lvlRes.data) {
          const found = lvlRes.data.find(l => l._id === id);
          if (found) setLevel(found);
        }
        const unitRes = await apiFetch<Unit[]>(`/api/admin/units?levelId=${id}`);
        if (!cancelled && unitRes.success && unitRes.data) {
          setUnits(unitRes.data.filter(u => u.isPublished || u.comingSoon));
        }
      } catch {
        if (!cancelled) setError("حدث خطأ في تحميل البيانات");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color="#6C63FF" size="large" /></View></SafeAreaView>;
  if (error) return <SafeAreaView style={s.safe}><View style={s.center}><Feather name="alert-circle" size={48} color="#ef4444" /><Text style={s.errorText}>{error}</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-right" size={24} color="#94a3b8" />
        </Pressable>
        <Text style={s.title}>{level?.title ?? "المستوى"}</Text>
        <Text style={s.subtitle}>{units.length} وحدة</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Vertical path of units — each is centered alternately left/right like Duolingo */}
        {units.map((unit, idx) => {
          const isRight = idx % 2 === 0;
          return (
            <View key={unit._id} style={[s.pathItem, isRight ? s.pathRight : s.pathLeft]}>
              {/* Connector line */}
              {idx < units.length - 1 && <View style={[s.connector, isRight ? s.connectorRight : s.connectorLeft]} />}

              <Pressable
                style={[s.unitBtn, unit.comingSoon && s.unitBtnDim]}
                onPress={() => { if (!unit.comingSoon) router.push(`/(app)/unit/${unit._id}` as any); }}
              >
                <View style={s.unitIcon}>
                  <Feather
                    name={unit.comingSoon ? "clock" : "book-open"}
                    size={26}
                    color={unit.comingSoon ? "#475569" : "#6C63FF"}
                  />
                </View>
                <Text style={s.unitTitle} numberOfLines={2}>{unit.title}</Text>
                {unit.examEnabled && !unit.comingSoon && (
                  <View style={s.examTag}>
                    <Feather name="zap" size={10} color="#F59E0B" />
                    <Text style={s.examTagText}>اختبار</Text>
                  </View>
                )}
                {unit.comingSoon && <Text style={s.soonText}>قريباً</Text>}
              </Pressable>
            </View>
          );
        })}
        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const UNIT_W = 140;
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0a2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "bold", color: "#ffffff", textAlign: "right", fontFamily: "Cairo_700Bold" },
  subtitle: { fontSize: 14, color: "#94a3b8", textAlign: "right", marginTop: 4, fontFamily: "Cairo_400Regular" },
  scroll: { paddingVertical: 24, paddingHorizontal: 20 },
  pathItem: { marginBottom: 12 },
  pathRight: { alignItems: "flex-end" },
  pathLeft: { alignItems: "flex-start" },
  connector: { width: 2, height: 32, backgroundColor: "#2d1f6e", position: "absolute", bottom: -32 },
  connectorRight: { right: UNIT_W / 2 },
  connectorLeft: { left: UNIT_W / 2 },
  unitBtn: { width: UNIT_W, backgroundColor: "#1a1040", borderRadius: 20, borderWidth: 1, borderColor: "#2d1f6e", padding: 16, alignItems: "center", gap: 8 },
  unitBtnDim: { opacity: 0.5 },
  unitIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#6C63FF15", alignItems: "center", justifyContent: "center" },
  unitTitle: { fontSize: 13, fontWeight: "600", color: "#ffffff", textAlign: "center", lineHeight: 18, fontFamily: "Cairo_700Bold" },
  examTag: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  examTagText: { fontSize: 10, color: "#F59E0B", fontWeight: "600", fontFamily: "Cairo_400Regular" },
  soonText: { fontSize: 10, color: "#475569", fontWeight: "600", fontFamily: "Cairo_400Regular" },
  errorText: { color: "#94a3b8", fontSize: 16, marginTop: 12, fontFamily: "Cairo_400Regular" },
});
