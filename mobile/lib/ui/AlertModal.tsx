import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Modal, Pressable, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface AlertOptions {
  type?: "success" | "error" | "warning" | "confirm" | "info";
  title: string;
  message: string;
  buttons?: AlertButton[];
}

type AlertListener = (options: AlertOptions) => void;

let alertListener: AlertListener | null = null;

export function showAlert(options: AlertOptions) {
  if (alertListener) alertListener(options);
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof Feather.glyphMap; gradient: string; color: string }> = {
  success: { icon: "check-circle", gradient: "#065F46", color: "#22C55E" },
  error: { icon: "alert-circle", gradient: "#7F1D1D", color: "#EF4444" },
  warning: { icon: "alert-triangle", gradient: "#78350F", color: "#F59E0B" },
  confirm: { icon: "help-circle", gradient: "#312E81", color: "#6C63FF" },
  info: { icon: "info", gradient: "#1E3A5F", color: "#3B82F6" },
};

export default function AlertModal() {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const type = options?.type ?? "info";
  const config = TYPE_CONFIG[type];

  useEffect(() => {
    alertListener = (opts) => {
      setOptions(opts);
      setVisible(true);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    };
    return () => { alertListener = null; };
  }, []);

  function close() {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setOptions(null);
    });
  }

  const handlePress = useCallback((btn?: AlertButton) => {
    const fn = btn?.onPress;
    close();
    if (fn) {
      setTimeout(() => fn(), 200);
    }
  }, []);

  if (!visible || !options) return null;

  const isConfirm = (options.buttons?.length ?? 0) > 0;
  const buttons = options.buttons?.length ? options.buttons : [{ text: "OK", style: "default" as const }];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Top accent bar */}
          <View style={[styles.accentBar, { backgroundColor: config.color }]} />

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: config.color + "20" }]}>
            <Feather name={config.icon} size={32} color={config.color} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{options.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{options.message}</Text>

          {/* Buttons */}
          <View style={[styles.btnRow, buttons.length > 2 && styles.btnRowWrap]}>
            {buttons.map((btn, i) => {
              const isDestructive = btn.style === "destructive";
              const isCancel = btn.style === "cancel";
              const isWrapped = buttons.length > 2;
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.btn,
                    isWrapped && styles.btnFull,
                    isDestructive ? styles.btnDanger : isCancel ? styles.btnCancel : styles.btnPrimary,
                    !isWrapped && styles.btnFlex,
                    !isWrapped && buttons.length > 1 && i === 0 && { marginRight: 8 },
                  ]}
                  onPress={() => handlePress(btn)}
                >
                  <Text
                    style={[
                      styles.btnText,
                      isDestructive && styles.btnTextDanger,
                      isCancel && styles.btnTextCancel,
                      !isDestructive && !isCancel && styles.btnTextPrimary,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#1a1040",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#2d1f6e",
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    paddingTop: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
    overflow: "hidden",
  },
  accentBar: {
    width: "100%",
    height: 4,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: "row",
    width: "100%",
  },
  btnRowWrap: {
    flexDirection: "column",
    gap: 8,
  },
  btn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnFlex: {
    flex: 1,
  },
  btnFull: {
    width: "100%",
  },
  btnPrimary: {
    backgroundColor: "#6C63FF",
  },
  btnDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  btnCancel: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "#2d1f6e",
  },
  btnText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  btnTextPrimary: {
    color: "#ffffff",
  },
  btnTextDanger: {
    color: "#EF4444",
  },
  btnTextCancel: {
    color: "#94a3b8",
  },
});
