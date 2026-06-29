import { Pressable, View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Lesson, LessonProgress } from "@/lib/types";

interface LessonRowProps {
  lesson: Lesson;
  index: number;
  progress?: LessonProgress;
  unlocked: boolean;
  onPress: () => void;
}

export default function LessonRow({ lesson, index, progress, unlocked, onPress }: LessonRowProps) {
  const completed = progress?.watchedVideo && progress?.passedQuiz;
  const videoOnly = progress?.watchedVideo && !progress?.passedQuiz;

  return (
    <Pressable
      style={[s.row, !unlocked && s.rowLocked]}
      onPress={onPress}
      disabled={!unlocked}
    >
      {/* Left: status icon */}
      <View style={[
        s.icon,
        completed && s.iconDone,
        !unlocked && s.iconLocked,
      ]}>
        <Feather
          name={completed ? "check" : unlocked ? "play" : "lock"}
          size={16}
          color={completed ? "#22C55E" : unlocked ? "#6C63FF" : "#475569"}
        />
      </View>

      {/* Center: title + progress indicators */}
      <View style={s.body}>
        <Text style={[s.title, !unlocked && s.titleLocked]} numberOfLines={2}>
          {lesson.title}
        </Text>
        <View style={s.meta}>
          <View style={[s.metaItem]}>
            <Feather
              name="video"
              size={11}
              color={progress?.watchedVideo ? "#22C55E" : "#475569"}
            />
            <Text style={[s.metaText, progress?.watchedVideo && s.metaDone]}>
              فيديو
            </Text>
          </View>
          <View style={s.metaItem}>
            <Feather
              name="edit-3"
              size={11}
              color={progress?.passedQuiz ? "#22C55E" : "#475569"}
            />
            <Text style={[s.metaText, progress?.passedQuiz && s.metaDone]}>
              اختبار
            </Text>
          </View>
          {lesson.isFree && (
            <View style={s.freeBadge}>
              <Text style={s.freeText}>مجاني</Text>
            </View>
          )}
        </View>
      </View>

      {/* Right: chevron or lock */}
      <Feather
        name={unlocked ? "chevron-left" : "lock"}
        size={16}
        color={unlocked ? "#475569" : "#2d1f6e"}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1040",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2d1f6e",
    padding: 14,
    gap: 12,
  },
  rowLocked: { opacity: 0.45 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(108,99,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconDone: { backgroundColor: "rgba(34,197,94,0.12)" },
  iconLocked: { backgroundColor: "#2d1f6e" },
  body: { flex: 1, alignItems: "flex-end" },
  title: { fontSize: 14, fontWeight: "600", color: "#ffffff", textAlign: "right", fontFamily: "Cairo_700Bold" },
  titleLocked: { color: "#475569" },
  meta: { flexDirection: "row", gap: 10, marginTop: 5, alignItems: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: "#475569", fontFamily: "Cairo_400Regular" },
  metaDone: { color: "#22C55E" },
  freeBadge: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  freeText: { fontSize: 10, color: "#22C55E", fontWeight: "600", fontFamily: "Cairo_400Regular" },
});
