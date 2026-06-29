import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, TextInput, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import VideoPlayer from "@/components/learning/VideoPlayer";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";
import type { Lesson, Question, QuizResult } from "@/lib/types";
import { showAlert } from "@/lib/ui/AlertModal";

type Phase = "loading" | "video" | "quiz" | "result";

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [videoWatched, setVideoWatched] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showVocab, setShowVocab] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    async function load() {
      try {
        // Fetch lesson data
        const res = await apiFetch<Lesson>(`/api/topics/${id}`);
        if (cancelled || !res.success || !res.data) return;
        setLesson(res.data);

        // Fetch questions (server strips correctAnswer)
        if (res.data.slug) {
          const qRes = await apiFetch<Question[]>(`/api/questions/${res.data.slug}`);
          if (!cancelled && qRes.success && qRes.data) setQuestions(qRes.data);
        }
      } catch {
        // stay on loading — let user pull to retry (future improvement)
      } finally {
        if (!cancelled) setPhase("video");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]));

  async function markVideoWatched() {
    if (!lesson) return;
    setVideoWatched(true);
    // Fire-and-forget progress update — don't block the UI
    apiFetch("/api/progress/lesson", {
      method: "POST",
      body: {
        lessonId: lesson._id,
        unitId: lesson.unitId ?? "",
        subjectId: lesson.subjectId,
        action: "watched",
      },
    }).catch(() => {});
  }

  async function handleSubmitQuiz() {
    if (!lesson || submitting) return;
    const allAnswered = questions.every(q => selected[q._id] !== undefined);
    if (!allAnswered) {
      showAlert({ type: "warning", title: "تنبيه", message: "يرجى الإجابة على جميع الأسئلة" });
      return;
    }
    setSubmitting(true);
    try {
      const answers = questions.map(q => ({ questionId: q._id, selected: selected[q._id] }));
      const res = await apiFetch<QuizResult>(`/api/questions/${lesson.slug}/submit`, {
        method: "POST",
        body: { answers },
      });
      if (res.success && res.data) {
        // Mark quiz progress on server if passed (percentage >= 70)
        if (res.data.percentage >= 70) {
          await apiFetch("/api/progress/lesson", {
            method: "POST",
            body: {
              lessonId: lesson._id,
              unitId: lesson.unitId ?? "",
              subjectId: lesson.subjectId,
              action: "passed",
              score: res.data.percentage,
            },
          }).catch(() => {});
        }
        setResult(res.data);
        setPhase("result");
      }
    } catch {
      showAlert({ type: "error", title: "خطأ", message: "حدث خطأ في تصحيح الاختبار، حاول مرة أخرى" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAskAi() {
    if (!lesson || !aiQuestion.trim() || aiLoading) return;
    setAiLoading(true);
    setAiAnswer("");
    setAiError("");
    try {
      const res = await apiFetch<{ answer: string }>(ENDPOINTS.AI_LESSON, {
        method: "POST",
        body: { lessonId: lesson._id, question: aiQuestion.trim() },
      });
      if (res.success && res.data) {
        setAiAnswer(res.data.answer);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "حدث خطأ، حاول مرة أخرى");
    } finally {
      setAiLoading(false);
    }
  }

  if (phase === "loading" || !lesson) {
    return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color="#6C63FF" size="large" /></View></SafeAreaView>;
  }

  // ─── RESULT SCREEN ───────────────────────────────────────
  if (phase === "result" && result) {
    const passed = result.percentage >= 70;
    const scoreColor = passed ? "#22C55E" : result.percentage >= 50 ? "#F59E0B" : "#EF4444";
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-right" size={24} color="#94a3b8" />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.resultCard, { borderColor: scoreColor + "40" }]}>
            <Feather name={passed ? "award" : "refresh-cw"} size={40} color={scoreColor} />
            <Text style={[s.resultScore, { color: scoreColor }]}>{result.percentage}%</Text>
            <Text style={s.resultSub}>{result.score} / {result.total} صحيح</Text>
            <Text style={[s.resultLabel, { color: scoreColor }]}>
              {passed ? "أحسنت! الدرس مكتمل ✓" : "لم تتجاوز 70%، حاول مرة أخرى"}
            </Text>
          </View>

          {result.answers.map((a, i) => (
            <View key={a.questionId} style={[s.ansCard, { borderColor: a.isCorrect ? "#22C55E30" : "#EF444430" }]}>
              <View style={s.ansHeader}>
                <Feather name={a.isCorrect ? "check-circle" : "x-circle"} size={18} color={a.isCorrect ? "#22C55E" : "#EF4444"} />
                <Text style={s.ansNum}>سؤال {i + 1}</Text>
              </View>
              <Text style={s.ansQ}>{a.question}</Text>
              <Text style={s.ansCorrect}>✓ {a.options[a.correct]}</Text>
              {!a.isCorrect && <Text style={s.ansWrong}>✗ {a.options[a.selected]}</Text>}
              {a.explanation ? <Text style={s.ansExp}>{a.explanation}</Text> : null}
            </View>
          ))}

          <Pressable style={s.doneBtn} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>{passed ? "التالي ←" : "العودة"}</Text>
          </Pressable>

          {phase === "result" && (
            <Pressable
              style={[s.aiFloat, { position: "relative", alignSelf: "center", marginTop: 8, marginBottom: 24 }]}
              onPress={() => {
                setAiQuestion("");
                setAiAnswer("");
                setAiError("");
                setShowAiModal(true);
              }}
            >
              <Text style={s.aiFloatIcon}>✨</Text>
              <Text style={s.aiFloatText}>راجع مع AI</Text>
            </Pressable>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── QUIZ SCREEN ───────────────────────────────────────
  if (phase === "quiz") {
    const q = questions[currentQ];
    const answeredCount = Object.keys(selected).length;
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => setPhase("video")}>
            <Feather name="arrow-right" size={24} color="#94a3b8" />
          </Pressable>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${(answeredCount / questions.length) * 100}%` }]} />
          </View>
          <Text style={s.progressText}>{currentQ + 1} / {questions.length}</Text>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.qText}>{q.question}</Text>
          <View style={s.optionsList}>
            {q.options.map((opt, idx) => {
              const isSel = selected[q._id] === idx;
              return (
                <Pressable key={idx} style={[s.option, isSel && s.optionSel]} onPress={() => setSelected(p => ({ ...p, [q._id]: idx }))}>
                  <View style={[s.radio, isSel && s.radioSel]}>
                    {isSel && <Feather name="check" size={12} color="#fff" />}
                  </View>
                  <Text style={[s.optText, isSel && s.optTextSel]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.navRow}>
            <Pressable style={[s.navBtn, currentQ === 0 && s.navBtnOff]} onPress={() => setCurrentQ(p => Math.max(0, p - 1))} disabled={currentQ === 0}>
              <Feather name="arrow-right" size={18} color="#fff" /><Text style={s.navBtnText}>السابق</Text>
            </Pressable>
            {currentQ < questions.length - 1
              ? <Pressable style={s.navBtn} onPress={() => setCurrentQ(p => p + 1)}><Text style={s.navBtnText}>التالي</Text><Feather name="arrow-left" size={18} color="#fff" /></Pressable>
              : <Pressable style={[s.submitBtn, (answeredCount < questions.length || submitting) && s.submitOff]} onPress={handleSubmitQuiz} disabled={answeredCount < questions.length || submitting}>
                  <Text style={s.submitText}>{submitting ? "جاري التصحيح..." : "إنهاء الاختبار"}</Text>
                </Pressable>
            }
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── VIDEO + SUMMARY SCREEN ───────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-right" size={24} color="#94a3b8" />
        </Pressable>
        <Text style={s.title}>{lesson.title}</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {lesson.videoUrl ? (
          <View style={s.videoWrapper}>
            <VideoPlayer
              videoUrl={lesson.videoUrl}
              videoType={lesson.videoType ?? "youtube"}
              onWatched={() => {
                setVideoFinished(true);
                markVideoWatched();
              }}
            />
            {videoFinished && (
              <View style={s.videoDoneBadge}>
                <Feather name="check-circle" size={16} color="#22C55E" />
                <Text style={s.videoDoneText}>تم مشاهدة الفيديو ✓</Text>
              </View>
            )}
          </View>
        ) : null}

        {lesson.summaryText ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ملخص الدرس</Text>
            <Text style={s.summaryText}>{lesson.summaryText}</Text>
          </View>
        ) : null}

        {lesson.keyPoints.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>النقاط الرئيسية</Text>
            {lesson.keyPoints.map((pt, i) => (
              <View key={i} style={s.pointRow}>
                <Feather name="check-circle" size={15} color="#22C55E" />
                <Text style={s.pointText}>{pt}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {lesson.vocabulary.length > 0 ? (
          <View style={s.section}>
            <Pressable style={s.vocabHeader} onPress={() => setShowVocab(p => !p)}>
              <Text style={s.sectionTitle}>المفردات ({lesson.vocabulary.length})</Text>
              <Feather name={showVocab ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
            </Pressable>
            {showVocab && lesson.vocabulary.map((v, i) => (
              <View key={i} style={s.vocabCard}>
                <Text style={s.vocabWord}>{v.word}</Text>
                <Text style={s.vocabDef}>{v.definition}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {lesson && (
          <Pressable
            style={s.noteBtn}
            onPress={() => router.push({
              pathname: "/(app)/notes/[id]",
              params: { id: "new", lessonId: lesson._id, lessonTitle: lesson.title }
            } as any)}
          >
            <Feather name="edit" size={18} color="#06B6D4" />
            <Text style={s.noteBtnText}>إضافة ملاحظة</Text>
          </Pressable>
        )}

        {questions.length > 0 ? (
          <Pressable
            style={[s.quizBtn, !videoWatched && s.quizBtnOff]}
            onPress={() => {
              if (videoWatched) setPhase("quiz");
              else showAlert({ type: "warning", title: "تنبيه", message: "شاهد الفيديو أولاً قبل بدء الاختبار" });
            }}
          >
            <Feather name="edit-3" size={20} color={videoWatched ? "#fff" : "#475569"} />
            <Text style={[s.quizBtnText, !videoWatched && s.quizBtnTextOff]}>
              {videoWatched ? "ابدأ الاختبار" : "شاهد الفيديو أولاً"}
            </Text>
          </Pressable>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Floating AI button — only during video/summary phase */}
      {phase === "video" && lesson && (
        <Pressable
          style={s.aiFloat}
          onPress={() => {
            setAiQuestion("");
            setAiAnswer("");
            setAiError("");
            setShowAiModal(true);
          }}
        >
          <Text style={s.aiFloatIcon}>✨</Text>
          <Text style={s.aiFloatText}>اسأل AI</Text>
        </Pressable>
      )}

      {/* AI Assistant Modal */}
      <Modal
        visible={showAiModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAiModal(false)}
      >
        <Pressable style={s.aiModalOverlay} onPress={() => setShowAiModal(false)} />
        <View style={s.aiModalSheet}>
          <View style={s.aiHandle} />

          <View style={s.aiModalHeader}>
            <Text style={s.aiModalTitle}>✨ اسأل الذكاء الاصطناعي</Text>
            <Pressable onPress={() => setShowAiModal(false)}>
              <Feather name="x" size={22} color="#94a3b8" />
            </Pressable>
          </View>

          <Text style={s.aiModalSub}>سؤالك عن: {lesson?.title}</Text>

          {aiAnswer ? (
            <ScrollView style={s.aiAnswerScroll} showsVerticalScrollIndicator={false}>
              <View style={s.aiAnswerBox}>
                <Text style={s.aiAnswerText}>{aiAnswer}</Text>
              </View>
            </ScrollView>
          ) : aiError ? (
            <View style={s.aiAnswerBox}>
              <Text style={[s.aiAnswerText, { color: "#EF4444" }]}>{aiError}</Text>
            </View>
          ) : (
            <View style={s.aiEmptyBox}>
              <Text style={s.aiEmptyText}>اكتب سؤالك عن الدرس وسأجيبك فوراً 🧠</Text>
            </View>
          )}

          <View style={s.aiInputRow}>
            <TextInput
              style={s.aiInput}
              value={aiQuestion}
              onChangeText={setAiQuestion}
              placeholder="اكتب سؤالك هنا..."
              placeholderTextColor="#475569"
              multiline
              maxLength={500}
              textAlign="right"
              editable={!aiLoading}
            />
            <Pressable
              style={[s.aiSendBtn, (!aiQuestion.trim() || aiLoading) && s.aiSendBtnOff]}
              onPress={handleAskAi}
              disabled={!aiQuestion.trim() || aiLoading}
            >
              {aiLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Feather name="send" size={18} color="#fff" />
              }
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0a2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#2d1f6e" },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "bold", color: "#ffffff", textAlign: "right", fontFamily: "Cairo_700Bold" },
  scroll: { padding: 20 },
  videoWrapper: { marginBottom: 24, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" },
  videoDoneBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(34,197,94,0.1)", padding: 10, borderRadius: 8, marginTop: 8 },
  videoDoneText: { fontSize: 13, color: "#22C55E", fontWeight: "600", fontFamily: "Cairo_400Regular" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "bold", color: "#ffffff", textAlign: "right", marginBottom: 12, fontFamily: "Cairo_700Bold" },
  summaryText: { fontSize: 14, color: "#cbd5e1", textAlign: "right", lineHeight: 22, fontFamily: "Cairo_400Regular" },
  pointRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  pointText: { fontSize: 14, color: "#cbd5e1", flex: 1, textAlign: "right", lineHeight: 20, fontFamily: "Cairo_400Regular" },
  vocabHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  vocabCard: { backgroundColor: "#1a1040", borderRadius: 10, borderWidth: 1, borderColor: "#2d1f6e", padding: 12, marginBottom: 8 },
  vocabWord: { fontSize: 14, fontWeight: "700", color: "#6C63FF", textAlign: "right", marginBottom: 3, fontFamily: "Cairo_700Bold" },
  vocabDef: { fontSize: 13, color: "#cbd5e1", textAlign: "right", fontFamily: "Cairo_400Regular" },
  noteBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "rgba(6,182,212,0.1)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(6,182,212,0.3)", marginBottom: 12 },
  noteBtnText: { fontSize: 14, fontWeight: "600", color: "#06B6D4", fontFamily: "Cairo_400Regular" },
  quizBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#6C63FF", borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  quizBtnOff: { backgroundColor: "#1a1040", borderWidth: 1, borderColor: "#2d1f6e" },
  quizBtnText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: "Cairo_700Bold" },
  quizBtnTextOff: { color: "#475569" },
  progressBarBg: { height: 4, backgroundColor: "#2d1f6e", borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  progressBarFill: { height: "100%", backgroundColor: "#6C63FF", borderRadius: 2 },
  progressText: { fontSize: 12, color: "#94a3b8", textAlign: "center", fontFamily: "Cairo_400Regular" },
  qText: { fontSize: 17, fontWeight: "600", color: "#fff", textAlign: "right", lineHeight: 26, marginBottom: 20, fontFamily: "Cairo_700Bold" },
  optionsList: { gap: 10, marginBottom: 28 },
  option: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a1040", borderRadius: 12, borderWidth: 1, borderColor: "#2d1f6e", padding: 14, gap: 12 },
  optionSel: { borderColor: "#6C63FF", backgroundColor: "#6C63FF15" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#475569", alignItems: "center", justifyContent: "center" },
  radioSel: { borderColor: "#6C63FF", backgroundColor: "#6C63FF" },
  optText: { fontSize: 14, color: "#cbd5e1", flex: 1, textAlign: "right", fontFamily: "Cairo_400Regular" },
  optTextSel: { color: "#fff" },
  navRow: { flexDirection: "row", gap: 12 },
  navBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#2d1f6e", borderRadius: 12, paddingVertical: 14 },
  navBtnOff: { opacity: 0.4 },
  navBtnText: { fontSize: 14, fontWeight: "600", color: "#fff", fontFamily: "Cairo_400Regular" },
  submitBtn: { flex: 1, backgroundColor: "#6C63FF", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitOff: { opacity: 0.4 },
  submitText: { fontSize: 14, fontWeight: "700", color: "#fff", fontFamily: "Cairo_700Bold" },
  resultCard: { backgroundColor: "#1a1040", borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", marginBottom: 20, gap: 6 },
  resultScore: { fontSize: 48, fontWeight: "bold", fontFamily: "Cairo_700Bold" },
  resultSub: { fontSize: 16, color: "#94a3b8", fontFamily: "Cairo_400Regular" },
  resultLabel: { fontSize: 15, fontWeight: "600", fontFamily: "Cairo_400Regular" },
  ansCard: { backgroundColor: "#1a1040", borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  ansHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  ansNum: { fontSize: 13, color: "#94a3b8", fontWeight: "600", fontFamily: "Cairo_400Regular" },
  ansQ: { fontSize: 14, color: "#fff", textAlign: "right", marginBottom: 8, fontFamily: "Cairo_400Regular" },
  ansCorrect: { fontSize: 13, color: "#22C55E", textAlign: "right", fontFamily: "Cairo_400Regular" },
  ansWrong: { fontSize: 13, color: "#EF4444", textAlign: "right", marginTop: 2, fontFamily: "Cairo_400Regular" },
  ansExp: { fontSize: 12, color: "#94a3b8", textAlign: "right", marginTop: 6, lineHeight: 18, fontFamily: "Cairo_400Regular" },
  doneBtn: { backgroundColor: "#6C63FF", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  doneBtnText: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Cairo_700Bold" },

  aiFloat: {
    position: "absolute",
    bottom: 100,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 50,
  },
  aiFloatIcon: { fontSize: 16 },
  aiFloatText: { fontSize: 14, fontWeight: "700", color: "#fff", fontFamily: "Cairo_700Bold" },

  aiModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  aiModalSheet: {
    backgroundColor: "#1a1040",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "#2d1f6e",
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "75%",
  },
  aiHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#2d1f6e",
    alignSelf: "center",
    marginTop: 12, marginBottom: 16,
  },
  aiModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  aiModalTitle: {
    fontSize: 17, fontWeight: "700", color: "#fff",
    fontFamily: "Cairo_700Bold",
  },
  aiModalSub: {
    fontSize: 12, color: "#94a3b8",
    textAlign: "right",
    marginBottom: 14,
    fontFamily: "Cairo_400Regular",
  },
  aiAnswerScroll: { maxHeight: 200, marginBottom: 12 },
  aiAnswerBox: {
    backgroundColor: "#0f0a2e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2d1f6e",
    padding: 14,
    marginBottom: 12,
  },
  aiAnswerText: {
    fontSize: 14, color: "#cbd5e1",
    textAlign: "right",
    lineHeight: 22,
    fontFamily: "Cairo_400Regular",
  },
  aiEmptyBox: {
    paddingVertical: 24,
    alignItems: "center",
    marginBottom: 12,
  },
  aiEmptyText: {
    fontSize: 13, color: "#475569",
    textAlign: "center",
    fontFamily: "Cairo_400Regular",
  },
  aiInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
    marginTop: 8,
  },
  aiInput: {
    flex: 1,
    backgroundColor: "#0f0a2e",
    borderWidth: 1,
    borderColor: "#2d1f6e",
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: "#fff",
    maxHeight: 100,
    fontFamily: "Cairo_400Regular",
    textAlignVertical: "top",
  },
  aiSendBtn: {
    width: 46, height: 46,
    borderRadius: 23,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
  },
  aiSendBtnOff: { backgroundColor: "#2d1f6e" },
});
