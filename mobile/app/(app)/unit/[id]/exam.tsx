import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { apiFetch } from "@/lib/api";
import ExamTimer from "@/components/learning/ExamTimer";
import type { ExamEligibility, Question, Lesson } from "@/lib/types";
import { showAlert } from "@/lib/ui/AlertModal";

type Screen = "loading" | "blocked_cooldown" | "blocked_limit" | "already_passed" | "intro" | "exam" | "result";

interface ExamResult {
  passed: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  attemptNumber: number;
  nextAttemptAt: string | null;
}

function pickQuestions(questions: Question[], target = 20): Question[] {
  const easy = questions.filter(q => q.difficulty === "easy");
  const medium = questions.filter(q => q.difficulty === "medium");
  const hard = questions.filter(q => q.difficulty === "hard");

  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

  const easyPick = shuffle(easy).slice(0, 6);
  const mediumPick = shuffle(medium).slice(0, 9);
  const hardPick = shuffle(hard).slice(0, 5);

  const picked = [...easyPick, ...mediumPick, ...hardPick];
  if (picked.length >= target) return shuffle(picked);

  const usedIds = new Set(picked.map(q => q._id));
  const rest = shuffle(questions.filter(q => !usedIds.has(q._id)));
  return shuffle([...picked, ...rest].slice(0, target));
}

export default function UnitExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [screen, setScreen] = useState<Screen>("loading");
  const [eligibility, setEligibility] = useState<ExamEligibility | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    async function checkEligibility() {
      setScreen("loading");
      try {
        const res = await apiFetch<ExamEligibility>(`/api/progress/unit-exam?unitId=${id}`);
        if (cancelled || !res.success || !res.data) return;
        const e = res.data;
        setEligibility(e);
        if (e.alreadyPassed) { setScreen("already_passed"); return; }
        if (!e.eligible && e.reason === "daily_limit") { setScreen("blocked_limit"); return; }
        if (!e.eligible && e.reason === "cooldown") { setScreen("blocked_cooldown"); return; }
        setScreen("intro");
      } catch {
        if (!cancelled) setScreen("intro");
      }
    }
    checkEligibility();
    return () => { cancelled = true; };
  }, [id]));

  async function handleStartExam() {
    setLoadingQuestions(true);
    try {
      const lessonsRes = await apiFetch<Lesson[]>(`/api/admin/topics?unitId=${id}`);
      if (!lessonsRes.success || !lessonsRes.data || lessonsRes.data.length === 0) {
        showAlert({ type: "error", title: "خطأ", message: "لا توجد دروس في هذه الوحدة" });
        return;
      }
      const publishedLessons = lessonsRes.data.filter(l => l.isPublished);
      if (publishedLessons.length === 0) {
        showAlert({ type: "error", title: "خطأ", message: "لا توجد دروس منشورة في هذه الوحدة" });
        return;
      }

      setSubjectId(publishedLessons[0].subjectId);

      const allQuestions: Question[] = [];
      await Promise.all(
        publishedLessons.map(async (lesson) => {
          try {
            const qRes = await apiFetch<Question[]>(`/api/questions/${lesson.slug}`);
            if (qRes.success && qRes.data) allQuestions.push(...qRes.data);
          } catch { /* skip lesson if questions fail */ }
        })
      );

      if (allQuestions.length === 0) {
        showAlert({ type: "error", title: "خطأ", message: "لا توجد أسئلة متاحة لهذه الوحدة" });
        return;
      }

      const picked = pickQuestions(allQuestions);
      setQuestions(picked);
      setSelected({});
      setCurrentIdx(0);
      setScreen("exam");
    } catch {
      showAlert({ type: "error", title: "خطأ", message: "حدث خطأ في تحميل الأسئلة، حاول مرة أخرى" });
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    const unanswered = questions.filter(q => selected[q._id] === undefined);
    if (unanswered.length > 0) {
      showAlert({ type: "warning", title: "تنبيه", message: `تبقى ${unanswered.length} سؤال بدون إجابة` });
      return;
    }
    setSubmitting(true);
    try {
      const answers = questions.map(q => ({
        questionId: q._id,
        answer: selected[q._id],
      }));
      const res = await apiFetch<ExamResult>("/api/progress/unit-exam", {
        method: "POST",
        body: { unitId: id, subjectId, answers },
      });
      if (res.success && res.data) {
        setResult(res.data);
        setScreen("result");
      } else {
        showAlert({ type: "error", title: "خطأ", message: res.error ?? "حدث خطأ في تصحيح الاختبار" });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حدث خطأ في تصحيح الاختبار";
      showAlert({ type: "error", title: "خطأ", message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  if (screen === "loading") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator color="#6C63FF" size="large" /></View>
      </SafeAreaView>
    );
  }

  if (screen === "already_passed") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-right" size={24} color="#94a3b8" />
          </Pressable>
        </View>
        <View style={s.center}>
          <Feather name="award" size={64} color="#F59E0B" />
          <Text style={s.bigTitle}>اجتزت هذا الاختبار!</Text>
          <Text style={s.subText}>لقد اجتزت اختبار الوحدة بنجاح. جميع الدروس مفتوحة.</Text>
          <Pressable style={s.primaryBtn} onPress={() => router.back()}>
            <Text style={s.primaryBtnText}>العودة للوحدة</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "blocked_limit") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-right" size={24} color="#94a3b8" />
          </Pressable>
        </View>
        <View style={s.center}>
          <Feather name="slash" size={64} color="#EF4444" />
          <Text style={s.bigTitle}>انتهت محاولات اليوم</Text>
          <Text style={s.subText}>لقد استخدمت 3 محاولات اليوم. عد غداً للمحاولة مرة أخرى.</Text>
          <Pressable style={s.secondaryBtn} onPress={() => router.back()}>
            <Text style={s.secondaryBtnText}>العودة للوحدة</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "blocked_cooldown") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-right" size={24} color="#94a3b8" />
          </Pressable>
        </View>
        <View style={s.center}>
          <View style={s.timerWrap}>
            <ExamTimer
              nextAttemptAt={eligibility?.nextAttemptAt ?? null}
              onReady={() => setScreen("intro")}
            />
          </View>
          <Text style={s.subText}>
            محاولة {eligibility?.attemptsToday} من 3 اليوم.{" "}
            {(eligibility?.attemptsRemaining ?? 0) > 0
              ? `تبقى ${eligibility?.attemptsRemaining} محاولة.`
              : ""}
          </Text>
          <Pressable style={s.secondaryBtn} onPress={() => router.back()}>
            <Text style={s.secondaryBtnText}>العودة للوحدة</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "result" && result) {
    const passed = result.passed;
    const pct = Math.round((result.correctAnswers / result.totalQuestions) * 100);
    const color = passed ? "#22C55E" : pct >= 50 ? "#F59E0B" : "#EF4444";
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-right" size={24} color="#94a3b8" />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.resultCard, { borderColor: color + "40" }]}>
            <Feather name={passed ? "award" : "refresh-cw"} size={48} color={color} />
            <Text style={[s.resultPct, { color }]}>{pct}%</Text>
            <Text style={s.resultSub}>{result.correctAnswers} / {result.totalQuestions} إجابة صحيحة</Text>
            <Text style={[s.resultLabel, { color }]}>
              {passed ? "مبروك! اجتزت اختبار الوحدة ✓" : "لم تتجاوز 70%"}
            </Text>
            {passed && (
              <Text style={s.resultNote}>جميع دروس الوحدة أصبحت مفتوحة الآن</Text>
            )}
          </View>

          {!passed && (
            <View style={s.attemptsBox}>
              <Text style={s.attemptsText}>
                المحاولة {result.attemptNumber} من 3
              </Text>
              {result.nextAttemptAt ? (
                <ExamTimer nextAttemptAt={result.nextAttemptAt} onReady={() => {}} />
              ) : (
                eligibility?.attemptsRemaining !== undefined && eligibility.attemptsRemaining <= 0
                  ? <Text style={s.limitText}>انتهت محاولات اليوم. عد غداً.</Text>
                  : <Text style={s.remainText}>يمكنك المحاولة مرة أخرى الآن</Text>
              )}
            </View>
          )}

          <Pressable style={s.primaryBtn} onPress={() => router.back()}>
            <Text style={s.primaryBtnText}>{passed ? "العودة للوحدة ←" : "العودة"}</Text>
          </Pressable>

          {!passed && result.nextAttemptAt === null && (eligibility?.attemptsToday ?? 0) < 3 && (
            <Pressable
              style={[s.primaryBtn, { backgroundColor: "#2d1f6e", marginTop: 10 }]}
              onPress={() => { setScreen("intro"); setResult(null); }}
            >
              <Text style={s.primaryBtnText}>حاول مرة أخرى</Text>
            </Pressable>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "intro") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-right" size={24} color="#94a3b8" />
          </Pressable>
        </View>
        <View style={s.center}>
          <View style={s.examIconWrap}>
            <Feather name="zap" size={40} color="#F59E0B" />
          </View>
          <Text style={s.bigTitle}>اختبار الوحدة</Text>
          <Text style={s.subText}>
            20 سؤال من جميع دروس الوحدة{"\n"}
            النجاح يتطلب 70% أو أكثر{"\n"}
            3 محاولات يومياً — 30 دقيقة بين كل محاولة
          </Text>
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statNum}>{eligibility?.attemptsRemaining ?? 3}</Text>
              <Text style={s.statLbl}>محاولة متبقية</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statNum}>70%</Text>
              <Text style={s.statLbl}>درجة النجاح</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statNum}>20</Text>
              <Text style={s.statLbl}>سؤال</Text>
            </View>
          </View>
          <Pressable
            style={[s.primaryBtn, { width: "100%" }, loadingQuestions && { opacity: 0.6 }]}
            onPress={handleStartExam}
            disabled={loadingQuestions}
          >
            {loadingQuestions
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>ابدأ الاختبار</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const current = questions[currentIdx];
  const answeredCount = Object.keys(selected).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => {
          showAlert({
            type: "confirm",
            title: "تأكيد",
            message: "هل تريد الخروج من الاختبار؟ ستُفقد إجاباتك.",
            buttons: [
              { text: "إلغاء", style: "cancel" },
              { text: "خروج", style: "destructive", onPress: () => router.back() },
            ],
          });
        }}>
          <Feather name="x" size={24} color="#94a3b8" />
        </Pressable>
        <View style={s.progressBarBg}>
          <View style={[s.progressBarFill, { width: `${(answeredCount / questions.length) * 100}%` }]} />
        </View>
        <Text style={s.progressText}>{currentIdx + 1} / {questions.length}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.qText}>{current.question}</Text>
        <View style={s.optionsList}>
          {current.options.map((opt, idx) => {
            const isSel = selected[current._id] === idx;
            return (
              <Pressable
                key={idx}
                style={[s.option, isSel && s.optionSel]}
                onPress={() => setSelected(p => ({ ...p, [current._id]: idx }))}
              >
                <View style={[s.radio, isSel && s.radioSel]}>
                  {isSel && <Feather name="check" size={12} color="#fff" />}
                </View>
                <Text style={[s.optText, isSel && s.optTextSel]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.navRow}>
          <Pressable
            style={[s.navBtn, currentIdx === 0 && s.navBtnOff]}
            onPress={() => setCurrentIdx(p => Math.max(0, p - 1))}
            disabled={currentIdx === 0}
          >
            <Feather name="arrow-right" size={18} color="#fff" />
            <Text style={s.navBtnText}>السابق</Text>
          </Pressable>

          {currentIdx < questions.length - 1 ? (
            <Pressable
              style={s.navBtn}
              onPress={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
            >
              <Text style={s.navBtnText}>التالي</Text>
              <Feather name="arrow-left" size={18} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={[s.submitBtn, (!allAnswered || submitting) && s.submitBtnOff]}
              onPress={handleSubmit}
              disabled={!allAnswered || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitBtnText}>إنهاء الاختبار</Text>}
            </Pressable>
          )}
        </View>

        <View style={s.dotsRow}>
          {questions.map((q, i) => (
            <Pressable key={q._id} onPress={() => setCurrentIdx(i)}>
              <View style={[
                s.dot,
                i === currentIdx && s.dotActive,
                selected[q._id] !== undefined && s.dotAnswered,
              ]} />
            </Pressable>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0a2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, gap: 16 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#2d1f6e" },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 8 },
  scroll: { padding: 20 },
  bigTitle: { fontSize: 24, fontWeight: "bold", color: "#ffffff", textAlign: "center", fontFamily: "Cairo_700Bold" },
  subText: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 22, fontFamily: "Cairo_400Regular" },
  timerWrap: { marginBottom: 8 },
  examIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 12, marginVertical: 8 },
  statBox: { flex: 1, backgroundColor: "#1a1040", borderRadius: 12, borderWidth: 1, borderColor: "#2d1f6e", padding: 12, alignItems: "center", gap: 4 },
  statNum: { fontSize: 20, fontWeight: "bold", color: "#6C63FF", fontFamily: "Cairo_700Bold" },
  statLbl: { fontSize: 11, color: "#94a3b8", textAlign: "center", fontFamily: "Cairo_400Regular" },
  primaryBtn: { backgroundColor: "#6C63FF", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, alignItems: "center", minWidth: 200 },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#ffffff", fontFamily: "Cairo_700Bold" },
  secondaryBtn: { backgroundColor: "#1a1040", borderRadius: 14, borderWidth: 1, borderColor: "#2d1f6e", paddingVertical: 14, paddingHorizontal: 32, alignItems: "center", minWidth: 200 },
  secondaryBtnText: { fontSize: 15, fontWeight: "600", color: "#94a3b8", fontFamily: "Cairo_400Regular" },
  progressBarBg: { height: 4, backgroundColor: "#2d1f6e", borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  progressBarFill: { height: "100%", backgroundColor: "#6C63FF", borderRadius: 2 },
  progressText: { fontSize: 12, color: "#94a3b8", textAlign: "center", fontFamily: "Cairo_400Regular" },
  qText: { fontSize: 17, fontWeight: "600", color: "#ffffff", textAlign: "right", lineHeight: 26, marginBottom: 20, fontFamily: "Cairo_700Bold" },
  optionsList: { gap: 10, marginBottom: 24 },
  option: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a1040", borderRadius: 12, borderWidth: 1, borderColor: "#2d1f6e", padding: 14, gap: 12 },
  optionSel: { borderColor: "#6C63FF", backgroundColor: "#6C63FF15" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#475569", alignItems: "center", justifyContent: "center" },
  radioSel: { borderColor: "#6C63FF", backgroundColor: "#6C63FF" },
  optText: { fontSize: 14, color: "#cbd5e1", flex: 1, textAlign: "right", fontFamily: "Cairo_400Regular" },
  optTextSel: { color: "#ffffff" },
  navRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  navBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#2d1f6e", borderRadius: 12, paddingVertical: 14 },
  navBtnOff: { opacity: 0.35 },
  navBtnText: { fontSize: 14, fontWeight: "600", color: "#ffffff", fontFamily: "Cairo_400Regular" },
  submitBtn: { flex: 1, backgroundColor: "#6C63FF", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitBtnOff: { opacity: 0.4 },
  submitBtnText: { fontSize: 14, fontWeight: "700", color: "#ffffff", fontFamily: "Cairo_700Bold" },
  dotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2d1f6e" },
  dotActive: { backgroundColor: "#6C63FF", transform: [{ scale: 1.4 }] },
  dotAnswered: { backgroundColor: "#22C55E" },
  resultCard: { backgroundColor: "#1a1040", borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", marginBottom: 20, gap: 8 },
  resultPct: { fontSize: 52, fontWeight: "bold", fontFamily: "Cairo_700Bold" },
  resultSub: { fontSize: 16, color: "#94a3b8", fontFamily: "Cairo_400Regular" },
  resultLabel: { fontSize: 16, fontWeight: "700", fontFamily: "Cairo_700Bold" },
  resultNote: { fontSize: 13, color: "#22C55E", textAlign: "center", fontFamily: "Cairo_400Regular" },
  attemptsBox: { backgroundColor: "#1a1040", borderRadius: 14, borderWidth: 1, borderColor: "#2d1f6e", padding: 16, marginBottom: 16, gap: 10, alignItems: "center" },
  attemptsText: { fontSize: 14, color: "#94a3b8", fontFamily: "Cairo_400Regular" },
  limitText: { fontSize: 13, color: "#EF4444", fontWeight: "600", fontFamily: "Cairo_400Regular" },
  remainText: { fontSize: 13, color: "#22C55E", fontWeight: "600", fontFamily: "Cairo_400Regular" },
});
