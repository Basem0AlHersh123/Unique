import { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import type { Subject, Level } from "@/lib/types";

export default function SubjectScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const subRes = await apiFetch<Subject[]>("/api/admin/subjects");
        if (cancelled || !subRes.success || !subRes.data) return;
        const s = subRes.data.find((sub) => sub.slug === slug);
        if (!s) { setError("لم يتم العثور على المادة"); setLoading(false); return; }
        setSubject(s);
        const lvlRes = await apiFetch<Level[]>(`/api/admin/levels?subjectId=${s._id}`);
        if (!cancelled && lvlRes.success && lvlRes.data) setLevels(lvlRes.data);
      } catch {
        if (!cancelled) setError("حدث خطأ في تحميل البيانات");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color="#6C63FF" size="large" /></View></SafeAreaView>;
  if (error || !subject) return <SafeAreaView style={s.safe}><View style={s.center}><Feather name="alert-circle" size={48} color="#ef4444" /><Text style={s.errorText}>{error || "خطأ"}</Text></View></SafeAreaView>;

  const published = levels.filter(l => l.isPublished || l.comingSoon);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-right" size={24} color="#94a3b8" />
        </Pressable>
        <Text style={s.title}>{subject.nameAr || subject.name}</Text>
        <Text style={s.subtitle}>{published.length} مستوى</Text>
      </View>
      <FlatList
        data={published}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={[s.card, item.comingSoon && s.cardDim]}
            onPress={() => { if (!item.comingSoon) router.push(`/(app)/level/${item._id}` as any); }}
          >
            <View style={s.badge}><Text style={s.badgeText}>{item.order}</Text></View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle}>{item.title}</Text>
              {item.description ? <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text> : null}
            </View>
            {item.comingSoon
              ? <View style={s.soonBadge}><Text style={s.soonText}>قريباً</Text></View>
              : <Feather name="chevron-left" size={20} color="#475569" />}
          </Pressable>
        )}
        ListEmptyComponent={<View style={s.center}><Feather name="layers" size={48} color="#2d1f6e" /><Text style={s.emptyText}>لا توجد مستويات بعد</Text></View>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0a2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "bold", color: "#ffffff", textAlign: "right", fontFamily: "Cairo_700Bold" },
  subtitle: { fontSize: 14, color: "#94a3b8", textAlign: "right", marginTop: 4, fontFamily: "Cairo_400Regular" },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a1040", borderRadius: 14, borderWidth: 1, borderColor: "#2d1f6e", padding: 16, marginBottom: 12 },
  cardDim: { opacity: 0.55 },
  badge: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#2d1f6e", alignItems: "center", justifyContent: "center", marginRight: 14 },
  badgeText: { fontSize: 15, fontWeight: "bold", color: "#6C63FF", fontFamily: "Cairo_700Bold" },
  cardBody: { flex: 1, alignItems: "flex-end" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#ffffff", textAlign: "right", fontFamily: "Cairo_700Bold" },
  cardDesc: { fontSize: 13, color: "#94a3b8", marginTop: 3, textAlign: "right", fontFamily: "Cairo_400Regular" },
  soonBadge: { backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  soonText: { fontSize: 11, color: "#F59E0B", fontWeight: "600", fontFamily: "Cairo_400Regular" },
  errorText: { color: "#94a3b8", fontSize: 16, marginTop: 12, fontFamily: "Cairo_400Regular" },
  emptyText: { color: "#475569", fontSize: 15, marginTop: 16, fontFamily: "Cairo_400Regular" },
});
