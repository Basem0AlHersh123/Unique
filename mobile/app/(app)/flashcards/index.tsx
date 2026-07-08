import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { ENDPOINTS, STORAGE_KEYS } from "@/constants/config";
import { cacheGet, cacheSet } from "@/lib/cache";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface Flashcard {
  _id: string;
  word: string;
  definition: string;
  example?: string;
  arabicMeaning?: string;
  imageUrl?: string;
  difficulty?: "easy" | "medium" | "hard";
  createdAt: string;
}

type StatusFilter = "all" | "known" | "later" | "pending";

export default function FlashcardsIndexScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, isRTL } = useLanguage();

  const [activeTab, setActiveTab] = useState<"today" | "all">("today");
  const [todayWords, setTodayWords] = useState<Flashcard[]>([]);
  const [allWords, setAllWords] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [progress, setProgress] = useState<{
    lastIndex: number;
    known: string[];
    unknown: string[];
  }>({ lastIndex: 0, known: [], unknown: [] });

  const tabs: { id: "today" | "all"; label: string }[] = [
    { id: "today", label: lang === "ar" ? "مفردات اليوم" : "Today's Vocabulary" },
    { id: "all", label: lang === "ar" ? "جميع المفردات" : "All Vocabulary" },
  ];

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: lang === "ar" ? "الكل" : "All" },
    { id: "known", label: lang === "ar" ? "محفوظة" : "Known" },
    { id: "later", label: lang === "ar" ? "لاحقاً" : "Later" },
    { id: "pending", label: lang === "ar" ? "غير مكتملة" : "Pending" },
  ];

  useEffect(() => {
    loadData();
    loadProgress();
  }, []);

  useFocusEffect(useCallback(() => {
    loadProgress();
  }, []));

  async function loadData() {
    setLoading(true);
    let vocab: Flashcard[] = [];
    let limit = 15;

    try {
      const cached = await cacheGet<Flashcard[]>("vocab_list");
      if (cached && cached.length > 0) {
        vocab = cached;
        setTodayWords(vocab);
        setAllWords(vocab);
      }

      const savedLimit = await SecureStore.getItemAsync(STORAGE_KEYS.VOCAB_LIMIT);
      if (savedLimit) limit = parseInt(savedLimit, 10) || 15;

      const collegeId = await SecureStore.getItemAsync(STORAGE_KEYS.COLLEGE_ID);
      const lessonId = await SecureStore.getItemAsync(STORAGE_KEYS.LESSON_ID);

      if (collegeId) {
        try {
          const res = await apiFetch<Flashcard[]>(
            `${ENDPOINTS.VOCABULARY}?collegeId=${collegeId}&limit=${limit}`
          );
          if (res.success && res.data && res.data.length > 0) {
            vocab = res.data;
            await cacheSet("vocab_list", vocab);
          }
        } catch (e) {
          console.log("Vocabulary API failed — using cached data");
        }
      }

      if (vocab.length === 0 && lessonId) {
        try {
          const lessonRes = await apiFetch<any>(ENDPOINTS.TOPIC(lessonId));
          if (lessonRes.success && lessonRes.data?.vocabulary) {
            vocab = lessonRes.data.vocabulary.map((item: any, idx: number) => ({
              _id: `vocab_${idx}`,
              word: item.word,
              definition: item.definition,
              example: item.example || "",
              arabicMeaning: item.arabicMeaning || "",
              imageUrl: item.imageUrl || "",
              difficulty: item.difficulty || "medium",
              createdAt: new Date().toISOString(),
            }));
            await cacheSet("vocab_list", vocab);
          }
        } catch (e) {
          console.log("Lesson fallback also failed");
        }
      }

      setTodayWords(vocab);
      setAllWords(vocab);
    } catch (error) {
      console.error("Unexpected error in loadData:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllWords() {
    const collegeId = await SecureStore.getItemAsync(STORAGE_KEYS.COLLEGE_ID);
    if (!collegeId) return;
    try {
      const res = await apiFetch<Flashcard[]>(
        `${ENDPOINTS.VOCABULARY}?collegeId=${collegeId}&limit=999`
      );
      if (res.success && res.data && res.data.length > 0) {
        setAllWords(res.data);
        await cacheSet("vocab_list", res.data);
      }
    } catch {}
  }

  async function loadProgress() {
    try {
      const saved = await SecureStore.getItemAsync(STORAGE_KEYS.FLASHCARD_PROGRESS);
      if (saved) {
        setProgress(JSON.parse(saved));
      }
    } catch {
      // silent
    }
  }

  async function saveProgress(updated: typeof progress) {
    try {
      await SecureStore.setItemAsync(
        STORAGE_KEYS.FLASHCARD_PROGRESS,
        JSON.stringify(updated)
      );
    } catch {
      // silent
    }
  }

  function handleCardPress(card: Flashcard, index: number) {
    const updated = { ...progress, lastIndex: index };
    setProgress(updated);
    saveProgress(updated);

    router.push({
      pathname: "/(app)/flashcards/[id]",
      params: {
        id: card._id,
        mode: activeTab,
        index: String(index),
        from: activeTab === "today" ? "today" : "all",
      },
    });
  }

  const currentWords = activeTab === "today" ? todayWords : allWords;

  const filteredWords = currentWords.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchWord = item.word.toLowerCase().includes(q);
      const matchDef = item.definition.toLowerCase().includes(q);
      const matchArabic = (item.arabicMeaning || "").includes(searchQuery);
      if (!matchWord && !matchDef && !matchArabic) return false;
    }
    if (statusFilter === "known") return progress.known.includes(item._id);
    if (statusFilter === "later") return progress.unknown.includes(item._id);
    if (statusFilter === "pending")
      return !progress.known.includes(item._id) && !progress.unknown.includes(item._id);
    return true;
  });

  function renderFlashcard({ item, index }: { item: Flashcard; index: number }) {
    const isKnown = progress.known.includes(item._id);
    const isUnknown = progress.unknown.includes(item._id);

    return (
      <Pressable
        style={[
          styles.gridCard,
          {
            backgroundColor: colors.card,
            borderColor: isKnown
              ? colors.success
              : isUnknown
              ? colors.danger
              : colors.border,
          },
        ]}
        onPress={() => handleCardPress(item, index)}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.cardImagePlaceholder,
              { backgroundColor: colors.border },
            ]}
          >
            <Feather name="book" size={24} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={[styles.cardWord, { color: colors.text }]} numberOfLines={1}>
            {item.word}
          </Text>
          <Text
            style={[styles.cardDef, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.definition}
          </Text>
          <View style={styles.cardBadges}>
            {isKnown && (
              <View style={[styles.badge, { backgroundColor: colors.success + "22" }]}>
                <Feather name="check-circle" size={12} color={colors.success} />
                <Text style={[styles.badgeText, { color: colors.success }]}>
                  {lang === "ar" ? "حفظت" : "Known"}
                </Text>
              </View>
            )}
            {isUnknown && (
              <View style={[styles.badge, { backgroundColor: colors.danger + "22" }]}>
                <Feather name="clock" size={12} color={colors.danger} />
                <Text style={[styles.badgeText, { color: colors.danger }]}>
                  {lang === "ar" ? "لاحقاً" : "Later"}
                </Text>
              </View>
            )}
            {item.difficulty && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      item.difficulty === "easy"
                        ? colors.success + "22"
                        : item.difficulty === "hard"
                        ? colors.danger + "22"
                        : "#f59e0b" + "22",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        item.difficulty === "easy"
                          ? colors.success
                          : item.difficulty === "hard"
                          ? colors.danger
                          : "#f59e0b",
                    },
                  ]}
                >
                  {item.difficulty === "easy"
                    ? lang === "ar" ? "سهل" : "Easy"
                    : item.difficulty === "hard"
                    ? lang === "ar" ? "صعب" : "Hard"
                    : lang === "ar" ? "متوسط" : "Medium"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {lang === "ar" ? "📇 المفردات" : "📇 Vocabulary"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && {
                borderBottomColor: colors.accent,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => {
              setActiveTab(tab.id);
              if (tab.id === "all" && allWords.length === 0) fetchAllWords();
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.id ? colors.accent : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search bar */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={lang === "ar" ? "بحث عن كلمة..." : "Search words..."}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x-circle" size={16} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Status filter chips */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {statusFilters.map((f) => {
          const active = statusFilter === f.id;
          let chipColor = colors.accent;
          if (f.id === "known") chipColor = colors.success;
          else if (f.id === "later") chipColor = colors.danger;
          else if (f.id === "pending") chipColor = colors.textSecondary;
          return (
            <Pressable
              key={f.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? chipColor + "22" : "transparent",
                  borderColor: active ? chipColor : colors.border,
                  borderWidth: active ? 1.5 : 1,
                },
              ]}
              onPress={() => setStatusFilter(f.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? chipColor : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Stats bar */}
      <View style={[styles.statsBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.statsText, { color: colors.textSecondary }]}>
          {filteredWords.length}{" "}
          {lang === "ar" ? "كلمة" : "words"}
          {searchQuery || statusFilter !== "all"
            ? ` (${currentWords.length} ${lang === "ar" ? "إجمالي" : "total"})`
            : activeTab === "today"
            ? ` · ${progress.known.length + progress.unknown.length} ${
                lang === "ar" ? "مكتملة" : "reviewed"
              }`
            : ""}
        </Text>
        {activeTab === "today" && !searchQuery && statusFilter === "all" && (
          <Pressable
            style={[styles.resetBtn, { borderColor: colors.border }]}
            onPress={() => {
              setProgress({ lastIndex: 0, known: [], unknown: [] });
              saveProgress({ lastIndex: 0, known: [], unknown: [] });
            }}
          >
            <Feather name="refresh-cw" size={14} color={colors.textTertiary} />
            <Text style={[styles.resetText, { color: colors.textTertiary }]}>
              {lang === "ar" ? "إعادة تعيين" : "Reset"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Grid */}
      {filteredWords.length === 0 ? (
        <View style={styles.center}>
          <Feather name="book-open" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchQuery
              ? lang === "ar"
                ? "لا توجد نتائج للبحث"
                : "No results found"
              : lang === "ar"
              ? "لا توجد مفردات بعد"
              : "No vocabulary added yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={renderFlashcard}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", fontFamily: "Cairo_700Bold" },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Cairo_600SemiBold",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statsText: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetText: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  grid: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12 },
  columnWrapper: { justifyContent: "space-between", gap: 12 },
  gridCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.6,
  },
  cardImagePlaceholder: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.6,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    padding: 12,
    gap: 4,
  },
  cardWord: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Cairo_700Bold",
  },
  cardDef: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    lineHeight: 18,
  },
  cardBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 10, fontFamily: "Cairo_600SemiBold" },
  emptyText: { fontSize: 16, fontFamily: "Cairo_400Regular" },
});
