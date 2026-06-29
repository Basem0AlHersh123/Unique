import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

export type ToastVariant = "success" | "error" | "info";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const VARIANT_CONFIG = {
  success: { color: "#22C55E", icon: "check-circle" as const, bg: "rgba(34,197,94,0.15)" },
  error:   { color: "#EF4444", icon: "x-circle" as const,    bg: "rgba(239,68,68,0.15)" },
  info:    { color: "#6C63FF", icon: "info" as const,         bg: "rgba(108,99,255,0.15)" },
};

export default function Toast({
  message,
  variant = "info",
  visible,
  onHide,
  duration = 3000,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(duration - 400),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onHide());
  }, [visible]);

  if (!visible) return null;

  const cfg = VARIANT_CONFIG[variant];

  return (
    <Animated.View style={[s.wrap, { opacity, backgroundColor: cfg.bg, borderColor: cfg.color + "40" }]}>
      <Feather name={cfg.icon} size={18} color={cfg.color} />
      <Text style={[s.text, { color: cfg.color }]}>{message}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    zIndex: 999,
  },
  text: { fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" },
});
