import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import type { VocabularyItem } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { ENDPOINTS } from "@/constants/config";

const { width } = Dimensions.get("window");

export default function FlashcardsScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { colors } = useTheme();

  const [vocab, setVocab] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownWords, setKnownWords] = useState<Set<number>>(new Set());
  const [unknownWords, setUnknownWords] = useState<Set<number>>(new Set());

  const flipAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isFlipped = flipped;

  useEffect(() => {
    async function load() {
      try {
        // First try dedicated vocabulary API
        const res = await apiFetch<VocabularyItem[]>(ENDPOINTS.VOCABULARY(lessonId));
        if (res.success && res.data && res.data.length > 0) {
          setVocab(res.data);
        } else {
          // Fallback: fetch lesson and extract vocabulary
          const lessonRes = await apiFetch<any>(`/api/topics/${lessonId}`);
          if (lessonRes.success && lessonRes.data?.vocabulary) {
            setVocab(lessonRes.data.vocabulary);
          }
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    load();
  }, [lessonId]);

  function flipCard() {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setFlipped(!isFlipped);
  }

  function nextCard(known: boolean) {
    if (known) {
      setKnownWords((p) => new Set(p).add(currentIndex));
    } else {
      setUnknownWords((p) => new Set(p).add(currentIndex));
    }

    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setFlipped(false);
      flipAnim.setValue(0);
      slideAnim.setValue(0);
      if (currentIndex < vocab.length - 1) {
        setCurrentIndex((p) => p + 1);
      } else {
        // All done — restart
        setCurrentIndex(0);
        setKnownWords(new Set());
        setUnknownWords(new Set());
      }
    });
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
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (vocab.length === 0) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()}><Feather name="arrow-right" size={24} color={colors.textSecondary} /></Pressable>
        </View>
        <View style={s.center}>
          <Feather name="book" size={56} color={colors.border} />
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>{t("flashcards.empty")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const current = vocab[currentIndex];
  const progress = vocab.length > 0 ? ((knownWords.size + unknownWords.size) / vocab.length) * 100 : 0;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}><Feather name="arrow-right" size={24} color={colors.textSecondary} /></Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t("flashcards.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress bar */}
      <View style={s.progressSection}>
        <View style={[s.progressBg, { backgroundColor: colors.border }]}>
          <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: colors.accent }]} />
        </View>
        <Text style={[s.progressText, { color: colors.textSecondary }]}>
          {knownWords.size + unknownWords.size} / {vocab.length}
        </Text>
      </View>

      <View style={s.cardArea}>
        <Animated.View
          style={[
            s.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <Pressable onPress={flipCard} style={s.cardInner}>
            <Animated.View
              style={[
                s.cardFace,
                {
                  backfaceVisibility: "hidden",
                  transform: [{ rotateY: frontInterpolate }],
                },
              ]}
            >
              <Text style={[s.wordText, { color: colors.text }]}>{current.word}</Text>
              <Text style={[s.flipHint, { color: colors.textTertiary }]}>{t("flashcards.flip")}</Text>
            </Animated.View>
            <Animated.View
              style={[
                s.cardFace,
                s.cardBack,
                {
                  backfaceVisibility: "hidden",
                  transform: [{ rotateY: backInterpolate }],
                },
              ]}
            >
              <Text style={[s.defText, { color: colors.accent }]}>{current.definition}</Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>

      <View style={s.actionRow}>
        <Pressable
          style={[s.actionBtn, { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "#EF444440" }]}
          onPress={() => nextCard(false)}
        >
          <Feather name="x" size={22} color="#EF4444" />
          <Text style={[s.actionText, { color: "#EF4444" }]}>{t("flashcards.unknown")}</Text>
        </Pressable>
        <Pressable
          style={[s.actionBtn, { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "#22C55E40" }]}
          onPress={() => nextCard(true)}
        >
          <Feather name="check" size={22} color="#22C55E" />
          <Text style={[s.actionText, { color: "#22C55E" }]}>{t("flashcards.known")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, paddingHorizontal: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "bold", fontFamily: "Cairo_700Bold" },
  emptyText: { fontSize: 15, textAlign: "center", fontFamily: "Cairo_400Regular" },
  progressSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  progressBg: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: { fontSize: 12, textAlign: "center", fontFamily: "Cairo_400Regular" },
  cardArea: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", height: 280, borderRadius: 24, borderWidth: 1, elevation: 8, shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  cardInner: { flex: 1 },
  cardFace: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", padding: 24 },
  cardBack: {},
  wordText: { fontSize: 28, fontWeight: "bold", textAlign: "center", fontFamily: "Cairo_700Bold" },
  flipHint: { fontSize: 12, marginTop: 20, fontFamily: "Cairo_400Regular" },
  defText: { fontSize: 22, fontWeight: "600", textAlign: "center", lineHeight: 32, fontFamily: "Cairo_700Bold" },
  actionRow: { flexDirection: "row", gap: 16, paddingHorizontal: 20, paddingBottom: 40 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  actionText: { fontSize: 16, fontWeight: "700", fontFamily: "Cairo_700Bold" },
});
