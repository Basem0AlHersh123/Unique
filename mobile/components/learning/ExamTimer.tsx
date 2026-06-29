import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

interface ExamTimerProps {
  nextAttemptAt: string | null; // ISO date string
  onReady?: () => void;         // called when cooldown ends
}

export default function ExamTimer({ nextAttemptAt, onReady }: ExamTimerProps) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!nextAttemptAt) return;
    const target = new Date(nextAttemptAt).getTime();
    const tick = setInterval(() => {
      const diff = Math.max(0, target - Date.now());
      setRemaining(diff);
      if (diff === 0) {
        clearInterval(tick);
        onReady?.();
      }
    }, 1000);
    setRemaining(Math.max(0, target - Date.now()));
    return () => clearInterval(tick);
  }, [nextAttemptAt]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <View style={s.wrap}>
      <Feather name="clock" size={18} color="#F59E0B" />
      <Text style={s.text}>
        المحاولة التالية بعد: {mins.toString().padStart(2,"0")}:{secs.toString().padStart(2,"0")}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 10, padding: 12 },
  text: { fontSize: 14, color: "#F59E0B", fontWeight: "600" },
});
