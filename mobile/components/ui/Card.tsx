import { View, StyleSheet, type ViewStyle } from "react-native";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "gold" | "success" | "danger";
  padding?: number;
}

const VARIANT_BORDER: Record<string, string> = {
  default: "#2d1f6e",
  gold:    "rgba(245,158,11,0.35)",
  success: "rgba(34,197,94,0.35)",
  danger:  "rgba(239,68,68,0.35)",
};

export default function Card({ children, style, variant = "default", padding = 16 }: CardProps) {
  return (
    <View style={[
      s.card,
      { borderColor: VARIANT_BORDER[variant], padding },
      style,
    ]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#1a1040",
    borderRadius: 16,
    borderWidth: 1,
  },
});
