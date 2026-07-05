import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, Animated, FlatList, Alert,
  Linking, Image, RefreshControl, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { getStoredUser, type AuthUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS, STORAGE_KEYS } from "@/constants/config";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { cacheGet, cacheSet } from "@/lib/cache";
import { isOnline } from "@/lib/offline";
import BottomSheet from "@/components/ui/BottomSheet";
import type { Subject, Level, Unit, Announcement } from "@/lib/types";

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

const SUBJECT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  'رياضيات': 'hash',
  'math': 'hash',
  'فيزياء': 'zap',
  'physics': 'zap',
  'كيمياء': 'droplet',
  'chemistry': 'droplet',
  'أحياء': 'activity',
  'biology': 'activity',
  'عربي': 'book-open',
  'arabic': 'book-open',
  'لغة عربية': 'book-open',
  'انجليزي': 'globe',
  'english': 'globe',
  'لغة انجليزية': 'globe',
  'تاريخ': 'clock',
  'history': 'clock',
  'جغرافيا': 'map-pin',
  'geography': 'map-pin',
  'تربية اسلامية': 'moon',
  'islamic': 'moon',
  'حاسوب': 'monitor',
  'computer': 'monitor',
  'فلسفة': 'message-circle',
  'philosophy': 'message-circle',
  'علم نفس': 'heart',
  'psychology': 'heart',
  'اجتماع': 'users',
  'sociology': 'users',
  'قانون': 'shield',
  'law': 'shield',
  'اقتصاد': 'trending-up',
  'economics': 'trending-up',
  'هندسة': 'tool',
  'engineering': 'tool',
  'طب': 'heart',
  'medicine': 'heart',
  'صيدلة': 'activity',
  'pharmacy': 'activity',
};

function getSubjectIcon(name: string): keyof typeof Feather.glyphMap {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SUBJECT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return 'book';
}

function getSubjectEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('رياضيات') || lower.includes('math')) return '📐';
  if (lower.includes('فيزياء') || lower.includes('physics')) return '⚛️';
  if (lower.includes('كيمياء') || lower.includes('chemistry')) return '🧪';
  if (lower.includes('أحياء') || lower.includes('biology')) return '🧬';
  if (lower.includes('عربي') || lower.includes('arabic')) return '📖';
  if (lower.includes('انجليزي') || lower.includes('english')) return '🌍';
  if (lower.includes('تاريخ') || lower.includes('history')) return '🏛️';
  if (lower.includes('جغرافيا') || lower.includes('geography')) return '🌏';
  if (lower.includes('اسلامية') || lower.includes('islamic')) return '🕌';
  if (lower.includes('حاسوب') || lower.includes('computer')) return '💻';
  if (lower.includes('فلسفة') || lower.includes('philosophy')) return '🤔';
  if (lower.includes('قانون') || lower.includes('law')) return '⚖️';
  if (lower.includes('هندسة') || lower.includes('engineer')) return '🔧';
  if (lower.includes('طب') || lower.includes('medic')) return '🏥';
  if (lower.includes('صيدلة') || lower.includes('pharmacy')) return '💊';
  return '📚';
}

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
      <View style={styles.mountainWrap}>
        <Text style={styles.mountainEmoji}>🏔️</Text>
        <Text style={styles.flagEmoji}>🚩</Text>
      </View>

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

            {unit.examEnabled && onExamPress && (
              <Pressable style={[styles.examPill, { borderColor: primaryColor }]} onPress={onExamPress}>
                <Feather name="edit-3" size={16} color={primaryColor} />
                <Text style={[styles.examPillText, { color: primaryColor }]}>الامتحان النهائي</Text>
              </Pressable>
            )}
          </View>
        )}
      </Animated.View>

      <View style={styles.unitConnector} />
    </View>
  );
}

const ANN_COLORS = {
  info:    { color:"#6C63FF", bg:"#6C63FF18", border:"#6C63FF35", icon:"info" as const },
  promo:   { color:"#F59E0B", bg:"#F59E0B18", border:"#F59E0B35", icon:"gift" as const },
  warning: { color:"#EF4444", bg:"#EF444418", border:"#EF444435", icon:"alert-triangle" as const },
  success: { color:"#22C55E", bg:"#22C55E18", border:"#22C55E35", icon:"check-circle" as const },
};

function AnnouncementBanner({ announcement, lang, onDismiss }: { announcement: Announcement; lang: string; onDismiss: () => void }) {
  const theme = ANN_COLORS[announcement.type] ?? ANN_COLORS.info;
  const title = lang === "ar" ? announcement.titleAr : announcement.titleEn;
  const body = lang === "ar" ? announcement.bodyAr : announcement.bodyEn;
  const ctaText = lang === "ar" ? announcement.ctaTextAr : announcement.ctaTextEn;
  const hasImage = !!announcement.imageUrl;
  return (
    <View style={[annS.wrap, { backgroundColor:hasImage ? theme.color+"10" : theme.bg, borderColor:theme.border }]}>
      <View style={[annS.accent, { backgroundColor:theme.color }]} />
      {hasImage && (
        <View style={annS.imageWrap}>
          <Image source={{ uri:announcement.imageUrl! }} style={annS.image} resizeMode="cover" />
          <View style={[annS.imageOverlay, { backgroundColor:theme.color+"80" }]} />
        </View>
      )}
      <View style={annS.content}>
        <View style={annS.topRow}>
          <Pressable onPress={onDismiss} hitSlop={10} style={[annS.closeBtn, { backgroundColor:theme.color+"20" }]}>
            <Feather name="x" size={14} color={theme.color} />
          </Pressable>
          <View style={annS.badge}>
            <Feather name={theme.icon} size={12} color={theme.color} />
          </View>
        </View>
        <Text style={[annS.title, { color:announcement.imageUrl ? "#fff" : "#fff" }]} numberOfLines={2}>{title}</Text>
        {body ? <Text style={annS.body} numberOfLines={2}>{body}</Text> : null}
        {ctaText && announcement.ctaUrl ? (
          <Pressable style={[annS.cta, { backgroundColor:theme.color }]}
            onPress={() => { if (announcement.ctaUrl!.startsWith("http")) Linking.openURL(announcement.ctaUrl!); }}>
            <Text style={annS.ctaText}>{ctaText}</Text>
            <Feather name="arrow-left" size={14} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const annS = StyleSheet.create({
  wrap: {
    marginHorizontal:16, marginBottom:14, borderRadius:16, borderWidth:1,
    overflow:"hidden", flexDirection:"row",
  },
  accent: { width:4 },
  imageWrap: { position:"absolute", top:0, left:4, right:0, bottom:0 },
  image: { width:"100%", height:"100%" },
  imageOverlay: { ...StyleSheet.absoluteFillObject, top:0, left:0 },
  content: {
    flex:1, padding:14, paddingLeft:12,
    zIndex:1,
  },
  topRow: {
    flexDirection:"row", justifyContent:"space-between", alignItems:"center",
    marginBottom:8,
  },
  closeBtn: {
    width:26, height:26, borderRadius:13,
    alignItems:"center", justifyContent:"center",
  },
  badge: {
    width:28, height:28, borderRadius:8,
    backgroundColor:"rgba(255,255,255,0.08)",
    alignItems:"center", justifyContent:"center",
  },
  title: {
    fontSize:14, fontFamily:"Cairo_700Bold", textAlign:"right",
    lineHeight:20, marginBottom:4,
  },
  body: {
    fontSize:12, color:"#94a3b8", fontFamily:"Cairo_400Regular",
    textAlign:"right", lineHeight:18,
  },
  cta: {
    marginTop:10, paddingHorizontal:16, paddingVertical:9,
    borderRadius:10, alignSelf:"flex-end",
    flexDirection:"row", alignItems:"center", gap:6,
  },
  ctaText: { fontSize:12, color:"#fff", fontFamily:"Cairo_700Bold" },
});

function SubjectIcon({ name, color }: { name: string; color: string }) {
  const iconName = getSubjectIcon(name);
  return (
    <View style={[subjIconStyles.wrap, { backgroundColor: color + '22' }]}>
      <Feather name={iconName} size={22} color={color} />
    </View>
  );
}

const subjIconStyles = StyleSheet.create({
  wrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
});

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const online = await isOnline();
      setOffline(!online);

      const [cachedUser, cachedSubjects, cachedUnits, cachedAnnouncements] = await Promise.all([
        cacheGet<typeof user>("home_user"),
        cacheGet<Subject[]>("home_subjects"),
        cacheGet<UnitWithLessons[]>("home_units"),
        cacheGet<Announcement[]>("home_announcements"),
      ]);

      if (cachedUser) setUser(cachedUser);
      if (cachedSubjects && cachedSubjects.length > 0) setSubjects(cachedSubjects);
      if (cachedUnits && cachedUnits.length > 0) setUnitsWithLessons(cachedUnits);
      if (cachedAnnouncements) setAnnouncements(cachedAnnouncements);

      if (!cachedUser && !cachedSubjects && !cachedUnits) {
        await fetchFreshData();
      }
      setLoading(false);
    })();
  }, []);

  async function fetchFreshData() {
    setOffline(false);
    try {
      const u = await getStoredUser();
      if (!u) return;
      setUser(u);
      await cacheSet("home_user", u);

      const collegeId = await SecureStore.getItemAsync(STORAGE_KEYS.COLLEGE_ID);
      if (!collegeId) return;

      const subRes = await apiFetch<Subject[]>(`${ENDPOINTS.SUBJECTS}?collegeId=${collegeId}`);
      if (!subRes.success || !subRes.data) return;

      const subs = subRes.data;
      setSubjects(subs);
      await cacheSet("home_subjects", subs);

      await loadAnnouncements();

      const savedSubjectId = await SecureStore.getItemAsync("unique_subject_id");
      const subject = subs.find((s) => s._id === savedSubjectId) ?? subs[0] ?? null;
      if (subject) {
        setSelectedSubject(subject);
        await loadLevels(subject._id);
      }
    } catch {

    }
  }

  async function onRefresh() {
    setRefreshing(true);
    const online = await isOnline();
    setOffline(!online);
    if (online) await fetchFreshData();
    setRefreshing(false);
  }

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

  async function loadAnnouncements() {
    try {
      const stored = await SecureStore.getItemAsync("unique_dismissed_announcements");
      const dismissed: string[] = stored ? JSON.parse(stored) : [];
      setDismissedIds(new Set(dismissed));
      const res = await apiFetch<Announcement[]>(ENDPOINTS.ANNOUNCEMENTS);
      if (res.success && res.data) {
        const filtered = res.data.filter((a) => !dismissed.includes(a._id));
        setAnnouncements(filtered);
        await cacheSet("home_announcements", filtered);
      }
    } catch {}
  }

  async function dismissAnnouncement(id: string) {
    const newSet = new Set([...dismissedIds, id]);
    setDismissedIds(newSet);
    setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    await SecureStore.setItemAsync("unique_dismissed_announcements", JSON.stringify([...newSet]));
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
      await cacheSet("home_units", enriched);
    } finally {
      setLoadingUnits(false);
    }
  }

  async function selectSubject(subject: Subject) {
    setSelectedSubject(subject);
    setShowSubjectModal(false);
    setSubjectSearch('');
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

  const logoSource = require("@/assets/images/logo.png");

  const subjectName = selectedSubject
    ? (lang === "ar" ? selectedSubject.nameAr || selectedSubject.name : selectedSubject.nameEn || selectedSubject.name)
    : (lang === "ar" ? "اختر المادة" : "Select subject");

  const levelTitle = selectedLevel
    ? (lang === "ar" ? selectedLevel.title : selectedLevel.titleEn || selectedLevel.title)
    : (lang === "ar" ? "اختر المستوى" : "Choose level");

  const filteredSubjects = subjects.filter((s) => {
    if (!subjectSearch) return true;
    const q = subjectSearch.toLowerCase();
    return (
      (s.nameAr || '').toLowerCase().includes(q) ||
      (s.nameEn || '').toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q)
    );
  });

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
      {offline && (
        <View style={styles.offlineBanner}>
          <Feather name="wifi-off" size={13} color="#F59E0B" />
          <Text style={styles.offlineBannerText}>
            {lang === "ar"
              ? "أنت غير متصل — تعرض بيانات محفوظة"
              : "Offline — showing cached data"}
          </Text>
        </View>
      )}

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.subjectPicker} onPress={() => setShowSubjectModal(true)}>
          {selectedSubject ? (
            <View style={[styles.subjectIconSmall, { backgroundColor: (selectedSubject.color || primaryColor) + '22' }]}>
              <Feather
                name={getSubjectIcon(selectedSubject.nameAr || selectedSubject.nameEn || selectedSubject.name)}
                size={16}
                color={selectedSubject.color || primaryColor}
              />
            </View>
          ) : (
            <View style={[styles.subjectIconSmall, { backgroundColor: primaryColor + '22' }]}>
              <Feather name="book" size={16} color={primaryColor} />
            </View>
          )}
          <Text style={[styles.subjectPickerText, { color: colors.text }]} numberOfLines={1}>
            {subjectName}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={[styles.avatarBtn, { backgroundColor: primaryColor }]} onPress={() => router.push("/(app)/(tabs)/profile" as any)}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
          ) : (
            <Image source={logoSource} style={styles.avatarLogo} />
          )}
        </Pressable>
      </View>

      {/* ── Level selector + progress ── */}
      {selectedLevel && (
        <View style={[styles.levelBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable style={styles.levelPicker} onPress={() => setShowLevelModal(true)}>
            <Feather name="flag" size={14} color={colors.textSecondary} />
            <Text style={[styles.levelPickerText, { color: colors.text }]} numberOfLines={1}>
              {levelTitle}
            </Text>
            <Feather name="chevron-down" size={14} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.levelProgressWrap}>
            <View style={[styles.levelProgressBg, { backgroundColor: colors.border }]}>
              <View style={[styles.levelProgressFill, { width: `${levelPct}%`, backgroundColor: primaryColor }]} />
            </View>
            <Text style={[styles.levelPct, { color: colors.textSecondary }]}>{levelPct}%</Text>
          </View>
        </View>
      )}

      {/* ── Announcements ── */}
      {announcements.length > 0 && (
        <View style={{ paddingTop: 8 }}>
          <View style={styles.annHeader}>
            <Feather name="bell" size={14} color={primaryColor} />
            <Text style={[styles.annHeaderText, { color: colors.textSecondary }]}>
              {lang === "ar" ? "إعلانات" : "Announcements"}
            </Text>
          </View>
          {announcements.slice(0, 2).map((ann) => (
            <AnnouncementBanner key={ann._id} announcement={ann} lang={lang} onDismiss={() => dismissAnnouncement(ann._id)} />
          ))}
        </View>
      )}

      {/* ── Flashcard entry ── */}
      <Pressable
        style={styles.flashcardEntry}
        onPress={() => router.push("/(app)/flashcards" as any)}
      >
        <View style={styles.flashcardIcon}>
          <Feather name="layers" size={20} color="#ffffff" />
        </View>
        <Text style={styles.flashcardEntryText}>
          {lang === "ar" ? "مفردات اليوم" : "Today's Vocabulary"}
        </Text>
        <Feather name="chevron-left" size={18} color="rgba(255,255,255,0.6)" />
      </Pressable>

      {/* ── Units path ── */}
      {loadingUnits ? (
        <View style={styles.center}>
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : unitsWithLessons.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIconWrap, { backgroundColor: primaryColor + '15' }]}>
            <Feather name="book-open" size={36} color={primaryColor} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {lang === "ar" ? "لا توجد وحدات منشورة بعد" : "No units published yet"}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            {lang === "ar" ? "اختر مادة ومستوى للبدء" : "Pick a subject & level to start"}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.pathScroll} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" colors={["#6C63FF"]} />}>
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

      {/* ── Subject Picker Bottom Sheet ── */}
      <BottomSheet visible={showSubjectModal} onClose={() => { setShowSubjectModal(false); setSubjectSearch(''); }}>
        <View style={sheetStyles.header}>
          <View style={sheetStyles.headerLeft}>
            <Feather name="book" size={20} color="#fff" />
            <Text style={sheetStyles.headerTitle}>
              {lang === "ar" ? "اختر المادة" : "Choose Subject"}
            </Text>
          </View>
          <Pressable onPress={() => { setShowSubjectModal(false); setSubjectSearch(''); }} hitSlop={10}>
            <Feather name="x" size={22} color="#94a3b8" />
          </Pressable>
        </View>

        <View style={sheetStyles.searchWrap}>
          <Feather name="search" size={16} color="#64748b" />
          <TextInput
            style={sheetStyles.searchInput}
            placeholder={lang === "ar" ? "ابحث عن مادة..." : "Search subjects..."}
            placeholderTextColor="#64748b"
            value={subjectSearch}
            onChangeText={setSubjectSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {subjectSearch.length > 0 && (
            <Pressable onPress={() => setSubjectSearch('')} hitSlop={8}>
              <Feather name="x" size={16} color="#64748b" />
            </Pressable>
          )}
        </View>

        {filteredSubjects.length === 0 ? (
          <View style={sheetStyles.emptyWrap}>
            <Feather name="search" size={32} color="#475569" />
            <Text style={sheetStyles.emptyText}>
              {lang === "ar" ? "لا توجد نتائج" : "No results found"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredSubjects}
            keyExtractor={(s) => s._id}
            contentContainerStyle={sheetStyles.subjectList}
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

              const sName = item.nameAr || item.name;
              const sNameEn = item.nameEn || item.name;

              return (
                <Pressable
                  style={[
                    sheetStyles.subjectCard,
                    {
                      backgroundColor: isSelected ? accentColor + '18' : '#1e1e3a',
                      borderColor: isSelected ? accentColor : '#2d2d5e',
                    },
                  ]}
                  onPress={() => selectSubject(item)}
                >
                  <SubjectIcon name={sName} color={accentColor} />
                  <View style={sheetStyles.subjectInfo}>
                    <Text style={sheetStyles.subjectName}>{sName}</Text>
                    <Text style={sheetStyles.subjectNameEn}>{sNameEn}</Text>
                    {isSelected && totalLessons > 0 && (
                      <View style={sheetStyles.progressRow}>
                        <View style={[sheetStyles.progressBarBg, { backgroundColor: '#2d2d5e' }]}>
                          <View style={[sheetStyles.progressBarFill, { width: `${progressPct}%` as any, backgroundColor: accentColor }]} />
                        </View>
                        <Text style={[sheetStyles.progressPct, { color: accentColor }]}>{progressPct}%</Text>
                      </View>
                    )}
                  </View>
                  <View style={[sheetStyles.radioCircle, { borderColor: isSelected ? accentColor : '#3d3d6e' }]}>
                    {isSelected && <View style={[sheetStyles.radioFill, { backgroundColor: accentColor }]} />}
                  </View>
                </Pressable>
              );
            }}
          />
        )}

        <Pressable style={sheetStyles.changeCollegeBtn} onPress={() => { setShowSubjectModal(false); router.push("/college-picker" as any); }}>
          <Feather name="refresh-cw" size={13} color="#64748b" />
          <Text style={sheetStyles.changeCollegeText}>
            {lang === "ar" ? "تغيير الكلية" : "Change college"}
          </Text>
        </Pressable>
      </BottomSheet>

      {/* ── Level Picker Bottom Sheet ── */}
      <BottomSheet visible={showLevelModal} onClose={() => setShowLevelModal(false)}>
        <View style={sheetStyles.header}>
          <View style={sheetStyles.headerLeft}>
            <Feather name="flag" size={20} color="#fff" />
            <Text style={sheetStyles.headerTitle}>
              {lang === "ar" ? "اختر المستوى" : "Choose Level"}
            </Text>
          </View>
          <Pressable onPress={() => setShowLevelModal(false)} hitSlop={10}>
            <Feather name="x" size={22} color="#94a3b8" />
          </Pressable>
        </View>

        {levels.length === 0 ? (
          <View style={sheetStyles.emptyWrap}>
            <Feather name="inbox" size={32} color="#475569" />
            <Text style={sheetStyles.emptyText}>
              {lang === "ar" ? "لا توجد مستويات متاحة" : "No levels available"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={levels}
            keyExtractor={(l) => l._id}
            numColumns={2}
            columnWrapperStyle={sheetStyles.levelGrid}
            contentContainerStyle={sheetStyles.levelList}
            renderItem={({ item }) => {
              const isSelected = item._id === selectedLevel?._id;
              const isComingSoon = item.comingSoon && !item.isPublished;

              return (
                <Pressable
                  style={[
                    sheetStyles.levelCard,
                    {
                      backgroundColor: isSelected ? primaryColor + '18' : '#1e1e3a',
                      borderColor: isSelected ? primaryColor : '#2d2d5e',
                    },
                  ]}
                  onPress={() => !isComingSoon && selectLevel(item)}
                >
                  <View style={[sheetStyles.levelIconWrap, { backgroundColor: isSelected ? primaryColor + '30' : '#2d2d5e' }]}>
                    {isComingSoon ? (
                      <Feather name="clock" size={20} color="#64748b" />
                    ) : (
                      <Feather name="layers" size={20} color={isSelected ? primaryColor : '#94a3b8'} />
                    )}
                  </View>
                  <Text
                    style={[
                      sheetStyles.levelTitle,
                      { color: isSelected ? '#fff' : isComingSoon ? '#64748b' : '#e2e8f0' },
                    ]}
                    numberOfLines={2}
                  >
                    {lang === "ar" ? item.title : item.titleEn || item.title}
                  </Text>
                  {isComingSoon && (
                    <View style={sheetStyles.comingSoonBadge}>
                      <Feather name="clock" size={10} color="#F59E0B" />
                      <Text style={sheetStyles.comingSoonText}>
                        {lang === "ar" ? "قريباً" : "Soon"}
                      </Text>
                    </View>
                  )}
                  {isSelected && (
                    <View style={[sheetStyles.selectedBadge, { backgroundColor: primaryColor }]}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.10)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,158,11,0.20)",
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  offlineBannerText: {
    fontSize: 12,
    color: "#F59E0B",
    fontFamily: "Cairo_400Regular",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  emptyText: { fontSize: 15, textAlign: "center", fontFamily: "Cairo_700Bold", marginTop: 8 },
  emptySubtext: { fontSize: 13, textAlign: "center", fontFamily: "Cairo_400Regular" },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  subjectPicker: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  subjectIconSmall: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  subjectPickerText: { fontSize: 16, fontFamily: "Cairo_700Bold", flex: 1 },
  avatarBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  avatarImage: {
    width: 38, height: 38, borderRadius: 19,
  },
  avatarLogo: {
    width: 28, height: 28, borderRadius: 0,
  },

  levelBar: {
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  levelPicker: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  levelPickerText: { fontSize: 14, fontFamily: "Cairo_700Bold", flex: 1 },
  levelProgressWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  levelProgressBg: { height: 6, borderRadius: 3, width: 80, overflow: "hidden" },
  levelProgressFill: { height: "100%", borderRadius: 3 },
  levelPct: { fontSize: 12, fontFamily: "Cairo_700Bold", minWidth: 36, textAlign: "right" },

  annHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, marginBottom: 8,
  },
  annHeaderText: {
    fontSize: 12, fontFamily: "Cairo_700Bold",
  },

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

  flashcardEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 20,
    marginTop: 4,
  },
  flashcardIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  flashcardEntryText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
  },

  examPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24,
    borderWidth: 1.5, marginTop: 16, alignSelf: "center",
  },
  examPillText: { fontSize: 14, fontFamily: "Cairo_700Bold" },
});

const sheetStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  headerTitle: {
    fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#fff',
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1e1e3a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d2d5e',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'Cairo_400Regular',
    padding: 0,
  },

  subjectList: {
    paddingBottom: 8,
  },
  subjectCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 16,
    padding: 14, marginBottom: 10,
    gap: 14,
  },
  subjectInfo: {
    flex: 1, gap: 2,
  },
  subjectName: {
    fontSize: 15, fontFamily: 'Cairo_700Bold',
    color: '#fff', textAlign: 'right',
  },
  subjectNameEn: {
    fontSize: 12, fontFamily: 'Cairo_400Regular',
    color: '#94a3b8', textAlign: 'right',
  },
  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 6,
  },
  progressBarBg: {
    flex: 1, height: 4, borderRadius: 2, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', borderRadius: 2,
  },
  progressPct: {
    fontSize: 11, fontFamily: 'Cairo_700Bold', minWidth: 32, textAlign: 'right',
  },
  radioCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioFill: {
    width: 13, height: 13, borderRadius: 6.5,
  },

  changeCollegeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, marginTop: 8,
  },
  changeCollegeText: {
    fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#64748b',
  },

  levelList: {
    paddingBottom: 8,
  },
  levelGrid: {
    gap: 10,
  },
  levelCard: {
    flex: 1,
    borderWidth: 1.5, borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  levelIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  levelTitle: {
    fontSize: 13, fontFamily: 'Cairo_700Bold',
    textAlign: 'center',
  },
  comingSoonBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#F59E0B',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyWrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 40, gap: 12,
  },
  emptyText: {
    fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#64748b',
  },
});
