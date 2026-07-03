import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { ENDPOINTS, STORAGE_KEYS } from "@/constants/config";

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

export default function FlashcardsIndexScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();

  const [activeTab, setActiveTab] = useState<"today" | "all">("today");
  const [todayWords, setTodayWords] = useState<Flashcard[]>([]);
  const [allWords, setAllWords] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{
    lastIndex: number;
    known: string[];
    unknown: string[];
  }>({ lastIndex: 0, known: [], unknown: [] });

  const tabs: { id: "today" | "all"; label: string }[] = [
    { id: "today", label: lang === "ar" ? "مفردات اليوم" : "Today's Vocabulary" },
    { id: "all", label: lang === "ar" ? "جميع المفردات" : "All Vocabulary" },
  ];

  const [initialResumeDone, setInitialResumeDone] = useState(false);

  useEffect(() => {
    loadData();
    loadProgress();
  }, []);

  useEffect(() => {
    if (!loading && todayWords.length > 0 && !initialResumeDone) {
      setInitialResumeDone(true);
      if (progress.lastIndex > 0) {
        const idx = Math.min(progress.lastIndex, todayWords.length - 1);
        const card = todayWords[idx];
        if (card) {
          router.replace({
            pathname: "/(app)/flashcards/[id]",
            params: {
              id: card._id,
              mode: "today",
              index: String(idx),
              from: "today",
            },
          });
        }
      }
    }
  }, [loading, todayWords]);

  async function loadData() {
    setLoading(true);
    let vocab: Flashcard[] = [];

    try {
      const collegeId = await SecureStore.getItemAsync(STORAGE_KEYS.COLLEGE_ID);
      const lessonId = await SecureStore.getItemAsync(STORAGE_KEYS.LESSON_ID);

      // ── Attempt 1: Vocabulary API ──
      if (collegeId) {
        try {
          const res = await apiFetch<Flashcard[]>(
            `${ENDPOINTS.VOCABULARY}?collegeId=${collegeId}&limit=15`
          );
          if (res.success && res.data && res.data.length > 0) {
            vocab = res.data;
          }
        } catch (e) {
          // vocabulary API failed – fall through
          console.log("Vocabulary API failed, trying lesson fallback");
        }
      }

      // ── Attempt 2: Fallback to Lesson Vocabulary ──
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
          }
        } catch (e) {
          console.log("Lesson fallback also failed");
        }
      }

      // ── No data from API, keep empty ──

      setTodayWords(vocab);
      setAllWords(vocab); // In a real app, 'all' would fetch more
    } catch (error) {
      console.error("Unexpected error in loadData:", error);
    } finally {
      setLoading(false);
    }
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
                    ? lang === "ar"
                      ? "سهل"
                      : "Easy"
                    : item.difficulty === "hard"
                    ? lang === "ar"
                      ? "صعب"
                      : "Hard"
                    : lang === "ar"
                    ? "متوسط"
                    : "Medium"}
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

  const currentWords = activeTab === "today" ? todayWords : allWords;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-right" size={24} color={colors.text} />
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
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === tab.id ? colors.accent : colors.textSecondary,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Stats bar */}
      <View style={[styles.statsBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.statsText, { color: colors.textSecondary }]}>
          {currentWords.length}{" "}
          {lang === "ar" ? "كلمة" : "words"}
          {activeTab === "today" &&
            ` · ${progress.known.length + progress.unknown.length} ${
              lang === "ar" ? "مكتملة" : "reviewed"
            }`}
        </Text>
        {activeTab === "today" && (
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
      {currentWords.length === 0 ? (
        <View style={styles.center}>
          <Feather name="book-open" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {lang === "ar"
              ? "لا توجد مفردات بعد"
              : "No vocabulary added yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentWords}
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