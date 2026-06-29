import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, Animated, Modal, FlatList, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { getStoredUser, type AuthUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS, STORAGE_KEYS } from "@/constants/config";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import type { Subject, Level, Unit } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonProgress {
  lessonId: string;
  watchedVideo: boolean;
  passedQuiz: boolean;
}

interface LessonItem {
  _id: string;
  title: string;
  order: number;
  isPublished: boolean;
  isFree: boolean;
}

interface UnitWithLessons extends Unit {
  lessons: LessonItem[];
  progress: LessonProgress[];
}

// ─── Pulse animation for "current" lesson node ────────────────────────────────

function PulseCircle({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);
  return (
    <Animated.View style={[styles.lessonNode, styles.lessonNodeCurrent, { backgroundColor: color, transform: [{ scale }] }]}>
      <Feather name="play" size={18} color="#fff" />
    </Animated.View>
  );
}

// ─── Single lesson node ───────────────────────────────────────────────────────

function LessonNode({
  lesson, status, onPress, primaryColor,
}: {
  lesson: LessonItem;
  status: "done" | "current" | "locked";
  onPress: () => void;
  primaryColor: string;
}) {
  if (status === "done") {
    return (
      <Pressable onPress={onPress} style={styles.lessonNodeWrap}>
        <View style={[styles.lessonNode, styles.lessonNodeDone, { backgroundColor: "#F59E0B" }]}>
          <Feather name="check" size={20} color="#fff" />
        </View>
        <Text style={styles.lessonNodeLabel} numberOfLines={1}>{lesson.title}</Text>
      </Pressable>
    );
  }
  if (status === "current") {
    return (
      <Pressable onPress={onPress} style={styles.lessonNodeWrap}>
        <PulseCircle color={primaryColor} />
        <Text style={[styles.lessonNodeLabel, { color: primaryColor, fontFamily: "Cairo_700Bold" }]} numberOfLines={1}>{lesson.title}</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.lessonNodeWrap}>
      <View style={[styles.lessonNode, styles.lessonNodeLocked]}>
        <Feather name="lock" size={16} color="#475569" />
      </View>
      <Text style={[styles.lessonNodeLabel, { color: "#475569" }]} numberOfLines={1}>{lesson.title}</Text>
    </View>
  );
}

// ─── Unit mountain card ────────────────────────────────────────────────────────

function UnitMountain({
  unit, index, onUnitPress, onLessonPress, primaryColor, onExamPress,
}: {
  unit: UnitWithLessons;
  index: number;
  onUnitPress: () => void;
  onLessonPress: (lessonId: string) => void;
  primaryColor: string;
  onExamPress?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const completedIds = new Set(
    unit.progress.filter((p) => p.watchedVideo && p.passedQuiz).map((p) => p.lessonId)
  );

  function getLessonStatus(lesson: LessonItem, idx: number): "done" | "current" | "locked" {
    if (completedIds.has(lesson._id)) return "done";
    for (let i = 0; i < idx; i++) {
      if (!completedIds.has(unit.lessons[i]._id)) return "locked";
    }
    return "current";
  }

  const unitDoneCount = unit.lessons.filter((l) => completedIds.has(l._id)).length;
  const unitTotal = unit.lessons.length;
  const unitPct = unitTotal > 0 ? Math.round((unitDoneCount / unitTotal) * 100) : 0;

  const chevronRotation = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.unitBlock}>
      {/* Mountain illustration */}
      <View style={styles.mountainWrap}>
        <Text style={styles.mountainEmoji}>🏔️</Text>
        <Text style={styles.flagEmoji}>🚩</Text>
      </View>

      {/* Unit pill — expand/collapse on press */}
      <Pressable style={[styles.unitPill, { backgroundColor: primaryColor }]} onPress={() => setExpanded((p) => !p)}>
        <Text style={styles.unitPillText} numberOfLines={1}>
          {String(index + 1).padStart(2, "0")}. {unit.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {unitPct === 100 && <Feather name="check-circle" size={14} color="#fff" />}
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <Feather name="chevron-down" size={16} color="#fff" />
          </Animated.View>
        </View>
      </Pressable>

      {/* Animated lesson nodes path */}
      <Animated.View
        style={{
          maxHeight: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 2000],
          }),
          overflow: "hidden",
        }}
      >
        {unit.lessons.length > 0 && (
          <View style={styles.lessonsPath}>
            {unit.lessons.map((lesson, lIdx) => {
              const status = getLessonStatus(lesson, lIdx);
              return (
                <View key={lesson._id}>
                  {lIdx > 0 && <View style={styles.dotConnector} />}
                  <LessonNode
                    lesson={lesson}
                    status={status}
                    onPress={() => status !== "locked" && onLessonPress(lesson._id)}
                    primaryColor={primaryColor}
                  />
                </View>
              );
            })}

            {/* Final exam pill */}
            {unit.examEnabled && onExamPress && (
              <Pressable style={[styles.examPill, { borderColor: primaryColor }]} onPress={onExamPress}>
                <Feather name="edit-3" size={16} color={primaryColor} />
                <Text style={[styles.examPillText, { color: primaryColor }]}>الامتحان النهائي</Text>
              </Pressable>
            )}
          </View>
        )}
      </Animated.View>

      {/* Connector to next unit */}
      <View style={styles.unitConnector} />
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function LearnScreen() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { colors } = useTheme();
  const primaryColor = "#6C63FF";

  const [user, setUser] = useState<AuthUser | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [unitsWithLessons, setUnitsWithLessons] = useState<UnitWithLessons[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const u = await getStoredUser();
        if (!u || cancelled) return;
        setUser(u);

        const collegeId = await SecureStore.getItemAsync(STORAGE_KEYS.COLLEGE_ID);
        if (!collegeId) return;

        const subRes = await apiFetch<Subject[]>(`${ENDPOINTS.SUBJECTS}?collegeId=${collegeId}`);
        if (!subRes.success || !subRes.data || cancelled) return;

        const subs = subRes.data;
        setSubjects(subs);

        const savedSubjectId = await SecureStore.getItemAsync("unique_subject_id");
        const subject = subs.find((s) => s._id === savedSubjectId) ?? subs[0] ?? null;
        if (subject) {
          setSelectedSubject(subject);
          await loadLevels(subject._id, cancelled);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []));

  async function loadLevels(subjectId: string, cancelled = false) {
    const lvlRes = await apiFetch<Level[]>(`${ENDPOINTS.LEVELS}?subjectId=${subjectId}`);
    if (lvlRes.success && lvlRes.data && !cancelled) {
      const published = lvlRes.data.filter((l) => l.isPublished || l.comingSoon);
      setLevels(published);
      const savedLevelId = await SecureStore.getItemAsync("unique_level_id");
      const level = published.find((l) => l._id === savedLevelId) ?? published[0] ?? null;
      if (level) {
        setSelectedLevel(level);
        if (!cancelled) await loadUnits(level._id);
      }
    }
  }

  async function loadUnits(levelId: string) {
    setLoadingUnits(true);
    try {
      const unitRes = await apiFetch<Unit[]>(`${ENDPOINTS.UNITS}?levelId=${levelId}`);
      if (!unitRes.success || !unitRes.data) return;
      const units = unitRes.data.filter((u) => u.isPublished || u.comingSoon);

      const enriched = await Promise.all(
        units.map(async (unit): Promise<UnitWithLessons> => {
          try {
            const [lessonRes, progressRes] = await Promise.all([
              apiFetch<LessonItem[]>(`${ENDPOINTS.TOPICS}?unitId=${unit._id}`),
              apiFetch<LessonProgress[]>(`${ENDPOINTS.PROGRESS_LESSON}?unitId=${unit._id}`),
            ]);
            return {
              ...unit,
              lessons: (lessonRes.data ?? []).filter((l) => l.isPublished).sort((a, b) => a.order - b.order),
              progress: progressRes.data ?? [],
            };
          } catch {
            return { ...unit, lessons: [], progress: [] };
          }
        })
      );
      setUnitsWithLessons(enriched);
    } finally {
      setLoadingUnits(false);
    }
  }

  async function selectSubject(subject: Subject) {
    setSelectedSubject(subject);
    setShowSubjectModal(false);
    await SecureStore.setItemAsync("unique_subject_id", subject._id);
    setLevels([]);
    setUnitsWithLessons([]);
    setSelectedLevel(null);
    await loadLevels(subject._id);
  }

  async function selectLevel(level: Level) {
    setSelectedLevel(level);
    setShowLevelModal(false);
    await SecureStore.setItemAsync("unique_level_id", level._id);
    await loadUnits(level._id);
  }

  const totalUnits = unitsWithLessons.length;
  const completedUnits = unitsWithLessons.filter((u) => {
    if (u.lessons.length === 0) return false;
    const done = new Set(u.progress.filter((p) => p.watchedVideo && p.passedQuiz).map((p) => p.lessonId));
    return u.lessons.every((l) => done.has(l._id));
  }).length;
  const levelPct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  const initial = (user?.name ?? "?")[0];

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.subjectPicker} onPress={() => setShowSubjectModal(true)}>
          <Text style={[styles.subjectPickerText, { color: colors.text }]} numberOfLines={1}>
            {selectedSubject ? (lang === "ar" ? selectedSubject.nameAr || selectedSubject.name : selectedSubject.nameEn || selectedSubject.name) : (lang === "ar" ? "اختر المادة" : "Select subject")}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={[styles.avatarBtn, { backgroundColor: primaryColor }]} onPress={() => router.push("/(app)/(tabs)/profile" as any)}>
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>

      {/* ── Level selector + progress ── */}
      {selectedLevel && (
        <View style={[styles.levelBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable style={styles.levelPicker} onPress={() => setShowLevelModal(true)}>
            <Text style={[styles.levelPickerText, { color: colors.text }]} numberOfLines={1}>
              {lang === "ar" ? selectedLevel.title : selectedLevel.titleEn || selectedLevel.title}
            </Text>
            <Feather name="chevron-down" size={14} color={colors.textSecondary} />
          </Pressable>
          <View style={[styles.levelProgressBg, { backgroundColor: colors.border }]}>
            <View style={[styles.levelProgressFill, { width: `${levelPct}%`, backgroundColor: primaryColor }]} />
          </View>
          <Text style={[styles.levelPct, { color: colors.textSecondary }]}>{levelPct}%</Text>
        </View>
      )}

      {/* ── Units path ── */}
      {loadingUnits ? (
        <View style={styles.center}>
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : unitsWithLessons.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {lang === "ar" ? "لا توجد وحدات منشورة بعد" : "No units published yet"}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.pathScroll} showsVerticalScrollIndicator={false}>
          {unitsWithLessons.map((unit, idx) => (
            <UnitMountain
              key={unit._id}
              unit={unit}
              index={idx}
              primaryColor={primaryColor}
              onUnitPress={() => {}}
              onLessonPress={(lessonId) => router.push(`/(app)/lesson/${lessonId}` as any)}
              onExamPress={unit.examEnabled ? () => router.push(`/(app)/unit/${unit._id}` as any) : undefined}
            />
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* ── Subject picker modal ── */}
      <Modal visible={showSubjectModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowSubjectModal(false)} />
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setShowSubjectModal(false)}>
              <Feather name="x" size={22} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>اختر المادة</Text>
            <View style={{ width: 22 }} />
          </View>
          <FlatList
            data={subjects}
            keyExtractor={(s) => s._id}
            contentContainerStyle={styles.subjectList}
            renderItem={({ item }) => {
              const isSelected = item._id === selectedSubject?._id;
              const accentColor = item.color || primaryColor;

              let totalLessons = 0;
              let completedLessons = 0;
              if (isSelected && unitsWithLessons.length > 0) {
                totalLessons = unitsWithLessons.reduce((sum, u) => sum + u.lessons.length, 0);
                completedLessons = unitsWithLessons.reduce((sum, u) => {
                  const done = new Set(u.progress.filter(p => p.watchedVideo && p.passedQuiz).map(p => p.lessonId));
                  return sum + u.lessons.filter(l => done.has(l._id)).length;
                }, 0);
              }
              const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

              return (
                <Pressable
                  style={[
                    styles.subjectCard,
                    {
                      backgroundColor: isSelected ? accentColor + "30" : colors.card,
                      borderColor: isSelected ? accentColor : colors.border,
                    },
                  ]}
                  onPress={() => selectSubject(item)}
                >
                  <View style={styles.subjectCardLeft}>
                    <Text style={[styles.subjectName, { color: colors.text }]}>
                      {item.nameAr || item.name}
                    </Text>
                    <Text style={[styles.subjectNameEn, { color: colors.textSecondary }]}>
                      {item.nameEn || item.name}
                    </Text>
                    {isSelected && totalLessons > 0 && (
                      <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressBarFill, { width: `${progressPct}%` as any, backgroundColor: accentColor }]} />
                      </View>
                    )}
                  </View>
                  <View style={[styles.radioCircle, { borderColor: isSelected ? accentColor : colors.border }]}>
                    {isSelected && <View style={[styles.radioFill, { backgroundColor: accentColor }]} />}
                  </View>
                </Pressable>
              );
            }}
          />
          <Pressable style={styles.changeCollegeLink} onPress={() => { setShowSubjectModal(false); router.push("/college-picker" as any); }}>
            <Text style={[styles.changeCollegeText, { color: colors.textTertiary }]}>
              {lang === "ar" ? "هل تريد تغيير كليتك؟" : "Change your college?"}
            </Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── Level picker modal ── */}
      <Modal visible={showLevelModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowLevelModal(false)} />
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {lang === "ar" ? "اختر المستوى" : "Choose Level"}
          </Text>
          <FlatList
            data={levels}
            keyExtractor={(l) => l._id}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.sheetItem, { borderBottomColor: colors.border }, item._id === selectedLevel?._id && { backgroundColor: primaryColor + "20" }]}
                onPress={() => selectLevel(item)}
              >
                <Text style={[styles.sheetItemText, { color: colors.text }, item._id === selectedLevel?._id && { color: primaryColor, fontFamily: "Cairo_700Bold" }]}>
                  {lang === "ar" ? item.title : item.titleEn || item.title}
                </Text>
                {item._id === selectedLevel?._id && <Feather name="check" size={18} color={primaryColor} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  emptyText: { fontSize: 15, textAlign: "center", fontFamily: "Cairo_400Regular", marginTop: 12 },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  subjectPicker: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  subjectPickerText: { fontSize: 16, fontFamily: "Cairo_700Bold", flex: 1 },
  avatarBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 16, fontFamily: "Cairo_700Bold" },

  levelBar: {
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  levelPicker: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  levelPickerText: { fontSize: 14, fontFamily: "Cairo_700Bold", flex: 1 },
  levelProgressBg: { height: 6, borderRadius: 3, width: 80, overflow: "hidden" },
  levelProgressFill: { height: "100%", borderRadius: 3 },
  levelPct: { fontSize: 12, fontFamily: "Cairo_400Regular", minWidth: 36, textAlign: "right" },

  pathScroll: { paddingTop: 20, paddingHorizontal: 0, alignItems: "center" },

  unitBlock: { width: "100%", alignItems: "center", paddingHorizontal: 24 },
  mountainWrap: { position: "relative", width: 80, height: 70, alignItems: "center", justifyContent: "flex-end" },
  mountainEmoji: { fontSize: 52 },
  flagEmoji: { position: "absolute", top: 0, right: 14, fontSize: 18 },
  unitPill: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30,
    width: "90%", alignItems: "center", flexDirection: "row",
    justifyContent: "center", marginTop: 4,
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6,
  },
  unitPillText: { color: "#fff", fontSize: 15, fontFamily: "Cairo_700Bold", textAlign: "center" },
  unitConnector: { width: 2, height: 40, backgroundColor: "#2d1f6e", marginVertical: 4 },

  lessonsPath: { alignItems: "center", marginTop: 8, width: "100%" },
  dotConnector: { width: 2, height: 24, backgroundColor: "#2d1f6e", alignSelf: "center" },
  lessonNodeWrap: { alignItems: "center", gap: 6, paddingVertical: 2 },
  lessonNode: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  lessonNodeDone: {},
  lessonNodeCurrent: {},
  lessonNodeLocked: { backgroundColor: "#1e1b3a", borderWidth: 2, borderColor: "#2d1f6e" },
  lessonNodeLabel: { fontSize: 12, color: "#94a3b8", textAlign: "center", fontFamily: "Cairo_400Regular", maxWidth: 200 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  bottomSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: 40, maxHeight: "75%",
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: "Cairo_700Bold", textAlign: "center", marginBottom: 8, paddingHorizontal: 20 },
  sheetItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  sheetItemText: { fontSize: 16, fontFamily: "Cairo_400Regular", flex: 1 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 8 },
  subjectList: { paddingHorizontal: 16, paddingBottom: 8 },
  subjectCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 10,
  },
  subjectCardLeft: { flex: 1, gap: 4 },
  subjectName: { fontSize: 16, fontFamily: "Cairo_700Bold", textAlign: "right" },
  subjectNameEn: { fontSize: 12, fontFamily: "Cairo_400Regular", textAlign: "right" },
  progressBarBg: { height: 4, borderRadius: 2, marginTop: 6, width: "100%", overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 2 },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioFill: { width: 14, height: 14, borderRadius: 7 },
  changeCollegeLink: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  changeCollegeText: { fontSize: 13, fontFamily: "Cairo_400Regular" },

  examPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24,
    borderWidth: 1.5, marginTop: 16, alignSelf: "center",
  },
  examPillText: { fontSize: 14, fontFamily: "Cairo_700Bold" },
});
