import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Pressable, Animated,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS, STORAGE_KEYS } from "@/constants/config";
import { useTheme } from "@/lib/theme/context";
import { useLanguage } from "@/lib/i18n/context";

interface VocabWord {
  _id: string;
  word: string;
  definition: string;
  example: string;
  arabicMeaning: string;
  difficulty: string;
}

export default function FlashcardsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showArabic, setShowArabic] = useState(false);
  const [loading, setLoading] = useState(true);
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadWords();
  }, []);

  async function loadWords() {
    try {
      const collegeId = await SecureStore.getItemAsync(STORAGE_KEYS.COLLEGE_ID);
      if (!collegeId) return;
      const res = await apiFetch<VocabWord[]>(`${ENDPOINTS.VOCABULARY}?collegeId=${collegeId}&limit=20`);
      if (res.success && res.data) setWords(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const currentWord = words[index];

  function flip() {
    if (isFlipped) {
      Animated.spring(flipAnim, { toValue: 0, useNativeDriver: true }).start();
      setIsFlipped(false);
      setShowArabic(false);
    } else {
      Animated.spring(flipAnim, { toValue: 1, useNativeDriver: true }).start();
      setIsFlipped(true);
    }
  }

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  function handleAction(action: "memorized" | "later") {
    const next = index + 1;
    if (next >= words.length) {
      Alert.alert(
        lang === "ar" ? "أحسنت! 🎉" : "Well done! 🎉",
        lang === "ar" ? "لقد أنهيت كل الكلمات لليوم!" : "You've completed all words for today!",
        [{ text: "OK", onPress: () => router.back() }]
      );
      return;
    }
    flipAnim.setValue(0);
    setIsFlipped(false);
    setShowArabic(false);
    setIndex(next);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#6C63FF" size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (words.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-right" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.center}>
          <Feather name="book-open" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {lang === "ar" ? "لا توجد مفردات بعد" : "No vocabulary added yet"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-right" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.counter, { color: colors.textSecondary }]}>
          {index + 1} / {words.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${((index + 1) / words.length) * 100}%`, backgroundColor: "#6C63FF" }]} />
      </View>

      {/* Card */}
      <Pressable style={styles.cardWrap} onPress={flip}>
        {/* Front */}
        <Animated.View style={[styles.card, { backgroundColor: "#1a1040", transform: [{ rotateY: frontRotate }] }]}>
          <Text style={styles.tapHint}>{lang === "ar" ? "اضغط للقلب" : "Tap to flip"}</Text>
          <Text style={styles.wordText}>{currentWord.word}</Text>
          <View style={[styles.diffBadge, { backgroundColor: currentWord.difficulty === "easy" ? "#22c55e22" : currentWord.difficulty === "hard" ? "#ef444422" : "#f59e0b22" }]}>
            <Text style={{ color: currentWord.difficulty === "easy" ? "#22c55e" : currentWord.difficulty === "hard" ? "#ef4444" : "#f59e0b", fontSize: 12, fontFamily: "Cairo_400Regular" }}>
              {currentWord.difficulty === "easy" ? "سهل" : currentWord.difficulty === "hard" ? "صعب" : "متوسط"}
            </Text>
          </View>
        </Animated.View>

        {/* Back */}
        <Animated.View style={[styles.card, styles.cardBack, { backgroundColor: "#160d35", transform: [{ rotateY: backRotate }] }]}>
          <Text style={styles.tapHint}>{lang === "ar" ? "اضغط للعودة" : "Tap to flip back"}</Text>
          <Text style={styles.definitionText}>{currentWord.definition}</Text>
          <Text style={styles.exampleText}>"{currentWord.example}"</Text>
          {showArabic ? (
            <Text style={styles.arabicText}>{currentWord.arabicMeaning}</Text>
          ) : (
            <Pressable style={styles.arabicBtn} onPress={(e) => { e.stopPropagation?.(); setShowArabic(true); }}>
              <Text style={styles.arabicBtnText}>
                {lang === "ar" ? "أظهر المعنى بالعربي" : "Show Arabic meaning"}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </Pressable>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, { backgroundColor: "#22c55e22", borderColor: "#22c55e" }]} onPress={() => handleAction("memorized")}>
          <Feather name="check-circle" size={22} color="#22c55e" />
          <Text style={[styles.actionText, { color: "#22c55e" }]}>{lang === "ar" ? "حفظت" : "Memorized"}</Text>
        </Pressable>

        <Pressable style={[styles.actionBtn, { backgroundColor: "#f59e0b22", borderColor: "#f59e0b" }]} onPress={() => handleAction("later")}>
          <Feather name="clock" size={22} color="#f59e0b" />
          <Text style={[styles.actionText, { color: "#f59e0b" }]}>{lang === "ar" ? "لاحقاً" : "Later"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { fontSize: 16, fontFamily: "Cairo_400Regular" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 8 },
  counter: { fontSize: 14, fontFamily: "Cairo_400Regular" },
  progressBg: { height: 4, marginHorizontal: 20, borderRadius: 2, marginBottom: 24 },
  progressFill: { height: 4, borderRadius: 2 },
  cardWrap: { flex: 1, marginHorizontal: 24, marginBottom: 24 },
  card: {
    position: "absolute", width: "100%", height: "100%",
    borderRadius: 24, padding: 32,
    alignItems: "center", justifyContent: "center", gap: 16,
    backfaceVisibility: "hidden",
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
    borderWidth: 1, borderColor: "#2d1f6e",
  },
  cardBack: { backgroundColor: "#160d35" },
  tapHint: { position: "absolute", top: 16, color: "#475569", fontSize: 12, fontFamily: "Cairo_400Regular" },
  wordText: { color: "#ffffff", fontSize: 42, fontFamily: "Cairo_700Bold", textAlign: "center" },
  diffBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  definitionText: { color: "#e2e8f0", fontSize: 18, fontFamily: "Cairo_400Regular", textAlign: "center", lineHeight: 28 },
  exampleText: { color: "#94a3b8", fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "center", fontStyle: "italic" },
  arabicText: { color: "#6C63FF", fontSize: 22, fontFamily: "Cairo_700Bold", textAlign: "center", marginTop: 8 },
  arabicBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#6C63FF22", borderWidth: 1, borderColor: "#6C63FF" },
  arabicBtnText: { color: "#6C63FF", fontSize: 14, fontFamily: "Cairo_700Bold" },
  actions: { flexDirection: "row", paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5 },
  actionText: { fontSize: 15, fontFamily: "Cairo_700Bold" },
});
