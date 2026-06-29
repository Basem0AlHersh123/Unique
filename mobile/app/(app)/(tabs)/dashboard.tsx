import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, Animated, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Circle, Polyline, Polygon, Line, Text as SvgText } from "react-native-svg";
import { getStoredUser, type AuthUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// ─── Shared primitives ────────────────────────────────────────────────────────

function DonutRing({
  pct, color, size = 90, stroke = 11, label,
}: {
  pct: number; color: string; size?: number; stroke?: number; label?: string;
}) {
  const animVal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animVal, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct]);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1040" strokeWidth={stroke} />
        <Circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90" origin={`${size / 2},${size / 2}`}
        />
      </Svg>
      <Text style={{ fontSize: size * 0.21, fontFamily: "Cairo_700Bold", color: "#fff" }}>{pct}%</Text>
      {label && <Text style={{ fontSize: 9, color: "#94a3b8", fontFamily: "Cairo_400Regular", marginTop: 1 }}>{label}</Text>}
    </View>
  );
}

function BarRow({ label, pct, color, count }: { label: string; pct: number; color: string; count?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 800, useNativeDriver: false }).start();
  }, [pct]);

  const barColor = pct >= 70 ? "#22C55E" : pct >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ fontSize: 13, color: "#fff", fontFamily: "Cairo_400Regular" }} numberOfLines={1}>{label}</Text>
        <Text style={{ fontSize: 13, fontFamily: "Cairo_700Bold", color: barColor }}>{pct}%</Text>
      </View>
      <View style={{ height: 6, backgroundColor: "#1a1040", borderRadius: 3, overflow: "hidden" }}>
        <Animated.View style={{
          height: "100%", borderRadius: 3, backgroundColor: barColor,
          width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
        }} />
      </View>
      {count !== undefined && (
        <Text style={{ fontSize: 10, color: "#475569", marginTop: 3, fontFamily: "Cairo_400Regular" }}>{count} محاولة</Text>
      )}
    </View>
  );
}

function WeekBars({ data }: { data: { _id: string; count: number }[] }) {
  const AR_DAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  const max = Math.max(...data.map(d => d.count), 1);
  const today = new Date();

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 64 }}>
      {AR_DAYS.map((day, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split("T")[0];
        const entry = data.find(e => e._id === key);
        const pct = entry ? (entry.count / max) : 0;
        const isToday = i === 6;
        return (
          <View key={day} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View style={{ flex: 1, width: "100%", justifyContent: "flex-end" }}>
              <Animated.View style={{
                height: Math.max(pct * 44, pct > 0 ? 4 : 2),
                backgroundColor: isToday ? "#6C63FF" : "#6C63FF50",
                borderRadius: 4,
              }} />
            </View>
            <Text style={{ fontSize: 8, color: "#475569", fontFamily: "Cairo_400Regular" }}>{day}</Text>
          </View>
        );
      })}
    </View>
  );
}

function RadarChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length < 3) return null;
  const SIZE = 160;
  const cx = SIZE / 2, cy = SIZE / 2, r = 60;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (i: number, radius: number) => {
    const angle = -Math.PI / 2 + i * angleStep;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  const dataPolygon = data.map((d, i) => {
    const p = getPoint(i, r * Math.min(d.value / 100, 1));
    return `${p.x},${p.y}`;
  }).join(" ");

  const gridPolygons = [0.25, 0.5, 0.75, 1].map(scale =>
    data.map((_, i) => {
      const p = getPoint(i, r * scale);
      return `${p.x},${p.y}`;
    }).join(" ")
  );

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={SIZE} height={SIZE}>
        {gridPolygons.map((pts, i) => (
          <Polygon key={i} points={pts} fill="none" stroke="#2d1f6e" strokeWidth="1" />
        ))}
        {data.map((_, i) => {
          const outer = getPoint(i, r);
          return <Line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#2d1f6e" strokeWidth="1" />;
        })}
        <Polygon points={dataPolygon} fill="#6C63FF" fillOpacity="0.3" stroke="#6C63FF" strokeWidth="2" />
        {data.map((d, i) => {
          const p = getPoint(i, r * Math.min(d.value / 100, 1));
          return <Circle key={i} cx={p.x} cy={p.y} r="4" fill="#6C63FF" />;
        })}
        {data.map((d, i) => {
          const lp = getPoint(i, r + 16);
          return (
            <SvgText key={i} x={lp.x} y={lp.y} textAnchor="middle"
              fontSize="8" fill="#94a3b8" fontFamily="Cairo_400Regular">
              {d.label.slice(0, 6)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

function SectionTitle({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={{ fontSize: 14, fontFamily: "Cairo_700Bold", color: colors.text, textAlign: "right", marginBottom: 12, marginTop: 8 }}>
      {title}
    </Text>
  );
}

function KPIGrid({ items, colors }: {
  items: { icon: keyof typeof Feather.glyphMap; label: string; value: string; color: string }[];
  colors: any;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
      {items.map((item) => (
        <View key={item.label} style={[sh.kpiCard, { backgroundColor: colors.card, borderColor: colors.border, width: CARD_WIDTH }]}>
          <View style={[sh.kpiIconWrap, { backgroundColor: item.color + "20" }]}>
            <Feather name={item.icon} size={20} color={item.color} />
          </View>
          <Text style={sh.kpiValue}>{item.value}</Text>
          <Text style={[sh.kpiLabel, { color: colors.textTertiary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ActivityRow({ title, sub, pct, time }: { title: string; sub?: string; pct?: number; time?: string }) {
  const dotColor = pct === undefined ? "#6C63FF" : pct >= 70 ? "#22C55E" : pct >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <View style={sh.actRow}>
      <View style={[sh.actDot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={sh.actTitle} numberOfLines={1}>{title}</Text>
        {sub && <Text style={sh.actSub} numberOfLines={1}>{sub}</Text>}
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        {pct !== undefined && <Text style={[sh.actPct, { color: dotColor }]}>{pct}%</Text>}
        {time && <Text style={sh.actTime}>{time}</Text>}
      </View>
    </View>
  );
}

function timeAgo(dateStr: string, lang: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === "ar" ? "الآن" : "now";
  if (m < 60) return lang === "ar" ? `${m}د` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === "ar" ? `${h}س` : `${h}h`;
  return lang === "ar" ? `${Math.floor(h / 24)}ي` : `${Math.floor(h / 24)}d`;
}

// ─── STUDENT VIEW ─────────────────────────────────────────────────────────────

function StudentView({ stats, lang, colors }: { stats: any; colors: any; lang: string }) {
  const prog = stats?.progress;
  const avgPct = Math.round(prog?.stats?.averagePercentage ?? 0);
  const totalAttempts = prog?.stats?.totalAttempts ?? 0;
  const totalScore = prog?.stats?.totalScore ?? 0;
  const totalQuestions = prog?.stats?.totalQuestions ?? 0;
  const lessonsPassed = prog?.lessonsPassed ?? 0;
  const recent = prog?.recent ?? [];
  const subjectBreakdown: any[] = prog?.subjectBreakdown ?? [];
  const weeklyActivity: any[] = prog?.weeklyActivity ?? [];

  const radarData = subjectBreakdown.map((s: any) => ({
    label: lang === "ar" ? (s.name || s.nameEn) : (s.nameEn || s.name),
    value: s.avgPct ?? 0,
  }));

  const strengthSubjects = subjectBreakdown.filter((s: any) => s.avgPct >= 70);
  const weakSubjects = subjectBreakdown.filter((s: any) => s.avgPct < 70 && s.attempts > 0);

  return (
    <>
      {/* Overall score donut */}
      <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
          <DonutRing pct={avgPct} color="#6C63FF" size={100} stroke={12} label={lang === "ar" ? "معدل" : "avg"} />
          <View style={{ flex: 1, gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={sh.bigNum}>{totalAttempts}</Text>
                <Text style={[sh.bigLabel, { color: colors.textTertiary }]}>{lang === "ar" ? "محاولة" : "Attempts"}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={sh.bigNum}>{lessonsPassed}</Text>
                <Text style={[sh.bigLabel, { color: colors.textTertiary }]}>{lang === "ar" ? "درس" : "Lessons"}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={sh.bigNum}>{totalScore}</Text>
                <Text style={[sh.bigLabel, { color: colors.textTertiary }]}>{lang === "ar" ? "صحيح" : "Correct"}</Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "Cairo_400Regular", textAlign: "right" }}>
              {totalQuestions} {lang === "ar" ? "سؤال إجمالاً" : "total questions"}
            </Text>
          </View>
        </View>
      </View>

      {/* Strengths / Weaknesses */}
      {(strengthSubjects.length > 0 || weakSubjects.length > 0) && (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
          {strengthSubjects.length > 0 && (
            <View style={[sh.alertCard, { backgroundColor: "#22C55E10", borderColor: "#22C55E30", flex: 1 }]}>
              <Feather name="check-circle" size={16} color="#22C55E" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: "#22C55E", fontFamily: "Cairo_700Bold" }}>
                  {lang === "ar" ? "نقاط قوتك" : "Strengths"}
                </Text>
                <Text style={{ fontSize: 10, color: "#94a3b8", fontFamily: "Cairo_400Regular" }} numberOfLines={2}>
                  {strengthSubjects.map((s: any) => s.name || s.nameEn).join("، ")}
                </Text>
              </View>
            </View>
          )}
          {weakSubjects.length > 0 && (
            <View style={[sh.alertCard, { backgroundColor: "#EF444410", borderColor: "#EF444430", flex: 1 }]}>
              <Feather name="alert-circle" size={16} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: "#EF4444", fontFamily: "Cairo_700Bold" }}>
                  {lang === "ar" ? "تحتاج تحسيناً" : "Needs Work"}
                </Text>
                <Text style={{ fontSize: 10, color: "#94a3b8", fontFamily: "Cairo_400Regular" }} numberOfLines={2}>
                  {weakSubjects.map((s: any) => s.name || s.nameEn).join("، ")}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Subject radar + breakdown */}
      {subjectBreakdown.length > 0 && (
        <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title={lang === "ar" ? "أداء المواد" : "Subject Performance"} colors={colors} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {radarData.length >= 3 && <RadarChart data={radarData} />}
            <View style={{ flex: 1 }}>
              {subjectBreakdown.map((s: any, i: number) => (
                <BarRow
                  key={String(s._id)}
                  label={lang === "ar" ? (s.name || s.nameEn) : (s.nameEn || s.name)}
                  pct={s.avgPct ?? 0}
                  color="#6C63FF"
                  count={s.attempts}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Weekly activity */}
      <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionTitle title={lang === "ar" ? "نشاطك هذا الأسبوع" : "Weekly Activity"} colors={colors} />
        <WeekBars data={weeklyActivity} />
      </View>

      {/* Recent attempts */}
      {recent.length > 0 && (
        <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title={lang === "ar" ? "آخر المحاولات" : "Recent Attempts"} colors={colors} />
          {recent.slice(0, 6).map((r: any, i: number) => {
            const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : (r.percentage ?? 0);
            return (
              <ActivityRow
                key={i}
                title={r.topicTitle ?? "—"}
                sub={r.subjectName}
                pct={pct}
                time={r.completedAt ? timeAgo(r.completedAt, lang) : undefined}
              />
            );
          })}
        </View>
      )}

      {recent.length === 0 && subjectBreakdown.length === 0 && (
        <View style={sh.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🎯</Text>
          <Text style={{ fontSize: 16, color: "#fff", fontFamily: "Cairo_700Bold", textAlign: "center" }}>
            {lang === "ar" ? "ابدأ رحلتك الدراسية!" : "Start your study journey!"}
          </Text>
          <Text style={{ fontSize: 13, color: "#94a3b8", fontFamily: "Cairo_400Regular", textAlign: "center", marginTop: 6 }}>
            {lang === "ar" ? "أكمل بعض الاختبارات لتظهر إحصائياتك هنا" : "Complete some quizzes to see your stats here"}
          </Text>
        </View>
      )}
    </>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────

function AdminView({ stats, lang, colors, router }: { stats: any; colors: any; lang: string; router: any }) {
  const s = stats ?? {};

  const kpiItems = [
    { icon: "users" as const, label: lang === "ar" ? "الطلاب" : "Students", value: String(s.students ?? 0), color: "#6C63FF" },
    { icon: "activity" as const, label: lang === "ar" ? "محاولات اليوم" : "Today's Attempts", value: String(s.attemptsToday ?? 0), color: "#06B6D4" },
    { icon: "book-open" as const, label: lang === "ar" ? "الدروس" : "Lessons", value: String(s.topics ?? 0), color: "#22C55E" },
    { icon: "help-circle" as const, label: lang === "ar" ? "الأسئلة" : "Questions", value: String(s.questions ?? 0), color: "#F59E0B" },
    { icon: "user-check" as const, label: lang === "ar" ? "المعلمون" : "Teachers", value: String(s.teachers ?? 0), color: "#EC4899" },
    { icon: "zap" as const, label: lang === "ar" ? "نشطون اليوم" : "Active Today", value: String(s.activeToday ?? 0), color: "#EF4444" },
  ];

  const freeP = (s.students ?? 0) > 0 ? Math.round(((s.freeStudents ?? 0) / s.students) * 100) : 0;
  const paidP = 100 - freeP;

  return (
    <>
      {/* Header alert style */}
      <View style={[sh.siemHeader, { backgroundColor: "#6C63FF15", borderColor: "#6C63FF30" }]}>
        <Feather name="shield" size={20} color="#6C63FF" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontFamily: "Cairo_700Bold", color: "#fff", textAlign: "right" }}>
            {lang === "ar" ? "لوحة التحكم 🛡️" : "Admin Control Panel 🛡️"}
          </Text>
          <Text style={{ fontSize: 11, color: "#94a3b8", fontFamily: "Cairo_400Regular", textAlign: "right" }}>
            {lang === "ar" ? `${s.newStudentsMonth ?? 0} طالب جديد هذا الشهر` : `${s.newStudentsMonth ?? 0} new students this month`}
          </Text>
        </View>
      </View>

      {/* KPIs */}
      <KPIGrid items={kpiItems} colors={colors} />

      {/* Tier split */}
      <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionTitle title={lang === "ar" ? "توزيع الطلاب" : "Student Distribution"} colors={colors} />
        <BarRow label={lang === "ar" ? "مجاني" : "Free"} pct={freeP} color="#94a3b8" />
        <BarRow label={lang === "ar" ? "مدفوع" : "Paid"} pct={paidP} color="#F59E0B" />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          <Text style={{ fontSize: 11, color: "#94a3b8", fontFamily: "Cairo_400Regular" }}>
            {lang === "ar" ? `${s.freeStudents ?? 0} مجاني` : `${s.freeStudents ?? 0} free`}
          </Text>
          <Text style={{ fontSize: 11, color: "#F59E0B", fontFamily: "Cairo_400Regular" }}>
            {lang === "ar" ? `${s.paidStudents ?? 0} مدفوع` : `${s.paidStudents ?? 0} paid`}
          </Text>
        </View>
      </View>

      {/* Subject performance */}
      {(s.subjectPerformance ?? []).length > 0 && (
        <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title={lang === "ar" ? "أداء المواد" : "Subject Performance"} colors={colors} />
          {s.subjectPerformance.map((sp: any, i: number) => (
            <BarRow
              key={i}
              label={lang === "ar" ? (sp.name || sp.nameEn) : (sp.nameEn || sp.name)}
              pct={sp.avgScore ?? 0}
              color="#6C63FF"
              count={sp.attempts}
            />
          ))}
        </View>
      )}

      {/* Weekly activity */}
      {(s.activityByDay ?? []).length > 0 && (
        <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title={lang === "ar" ? "نشاط الأسبوع" : "Weekly Activity"} colors={colors} />
          <WeekBars data={s.activityByDay} />
        </View>
      )}

      {/* Recent attempts feed */}
      {(s.recentAttempts ?? []).length > 0 && (
        <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title={lang === "ar" ? "آخر المحاولات" : "Recent Attempts"} colors={colors} />
          {s.recentAttempts.slice(0, 8).map((a: any, i: number) => (
            <ActivityRow
              key={i}
              title={a.studentName ?? "—"}
              sub={a.topicTitle}
              pct={a.pct}
              time={a.completedAt ? timeAgo(a.completedAt, lang) : undefined}
            />
          ))}
        </View>
      )}

      {/* Recent registrations */}
      {(s.recentStudents ?? []).length > 0 && (
        <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title={lang === "ar" ? "آخر التسجيلات" : "Recent Registrations"} colors={colors} />
          {s.recentStudents.map((st: any, i: number) => (
            <ActivityRow
              key={i}
              title={st.name ?? "—"}
              sub={st.email}
              time={st.joinedAt ? timeAgo(st.joinedAt, lang) : undefined}
            />
          ))}
        </View>
      )}

      {/* Quick links */}
      <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionTitle title={lang === "ar" ? "روابط سريعة" : "Quick Actions"} colors={colors} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            { label: lang === "ar" ? "الطلاب" : "Students", icon: "users" as const, color: "#6C63FF" },
            { label: lang === "ar" ? "المحتوى" : "Content", icon: "book-open" as const, color: "#06B6D4" },
            { label: lang === "ar" ? "الأسئلة" : "Questions", icon: "help-circle" as const, color: "#F59E0B" },
            { label: lang === "ar" ? "المجموعات" : "Groups", icon: "message-circle" as const, color: "#22C55E" },
          ].map((q) => (
            <View key={q.label} style={[sh.quickLink, { backgroundColor: q.color + "15", borderColor: q.color + "30" }]}>
              <Feather name={q.icon} size={16} color={q.color} />
              <Text style={{ fontSize: 12, color: q.color, fontFamily: "Cairo_700Bold" }}>{q.label}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11, color: "#475569", fontFamily: "Cairo_400Regular", textAlign: "center", marginTop: 12 }}>
          {lang === "ar" ? "استخدم الموقع الإلكتروني للتحكم الكامل" : "Use the website for full admin control"}
        </Text>
      </View>
    </>
  );
}

// ─── TEACHER VIEW ─────────────────────────────────────────────────────────────

function TeacherView({ stats, lang, colors }: { stats: any; colors: any; lang: string }) {
  const s = stats ?? {};

  const kpiItems = [
    { icon: "book-open" as const, label: lang === "ar" ? "موادي" : "My Subjects", value: String(s.totalSubjects ?? 0), color: "#6C63FF" },
    { icon: "play-circle" as const, label: lang === "ar" ? "الدروس" : "Topics", value: String(s.totalTopics ?? 0), color: "#06B6D4" },
    { icon: "help-circle" as const, label: lang === "ar" ? "الأسئلة" : "Questions", value: String(s.totalQuestions ?? 0), color: "#F59E0B" },
    { icon: "bar-chart-2" as const, label: lang === "ar" ? "المحاولات" : "Attempts", value: String(s.totalAttempts ?? 0), color: "#22C55E" },
  ];

  return (
    <>
      <View style={[sh.siemHeader, { backgroundColor: "#06B6D415", borderColor: "#06B6D430" }]}>
        <Feather name="award" size={20} color="#06B6D4" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontFamily: "Cairo_700Bold", color: "#fff", textAlign: "right" }}>
            {lang === "ar" ? "لوحة المعلم 🎓" : "Teacher Dashboard 🎓"}
          </Text>
          <Text style={{ fontSize: 11, color: "#94a3b8", fontFamily: "Cairo_400Regular", textAlign: "right" }}>
            {lang === "ar" ? "استخدم الموقع لإدارة الدروس والأسئلة" : "Use the website to manage lessons & questions"}
          </Text>
        </View>
      </View>

      <KPIGrid items={kpiItems} colors={colors} />

      {(s.subjects ?? []).length > 0 && (
        <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionTitle title={lang === "ar" ? "موادك" : "Your Subjects"} colors={colors} />
          {s.subjects.map((sub: any, i: number) => (
            <View key={i} style={[sh.actRow, { marginBottom: 10 }]}>
              <View style={[sh.actDot, { backgroundColor: sub.color ?? "#6C63FF", width: 10, height: 10, borderRadius: 5 }]} />
              <Text style={[sh.actTitle, { flex: 1 }]}>
                {lang === "ar" ? (sub.nameAr ?? sub.name) : (sub.nameEn ?? sub.name)}
              </Text>
              <Text style={[sh.actTime, { color: "#6C63FF" }]}>
                {sub.topicsCount ?? 0} {lang === "ar" ? "درس" : "lessons"}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={[sh.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[sh.alertCard, { backgroundColor: "#6C63FF10", borderColor: "#6C63FF30" }]}>
          <Feather name="monitor" size={18} color="#6C63FF" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: "#6C63FF", fontFamily: "Cairo_700Bold" }}>
              {lang === "ar" ? "الإدارة الكاملة على الموقع" : "Full management on website"}
            </Text>
            <Text style={{ fontSize: 11, color: "#94a3b8", fontFamily: "Cairo_400Regular", marginTop: 2 }}>
              {lang === "ar"
                ? "أضف دروساً وأسئلة وأدر مجموعاتك من unique-tech-blond.vercel.app"
                : "Add lessons, questions, and manage groups at unique-tech-blond.vercel.app"}
            </Text>
          </View>
        </View>
      </View>
    </>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { lang } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    loadData();
  }, [user]));

  async function loadData() {
    setLoading(true);
    try {
      if (user?.role === "admin") {
        const res = await apiFetch(ENDPOINTS.ADMIN_STATS);
        if (res.success) setStats(res.data);
      } else if (user?.role === "teacher") {
        const res = await apiFetch(ENDPOINTS.TEACHER_STATS);
        if (res.success) setStats(res.data);
      } else {
        const [progRes, notesRes] = await Promise.all([
          apiFetch(ENDPOINTS.PROGRESS_DASHBOARD),
          apiFetch(ENDPOINTS.NOTES),
        ]);
        setStats({
          progress: progRes.success ? progRes.data : null,
          notesCount: notesRes.success && Array.isArray(notesRes.data) ? notesRes.data.length : 0,
        });
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={[sh.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[sh.header, { borderBottomColor: colors.border }]}>
        <Text style={[sh.headerTitle, { color: colors.text }]}>
          {lang === "ar" ? "لوحتي" : "Dashboard"}
        </Text>
        <Pressable onPress={loadData} style={sh.refreshBtn}>
          <Feather name="refresh-cw" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={sh.loadingCenter}>
          <ActivityIndicator color="#6C63FF" size="large" />
          <Text style={{ color: "#94a3b8", fontSize: 13, fontFamily: "Cairo_400Regular", marginTop: 12 }}>
            {lang === "ar" ? "جاري تحميل بياناتك..." : "Loading your data..."}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={sh.scroll}
          showsVerticalScrollIndicator={false}
        >
          {user?.role === "admin" && (
            <AdminView stats={stats} lang={lang} colors={colors} router={router} />
          )}
          {user?.role === "teacher" && (
            <TeacherView stats={stats} lang={lang} colors={colors} />
          )}
          {(!user?.role || user.role === "student") && (
            <StudentView stats={stats} lang={lang} colors={colors} />
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: "Cairo_700Bold" },
  refreshBtn: { padding: 6 },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, gap: 12 },

  card: {
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  kpiCard: {
    borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 6,
  },
  kpiIconWrap: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
  },
  kpiValue: { fontSize: 22, fontFamily: "Cairo_700Bold", color: "#fff" },
  kpiLabel: { fontSize: 10, fontFamily: "Cairo_400Regular", textAlign: "center" },

  actRow: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#2d1f6e",
  },
  actDot: { width: 8, height: 8, borderRadius: 4 },
  actTitle: { fontSize: 13, color: "#fff", fontFamily: "Cairo_400Regular", flex: 1, textAlign: "right" },
  actSub: { fontSize: 11, color: "#475569", fontFamily: "Cairo_400Regular", textAlign: "right" },
  actPct: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  actTime: { fontSize: 10, color: "#475569", fontFamily: "Cairo_400Regular" },

  bigNum: { fontSize: 22, fontFamily: "Cairo_700Bold", color: "#fff", textAlign: "center" },
  bigLabel: { fontSize: 10, fontFamily: "Cairo_400Regular", textAlign: "center" },

  alertCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 4,
  },

  siemHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 4,
  },

  quickLink: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },

  emptyState: {
    alignItems: "center", paddingVertical: 48, paddingHorizontal: 24,
  },
});