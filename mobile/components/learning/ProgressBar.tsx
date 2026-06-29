import { View, Text, StyleSheet } from "react-native";

interface ProgressBarProps {
  current: number;
  total: number;
  color?: string;
  showLabel?: boolean;
}

export default function ProgressBar({ current, total, color = "#6C63FF", showLabel = true }: ProgressBarProps) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <View style={s.wrap}>
      <View style={s.bg}>
        <View style={[s.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      {showLabel && <Text style={s.label}>{current}/{total}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 4 },
  bg: { height: 6, backgroundColor: "#2d1f6e", borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  label: { fontSize: 11, color: "#94a3b8", textAlign: "right" },
});
