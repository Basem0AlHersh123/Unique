import { useRef, useEffect, useState, useCallback } from "react";
import {
  View, Text, Pressable, StyleSheet, Animated, Dimensions,
  Easing,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useLanguage } from "@/lib/i18n/context";

const W = Dimensions.get("window").width;
const NODE_SIZE = 62;
const COLUMNS = 3;

function getNodeX(indexInRow: number, rowGoingRight: boolean): number {
  const padding = 36;
  const span = W - padding * 2 - NODE_SIZE;
  const positions = [padding, padding + span / 2, padding + span];
  if (rowGoingRight) return positions[indexInRow];
  return positions[COLUMNS - 1 - indexInRow];
}

interface LessonItem {
  _id: string;
  title: string;
  order: number;
  isPublished: boolean;
  isFree: boolean;
}

interface LessonProgress {
  lessonId: string;
  watchedVideo: boolean;
  passedQuiz: boolean;
}

interface UnitWithLessons {
  _id: string;
  title: string;
  titleEn?: string;
  examEnabled?: boolean;
  lessons: LessonItem[];
  progress: LessonProgress[];
}

type NodeStatus = "done" | "current" | "locked";

interface ZigzagNode {
  id: string;
  title: string;
  status: NodeStatus;
  x: number;
  y: number;
  isExam?: boolean;
  unitId?: string;
  lessonId?: string;
  color: string;
}

const UNIT_COLORS = [
  "#22D3EE",
  "#A78BFA",
  "#F59E0B",
  "#34D399",
  "#F472B6",
  "#60A5FA",
  "#FB923C",
  "#A3E635",
];

function getNodeColor(unitIndex: number): string {
  return UNIT_COLORS[unitIndex % UNIT_COLORS.length];
}

function PulseRing({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.5, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: NODE_SIZE,
        height: NODE_SIZE,
        borderRadius: NODE_SIZE / 2,
        borderWidth: 3,
        borderColor: color,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

function ZigzagNode({
  node,
  onPress,
}: {
  node: ZigzagNode;
  onPress: () => void;
}) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (node.status !== "current") return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -6, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [node.status, bounceAnim]);

  const bgColor =
    node.status === "done"
      ? "#22C55E"
      : node.status === "current"
      ? node.color
      : "#1e1b3a";

  const borderColor =
    node.status === "done"
      ? "#16a34a"
      : node.status === "current"
      ? node.color
      : "#2d1f6e";

  const iconName: keyof typeof Feather.glyphMap =
    node.isExam
      ? "edit-3"
      : node.status === "done"
      ? "check"
      : node.status === "locked"
      ? "lock"
      : "play";

  const iconColor = node.status === "locked" ? "#475569" : "#ffffff";
  const isLocked = node.status === "locked";

  return (
    <Animated.View
      style={[
        zs.nodeOuter,
        {
          left: node.x,
          top: node.y,
          transform: [{ translateY: node.status === "current" ? bounceAnim : 0 }],
        },
      ]}
    >
      {node.status === "current" && <PulseRing color={node.color} />}
      <Pressable
        onPress={isLocked ? undefined : onPress}
        style={[
          zs.nodeCircle,
          {
            backgroundColor: bgColor,
            borderColor,
            shadowColor: node.status !== "locked" ? bgColor : "transparent",
            opacity: isLocked ? 0.6 : 1,
          },
        ]}
      >
        {node.isExam ? (
          <Text style={zs.examStar}>⭐</Text>
        ) : (
          <Feather name={iconName} size={24} color={iconColor} />
        )}
      </Pressable>
      <Text
        style={[zs.nodeLabel, { color: node.status === "locked" ? "#475569" : "#cbd5e1" }]}
        numberOfLines={2}
      >
        {node.title}
      </Text>
    </Animated.View>
  );
}

function NodeConnectors({ nodes }: { nodes: ZigzagNode[] }) {
  if (nodes.length < 2) return null;

  const paths: { d: string; done: boolean }[] = [];

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const cx = a.x + NODE_SIZE / 2;
    const cy = a.y + NODE_SIZE / 2;
    const dx = b.x + NODE_SIZE / 2;
    const dy = b.y + NODE_SIZE / 2;

    const midY = (cy + dy) / 2;
    const d = `M ${cx} ${cy} C ${cx} ${midY}, ${dx} ${midY}, ${dx} ${dy}`;
    paths.push({ d, done: a.status === "done" });
  }

  const totalHeight = (nodes[nodes.length - 1]?.y ?? 0) + NODE_SIZE + 60;

  return (
    <Svg
      width={W}
      height={totalHeight}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="doneGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#22C55E" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#6C63FF" stopOpacity="0.8" />
        </LinearGradient>
      </Defs>
      {paths.map((p, i) => (
        <Path
          key={i}
          d={p.d}
          stroke={p.done ? "url(#doneGrad)" : "#2d1f6e"}
          strokeWidth={3}
          strokeDasharray={p.done ? undefined : "6 4"}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

function UnitBanner({ title, y, color }: { title: string; y: number; color: string }) {
  return (
    <View style={[zs.unitBanner, { top: y - 50, borderColor: color + "40" }]}>
      <View style={[zs.unitBannerDot, { backgroundColor: color }]} />
      <Text style={zs.unitBannerText} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

interface ZigzagPathProps {
  units: UnitWithLessons[];
  primaryColor: string;
  onLessonPress: (lessonId: string) => void;
  onExamPress: (unitId: string) => void;
}

export default function ZigzagPath({
  units,
  primaryColor,
  onLessonPress,
  onExamPress,
}: ZigzagPathProps) {
  const { lang } = useLanguage();
  const VERTICAL_STEP = 110;
  const UNIT_HEADER_OFFSET = 56;

  const nodes: ZigzagNode[] = [];
  const unitBanners: { title: string; y: number; color: string }[] = [];

  let globalIndex = 0;

  units.forEach((unit, unitIdx) => {
    const unitColor = getNodeColor(unitIdx);
    const completedIds = new Set(
      unit.progress.filter((p) => p.watchedVideo && p.passedQuiz).map((p) => p.lessonId)
    );

    const unitStartY = globalIndex === 0
      ? 20
      : nodes[nodes.length - 1].y + VERTICAL_STEP + UNIT_HEADER_OFFSET;

    unitBanners.push({ title: unit.title, y: unitStartY, color: unitColor });

    unit.lessons.forEach((lesson, lIdx) => {
      const posInRow = globalIndex % COLUMNS;
      const rowNumber = Math.floor(globalIndex / COLUMNS);
      const goingRight = rowNumber % 2 === 0;

      const x = getNodeX(posInRow, goingRight);
      const y = globalIndex === 0
        ? unitStartY + UNIT_HEADER_OFFSET
        : nodes[nodes.length - 1].y + VERTICAL_STEP;

      let status: NodeStatus = "locked";
      if (completedIds.has(lesson._id)) {
        status = "done";
      } else {
        const prevDone = lIdx === 0 || completedIds.has(unit.lessons[lIdx - 1]._id);
        const noPriorUnlocked = nodes.every(
          (n) => n.status === "done" || n.unitId !== unit._id
        );
        if (prevDone || noPriorUnlocked) {
          const globalHasCurrent = nodes.some((n) => n.status === "current");
          if (!globalHasCurrent) status = "current";
        }
      }

      nodes.push({
        id: lesson._id,
        title: lesson.title,
        status,
        x,
        y,
        lessonId: lesson._id,
        unitId: unit._id,
        color: unitColor,
      });

      globalIndex++;
    });

    if (unit.examEnabled) {
      const posInRow = globalIndex % COLUMNS;
      const rowNumber = Math.floor(globalIndex / COLUMNS);
      const goingRight = rowNumber % 2 === 0;
      const x = getNodeX(posInRow, goingRight);
      const y = nodes.length > 0
        ? nodes[nodes.length - 1].y + VERTICAL_STEP
        : UNIT_HEADER_OFFSET;

      const allDone = unit.lessons.length > 0 && unit.lessons.every((l) => completedIds.has(l._id));
      const globalHasCurrent = nodes.some((n) => n.status === "current");

      nodes.push({
        id: `exam-${unit._id}`,
        title: lang === "ar" ? "اختبار الوحدة" : "Unit Exam",
        status: allDone ? "current" : !globalHasCurrent ? "current" : "locked",
        x,
        y,
        isExam: true,
        unitId: unit._id,
        color: unitColor,
      });

      globalIndex++;
    }
  });

  const totalHeight = nodes.length > 0
    ? nodes[nodes.length - 1].y + NODE_SIZE + 80
    : 300;

  return (
    <View style={[zs.container, { height: totalHeight }]}>
      <NodeConnectors nodes={nodes} />
      {unitBanners.map((b, i) => (
        <UnitBanner key={i} title={b.title} y={b.y} color={b.color} />
      ))}
      {nodes.map((node) => (
        <ZigzagNode
          key={node.id}
          node={node}
          onPress={() => {
            if (node.isExam && node.unitId) onExamPress(node.unitId);
            else if (node.lessonId) onLessonPress(node.lessonId);
          }}
        />
      ))}
    </View>
  );
}

const zs = StyleSheet.create({
  container: {
    width: W,
    position: "relative",
  },
  nodeOuter: {
    position: "absolute",
    width: NODE_SIZE,
    alignItems: "center",
  },
  nodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  nodeLabel: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 90,
    lineHeight: 15,
  },
  examStar: {
    fontSize: 26,
  },
  unitBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 10, 46, 0.85)",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  unitBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unitBannerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e2e8f0",
    flex: 1,
  },
});
