import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, TouchableOpacity, TextInput, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";
import { cacheGet, cacheSet, addPendingNoteOp } from "@/lib/cache";
import { isOnline } from "@/lib/offline";
import type { StudentNote } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { showAlert } from "@/lib/ui/AlertModal";

type FilterType = "all" | "starred" | "general" | "question" | "summary" | "important" | "word" | "equation";

const FILTERS: { key: FilterType; labelAr: string; labelEn: string }[] = [
  { key: "all",       labelAr: "الكل",        labelEn: "All" },
  { key: "starred",   labelAr: "المميزة",     labelEn: "Starred" },
  { key: "general",   labelAr: "عام",         labelEn: "General" },
  { key: "question",  labelAr: "سؤال",        labelEn: "Question" },
  { key: "summary",   labelAr: "ملخص",        labelEn: "Summary" },
  { key: "important", labelAr: "مهم",         labelEn: "Important" },
  { key: "word",      labelAr: "كلمة",        labelEn: "Word" },
  { key: "equation",  labelAr: "معادلة",      labelEn: "Equation" },
];

const TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  general:   "file-text",
  question:  "help-circle",
  summary:   "book",
  important: "alert-circle",
  word:      "type",
  equation:  "hash",
};

const TYPE_COLORS: Record<string, string> = {
  general:   "#6C63FF",
  question:  "#EC4899",
  summary:   "#06B6D4",
  important: "#F59E0B",
  word:      "#22C55E",
  equation:  "#EF4444",
};

function groupByDate(notes: StudentNote[]): [string, StudentNote[]][] {
  const groups: Record<string, StudentNote[]> = {};
  for (const note of notes) {
    const d = new Date(note.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = "اليوم";
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = "أمس";
    } else {
      label = d.toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(note);
  }
  return Object.entries(groups);
}

export default function NotesScreen() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { colors } = useTheme();
  const [allNotes, setAllNotes] = useState<StudentNote[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Always show cached notes immediately — instant, works offline
    const cached = await cacheGet<StudentNote[]>("notes_list");
    if (cached && cached.length > 0) {
      setAllNotes(cached.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setLoading(false); // Stop showing spinner once we have cache
    }

    // If online, fetch fresh from server and update cache
    const online = await isOnline();
    if (online) {
      try {
        const res = await apiFetch<StudentNote[]>(ENDPOINTS.NOTES);
        if (res.success && res.data) {
          const sorted = res.data.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setAllNotes(sorted);
          await cacheSet("notes_list", sorted);
        }
      } catch {
        // Silently use cached data — no error shown
      }
    }
    // When offline, cached data is already shown above — no error

    setLoading(false);
  }, []);

  useEffect(() => { loadNotes(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await apiFetch<StudentNote[]>(ENDPOINTS.NOTES);
      if (res.success && res.data) {
        const sorted = res.data.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setAllNotes(sorted);
        await cacheSet("notes_list", sorted);
      }
    } catch {} finally {
      setRefreshing(false);
    }
  }, []);

  const filteredNotes = useMemo(() => {
    let result = allNotes;
    if (filter === "starred") {
      result = result.filter((n) => n.isStarred);
    } else if (filter !== "all") {
      result = result.filter((n) => n.type === filter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          n.content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allNotes, filter, searchQuery]);

  async function toggleStar(note: StudentNote) {
    const newStarred = !note.isStarred;
    const oldStarred = note.isStarred;
    // Optimistic update in state
    setAllNotes((prev) => {
      const updated = prev.map((n) =>
        n._id === note._id ? { ...n, isStarred: newStarred } : n
      );
      cacheSet("notes_list", updated); // Update cache immediately
      return updated;
    });

    const online = await isOnline();
    if (online) {
      try {
        await apiFetch(ENDPOINTS.NOTE(note._id), {
          method: "PATCH",
          body: { isStarred: newStarred },
        });
        await loadNotes(); // Refresh from server
      } catch {
        // Revert on failure
        setAllNotes((prev) => {
          const reverted = prev.map((n) =>
            n._id === note._id ? { ...n, isStarred: oldStarred } : n
          );
          cacheSet("notes_list", reverted);
          return reverted;
        });
      }
    }
  }

  function confirmDelete(id: string) {
    showAlert({
      type: "warning",
      title: lang === "ar" ? "حذف الملاحظة" : "Delete Note",
      message: lang === "ar" ? "هل تريد حذف هذه الملاحظة؟" : "Delete this note?",
      buttons: [
        { text: lang === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: lang === "ar" ? "حذف" : "Delete",
          style: "destructive",
          onPress: async () => {
            const updated = allNotes.filter((n) => n._id !== id);
            setAllNotes(updated);
            await cacheSet("notes_list", updated);
            await addPendingNoteOp({
              id: Date.now().toString(),
              method: "DELETE",
              endpoint: ENDPOINTS.NOTE(id),
              body: {},
              createdAt: Date.now(),
            });
            try {
              await apiFetch(ENDPOINTS.NOTE(id), { method: "DELETE" });
            } catch {
              // Will sync when online via flushPendingNotes
            }
          },
        },
      ],
    });
  }

  const grouped = groupByDate(filteredNotes);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}><ActivityIndicator color="#6C63FF" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{lang === "ar" ? "ملاحظاتي" : "My Notes"}</Text>
      </View>

      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={lang === "ar" ? "ابحث في الملاحظات..." : "Search notes..."}
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign={lang === "ar" ? "right" : "left"}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Feather name="x" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterRowScroll, { direction: lang === "ar" ? "rtl" : "ltr" }]}
        contentContainerStyle={[styles.filterRow, { flexDirection: lang === "ar" ? "row-reverse" : "row" }]}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              style={[
                styles.filterPill,
                { borderColor: active ? "#6C63FF" : colors.border, backgroundColor: active ? "#6C63FF" : "transparent" }
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterPillText, { color: active ? "#fff" : colors.textSecondary }]}>
                {lang === "ar" ? f.labelAr : f.labelEn}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error && (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: "#6C63FF" }]} onPress={loadNotes}>
            <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {!error && filteredNotes.length === 0 && !loading && (
        <View style={styles.center}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>📝</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {searchQuery.trim()
              ? (lang === "ar" ? "لا توجد نتائج للبحث" : "No search results")
              : filter !== "all"
              ? (lang === "ar" ? "لا توجد ملاحظات في هذا التصنيف" : "No notes match this filter")
              : (lang === "ar" ? "لا توجد ملاحظات بعد" : "No notes yet")
            }
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchQuery.trim()
              ? (lang === "ar" ? "جرب كلمات بحث مختلفة" : "Try different search terms")
              : filter !== "all"
              ? (lang === "ar" ? "جرب تصفية أخرى أو اعرض الكل" : "Try a different filter or view all")
              : (lang === "ar" ? "اضغط على الزر أدناه لإضافة ملاحظتك الأولى" : "Tap the button below to create your first note")
            }
          </Text>
          {filter !== "all" && !searchQuery.trim() && (
            <Pressable
              style={[styles.retryBtn, { backgroundColor: "#6C63FF" }]}
              onPress={() => setFilter("all")}
            >
              <Text style={styles.retryBtnText}>
                {lang === "ar" ? "عرض الكل" : "View All"}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {!error && filteredNotes.length > 0 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" colors={["#6C63FF"]} />}>
          {grouped.map(([date, group]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={[styles.dateHeader, { color: colors.textTertiary }]}>{date}</Text>
              {group.map((note) => {
                const noteType = note.type ?? "general";
                const typeColor = TYPE_COLORS[noteType] ?? "#6C63FF";
                const typeIcon = TYPE_ICONS[noteType] ?? "file-text";
                const displayTitle = note.title || (note.content.length > 40 ? note.content.slice(0, 40) + "…" : note.content);

                return (
                  <Pressable
                    key={note._id}
                    style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: typeColor, borderLeftWidth: 4 }]}
                    onPress={() => router.push(`/(app)/notes/${note._id}` as any)}
                    onLongPress={() => {
                      showAlert({
                        type: "confirm",
                        title: lang === "ar" ? "الخيارات" : "Options",
                        message: "",
                        buttons: [
                          { text: lang === "ar" ? "تعديل" : "Edit", onPress: () => router.push(`/(app)/notes/${note._id}` as any) },
                          { text: lang === "ar" ? "حذف" : "Delete", style: "destructive", onPress: () => confirmDelete(note._id) },
                          { text: lang === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
                        ],
                      });
                    }}
                  >
                    <View style={styles.noteCardTop}>
                      <View style={[styles.typeBadge, { backgroundColor: typeColor + "22" }]}>
                        <Feather name={typeIcon} size={12} color={typeColor} />
                        <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                          {lang === "ar"
                            ? { general: "عام", question: "سؤال", summary: "ملخص", important: "مهم", word: "كلمة", equation: "معادلة" }[noteType] ?? "عام"
                            : noteType.charAt(0).toUpperCase() + noteType.slice(1)
                          }
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => toggleStar(note)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name="star" size={16} color={note.isStarred ? "#F59E0B" : "#475569"} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>{displayTitle}</Text>
                    <Text style={[styles.noteSnippet, { color: colors.textSecondary }]} numberOfLines={2}>{note.content}</Text>
                    <Text style={[styles.noteTime, { color: colors.textTertiary }]}>
                      {new Date(note.createdAt).toLocaleTimeString(lang === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable
        style={[styles.fab, styles.fabSecondary, { backgroundColor: "#1a1040", borderColor: "#6C63FF", borderWidth: 1.5 }]}
        onPress={() => router.push("/(app)/flashcards" as any)}
      >
        <Feather name="layers" size={22} color="#6C63FF" />
      </Pressable>

      <Pressable
        style={[styles.fab, { backgroundColor: "#6C63FF" }]}
        onPress={() => router.push("/(app)/notes/new" as any)}
      >
        <Feather name="plus" size={26} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, paddingHorizontal: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontFamily: "Cairo_700Bold", textAlign: "right" },
  filterRowScroll: { flexGrow: 0 },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: "center" },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginTop: 4, marginBottom: 4,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Cairo_400Regular", paddingVertical: 0 },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  filterPillText: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 160 },
  dateGroup: { marginBottom: 20 },
  dateHeader: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "right", marginBottom: 8 },
  noteCard: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  noteCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeBadgeText: { fontSize: 11, fontFamily: "Cairo_400Regular" },
  noteTitle: { fontSize: 15, fontFamily: "Cairo_700Bold", textAlign: "right", marginBottom: 4 },
  noteSnippet: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "right", lineHeight: 18, marginBottom: 6 },
  noteTime: { fontSize: 11, fontFamily: "Cairo_400Regular", textAlign: "left" },
  errorText: { fontSize: 14, textAlign: "center", fontFamily: "Cairo_400Regular" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: "#fff", fontSize: 14, fontFamily: "Cairo_700Bold" },
  emptyTitle: { fontSize: 20, fontFamily: "Cairo_700Bold", textAlign: "center" },
  emptyText: { fontSize: 15, textAlign: "center", fontFamily: "Cairo_400Regular" },
  fab: {
    position: "absolute", bottom: 24, right: 20,
    width: 58, height: 58, borderRadius: 29,
    alignItems: "center", justifyContent: "center",
    elevation: 8, shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
  },
  fabSecondary: {
    bottom: 96,
  },
});
