import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { ENDPOINTS, STORAGE_KEYS } from "@/constants/config";
import { cacheGet, cacheSet } from "@/lib/cache";

const { width, height } = Dimensions.get("window");

interface FlashcardDetail {
  _id: string;
  word: string;
  definition: string;
  example?: string;
  arabicMeaning?: string;
  imageUrl?: string;
  difficulty?: "easy" | "medium" | "hard";
  createdAt: string;
  lessonId?: string;
}

interface Progress {
  lastIndex: number;
  known: string[];
  unknown: string[];
}

export default function FlashcardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    mode?: "today" | "all";
    index?: string;
    from?: "today" | "all";
  }>();
  const { colors } = useTheme();
  const { lang } = useLanguage();

  const [card, setCard] = useState<FlashcardDetail | null>(null);
  const [allCards, setAllCards] = useState<FlashcardDetail[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showArabic, setShowArabic] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState<Progress>({
    lastIndex: 0,
    known: [],
    unknown: [],
  });

  const flipAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    loadProgress();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(false);
    let cardData: FlashcardDetail | null = null;
    let allData: FlashcardDetail[] = [];

    try {
      // ── Attempt 1: Load from cache ──
      const cached = await cacheGet<FlashcardDetail[]>("vocab_list");
      if (cached && cached.length > 0) {
        allData = cached;
        const found = cached.find((v) => v._id === params.id);
        if (found) cardData = found;
      }

      const collegeId = await SecureStore.getItemAsync(STORAGE_KEYS.COLLEGE_ID);
      const lessonId = await SecureStore.getItemAsync(STORAGE_KEYS.LESSON_ID);

      // ── Attempt 2: Fetch vocabulary list from API ──
      if (collegeId) {
        try {
          const listRes = await apiFetch<FlashcardDetail[]>(
            `${ENDPOINTS.VOCABULARY}?collegeId=${collegeId}&limit=50`
          );
          if (listRes.success && listRes.data && listRes.data.length > 0) {
            allData = listRes.data;
            await cacheSet("vocab_list", allData);
            const found = listRes.data.find((v) => v._id === params.id);
            if (found) cardData = found;
          }
        } catch (e) {
          console.log("Vocabulary list API failed — using cached data");
        }
      }

      // ── Attempt 3: Lesson fallback ──
      if (!cardData && lessonId) {
        try {
          const lessonRes = await apiFetch<any>(ENDPOINTS.TOPIC(lessonId));
          if (lessonRes.success && lessonRes.data?.vocabulary) {
            const vocab = lessonRes.data.vocabulary.map((item: any, idx: number) => ({
              _id: `vocab_${idx}`,
              word: item.word,
              definition: item.definition,
              example: item.example || "",
              arabicMeaning: item.arabicMeaning || "",
              imageUrl: item.imageUrl || "",
              difficulty: item.difficulty || "medium",
              createdAt: new Date().toISOString(),
            }));
            allData = vocab;
            await cacheSet("vocab_list", vocab);
            const found = vocab.find((v: any) => v._id === params.id);
            if (found) cardData = found;
          }
        } catch (e) {
          console.log("Lesson fallback failed");
        }
      }

      if (!cardData && allData.length === 0) {
        setError(true);
      } else if (!cardData && allData.length > 0) {
        setCard(allData[0]);
        setAllCards(allData);
        setCurrentIndex(0);
      } else {
        setCard(cardData);
        setAllCards(allData);
        const idx = allData.findIndex((c) => c._id === params.id);
        setCurrentIndex(idx >= 0 ? idx : 0);
      }
    } catch (error) {
      console.error("Failed to load flashcard:", error);
      setError(true);
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

  async function saveProgress(updated: Progress) {
    try {
      await SecureStore.setItemAsync(
        STORAGE_KEYS.FLASHCARD_PROGRESS,
        JSON.stringify(updated)
      );
    } catch {
      // silent
    }
  }

  function flipCard() {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  }

  function goToCard(index: number) {
    if (index < 0 || index >= allCards.length) return;

    const direction = index > currentIndex ? -1 : 1;
    slideAnim.setValue(direction * width);

    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 10,
      tension: 40,
      useNativeDriver: true,
    }).start();

    setCurrentIndex(index);
    setCard(allCards[index]);
    setIsFlipped(false);
    flipAnim.setValue(0);
    setShowArabic(false);

    const updated = { ...progress, lastIndex: index };
    setProgress(updated);
    saveProgress(updated);
  }

  function handleAction(action: "known" | "unknown") {
    if (!card) return;

    let updatedKnown = [...progress.known];
    let updatedUnknown = [...progress.unknown];

    if (action === "known") {
      if (updatedKnown.includes(card._id)) {
        updatedKnown = updatedKnown.filter((id) => id !== card._id);
      } else {
        updatedKnown.push(card._id);
      }
      updatedUnknown = updatedUnknown.filter((id) => id !== card._id);
    } else {
      if (updatedUnknown.includes(card._id)) {
        updatedUnknown = updatedUnknown.filter((id) => id !== card._id);
      } else {
        updatedUnknown.push(card._id);
      }
      updatedKnown = updatedKnown.filter((id) => id !== card._id);
    }

    const updated = {
      ...progress,
      known: updatedKnown,
      unknown: updatedUnknown,
    };
    setProgress(updated);
    saveProgress(updated);
  }

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !card) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Feather name="arrow-right" size={24} color={colors.text} />
          </Pressable>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Feather name="book-open" size={56} color={colors.border} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {lang === "ar" ? "لا توجد مفردات" : "No vocabulary"}
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            {lang === "ar"
              ? "لم يتم إضافة أي كلمات بعد"
              : "No vocabulary words added yet"}
          </Text>
          <Pressable
            style={[styles.errorBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.back()}
          >
            <Text style={styles.errorBtnText}>
              {lang === "ar" ? "العودة" : "Go Back"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isKnown = progress.known.includes(card._id);
  const isUnknown = progress.unknown.includes(card._id);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-right" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.counter, { color: colors.textSecondary }]}>
          {currentIndex + 1} / {allCards.length}
        </Text>
        <Pressable
          style={styles.resetProgress}
          onPress={() => {
            const updated = {
              ...progress,
              known: progress.known.filter((id) => id !== card._id),
              unknown: progress.unknown.filter((id) => id !== card._id),
            };
            setProgress(updated);
            saveProgress(updated);
          }}
        >
          <Feather name="refresh-cw" size={18} color={colors.textTertiary} />
        </Pressable>
      </View>

      <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${((currentIndex + 1) / allCards.length) * 100}%`,
              backgroundColor: colors.accent,
            },
          ]}
        />
      </View>

      <View style={styles.cardWrap}>
        {/* Front */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFace,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateX: slideAnim }, { rotateY: frontInterpolate }],
            },
          ]}
        >
          <Pressable onPress={flipCard} style={styles.cardPressable}>
            {card.imageUrl ? (
              <Image
                source={{ uri: card.imageUrl }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : null}
            <Text style={[styles.wordText, { color: colors.text }]}>
              {card.word}
            </Text>
            {card.difficulty ? (
              <View
                style={[
                  styles.diffBadge,
                  {
                    backgroundColor:
                      card.difficulty === "easy"
                        ? colors.success + "22"
                        : card.difficulty === "hard"
                        ? colors.danger + "22"
                        : "#f59e0b" + "22",
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      card.difficulty === "easy"
                        ? colors.success
                        : card.difficulty === "hard"
                        ? colors.danger
                        : "#f59e0b",
                    fontSize: 12,
                    fontFamily: "Cairo_400Regular",
                  }}
                >
                  {card.difficulty === "easy"
                    ? lang === "ar" ? "سهل" : "Easy"
                    : card.difficulty === "hard"
                    ? lang === "ar" ? "صعب" : "Hard"
                    : lang === "ar" ? "متوسط" : "Medium"}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.flipHint, { color: colors.textTertiary }]}>
              {lang === "ar" ? "👆 اضغط للقلب" : "👆 Tap to flip"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFace,
            styles.cardBack,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateX: slideAnim }, { rotateY: backInterpolate }],
            },
          ]}
        >
          <Pressable onPress={flipCard} style={styles.cardPressable}>
            <Text style={[styles.definitionText, { color: colors.accent }]}>
              {card.definition}
            </Text>
            {card.example ? (
              <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                "{card.example}"
              </Text>
            ) : null}
            {card.arabicMeaning ? (
              <Pressable
                style={[styles.arabicBtn, { borderColor: colors.accent + "40" }]}
                onPress={(e) => { e.stopPropagation?.(); setShowArabic(!showArabic); }}
              >
                <Text style={[styles.arabicBtnText, { color: colors.accent }]}>
                  {showArabic
                    ? card.arabicMeaning
                    : lang === "ar"
                    ? "👁 أظهر المعنى بالعربي"
                    : "👁 Show Arabic meaning"}
                </Text>
              </Pressable>
            ) : null}
            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.actionBtn,
                  {
                    borderColor: colors.danger + "40",
                    backgroundColor: isUnknown ? colors.danger + "22" : "transparent",
                  },
                ]}
                onPress={() => handleAction("unknown")}
              >
                <Feather name="clock" size={18} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>
                  {lang === "ar" ? "لاحقاً" : "Later"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtn,
                  {
                    borderColor: colors.success + "40",
                    backgroundColor: isKnown ? colors.success + "22" : "transparent",
                  },
                ]}
                onPress={() => handleAction("known")}
              >
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>
                  {lang === "ar" ? "حفظت" : "Known"}
                </Text>
              </Pressable>
            </View>
            <Text style={[styles.flipHint, { color: colors.textTertiary }]}>
              {lang === "ar" ? "👆 اضغط للعودة" : "👆 Tap to flip back"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.navRow}>
        <Pressable
          style={[
            styles.navBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: currentIndex === 0 ? 0.3 : 1,
            },
          ]}
          disabled={currentIndex === 0}
          onPress={() => goToCard(currentIndex - 1)}
        >
          <Feather
            name="chevron-right"
            size={28}
            color={currentIndex === 0 ? colors.textTertiary : colors.text}
          />
        </Pressable>

        <View style={[styles.statusChip, { borderColor: colors.border }]}>
          {isKnown ? (
            <Feather name="check-circle" size={14} color={colors.success} />
          ) : isUnknown ? (
            <Feather name="clock" size={14} color={colors.danger} />
          ) : (
            <Feather name="minus-circle" size={14} color={colors.textTertiary} />
          )}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {isKnown
              ? lang === "ar"
                ? "محفوظة"
                : "Known"
              : isUnknown
              ? lang === "ar"
                ? "لاحقاً"
                : "Later"
              : lang === "ar"
              ? "غير مكتملة"
              : "Pending"}
          </Text>
        </View>

        <Pressable
          style={[
            styles.navBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: currentIndex === allCards.length - 1 ? 0.3 : 1,
            },
          ]}
          disabled={currentIndex === allCards.length - 1}
          onPress={() => goToCard(currentIndex + 1)}
        >
          <Feather
            name="chevron-left"
            size={28}
            color={
              currentIndex === allCards.length - 1 ? colors.textTertiary : colors.text
            }
          />
        </Pressable>
      </View>

      {/* ── Completion Modal ── */}
      <Modal visible={showCompleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {lang === "ar" ? "أحسنت!" : "Well done!"}
            </Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              {lang === "ar"
                ? "لقد أنهيت جميع البطاقات!"
                : "You've completed all cards!"}
            </Text>
            <View style={styles.modalStats}>
              <View style={[styles.modalStat, { backgroundColor: colors.success + "18" }]}>
                <Feather name="check-circle" size={20} color="#22c55e" />
                <Text style={styles.modalStatValue}>{progress.known.length}</Text>
                <Text style={styles.modalStatLabel}>
                  {lang === "ar" ? "محفوظة" : "Known"}
                </Text>
              </View>
              <View style={[styles.modalStat, { backgroundColor: colors.danger + "18" }]}>
                <Feather name="clock" size={20} color="#ef4444" />
                <Text style={styles.modalStatValue}>{progress.unknown.length}</Text>
                <Text style={styles.modalStatLabel}>
                  {lang === "ar" ? "لاحقاً" : "Later"}
                </Text>
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                onPress={() => { setShowCompleteModal(false); router.back(); }}
              >
                <Text style={styles.modalBtnText}>
                  {lang === "ar" ? "العودة" : "Back"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnOutline, { borderColor: colors.border }]}
                onPress={() => {
                  setShowCompleteModal(false);
                  setProgress({ lastIndex: 0, known: [], unknown: [] });
                  saveProgress({ lastIndex: 0, known: [], unknown: [] });
                  goToCard(0);
                }}
              >
                <Text style={[styles.modalBtnOutlineText, { color: colors.text }]}>
                  {lang === "ar" ? "ابدأ من جديد" : "Start Over"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  counter: { fontSize: 14, fontFamily: "Cairo_400Regular" },
  resetProgress: { padding: 4 },
  progressBg: { height: 3, borderRadius: 1.5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 1.5 },
  cardWrap: { flex: 1, marginHorizontal: 20, marginVertical: 12 },
  card: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  cardFace: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backfaceVisibility: "hidden",
  },
  cardBack: {
    backfaceVisibility: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    marginBottom: 8,
  },
  wordText: {
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  diffBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  flipHint: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  cardPressable: {
    flex: 1, width: "100%",
    alignItems: "center", justifyContent: "center",
    gap: 12,
  },
  definitionText: {
    fontSize: 22,
    fontWeight: "600",
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
    lineHeight: 32,
    paddingHorizontal: 8,
  },
  exampleText: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 12,
  },
  arabicBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  arabicBtnText: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  actionBtnKnown: {},
  actionBtnUnknown: {},
  actionText: { fontSize: 15, fontFamily: "Cairo_700Bold" },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  navBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  errorTitle: { fontSize: 22, fontFamily: "Cairo_700Bold", marginTop: 16 },
  errorSubtitle: { fontSize: 14, fontFamily: "Cairo_400Regular", marginTop: 4 },
  errorBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 24 },
  errorBtnText: { color: "#fff", fontSize: 15, fontFamily: "Cairo_700Bold" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 32,
  },
  modalContent: {
    width: "100%", borderRadius: 24, padding: 32,
    borderWidth: 1, alignItems: "center", gap: 12,
  },
  modalEmoji: { fontSize: 64, marginBottom: 4 },
  modalTitle: { fontSize: 26, fontFamily: "Cairo_700Bold", textAlign: "center" },
  modalMessage: { fontSize: 15, fontFamily: "Cairo_400Regular", textAlign: "center", marginBottom: 8 },
  modalStats: { flexDirection: "row", gap: 16, width: "100%", marginVertical: 8 },
  modalStat: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 14, borderRadius: 16 },
  modalStatValue: { fontSize: 24, fontFamily: "Cairo_700Bold", color: "#fff" },
  modalStatLabel: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "rgba(255,255,255,0.7)" },
  modalActions: { flexDirection: "row", gap: 12, width: "100%", marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  modalBtnText: { color: "#fff", fontSize: 15, fontFamily: "Cairo_700Bold" },
  modalBtnOutline: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1.5 },
  modalBtnOutlineText: { fontSize: 15, fontFamily: "Cairo_700Bold" },
});