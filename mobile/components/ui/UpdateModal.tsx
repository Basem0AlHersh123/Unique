import { Modal, View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

interface UpdateModalProps {
  visible: boolean;
  message: string;
  updateUrl: string;
}

export default function UpdateModal({ visible, message, updateUrl }: UpdateModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <LinearGradient
          colors={["#1a1040", "#231557", "#1a1040"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.iconWrap}>
            <View style={styles.iconGlow} />
            <Feather name="smartphone" size={28} color="#6C63FF" />
          </View>

          <Text style={styles.title}>يتطلب تحديث</Text>
          <Text style={styles.subtitle}>Update Required</Text>

          <View style={styles.divider} />

          <Text style={styles.message}>{message}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => updateUrl && Linking.openURL(updateUrl)}
          >
            <Feather name="download" size={18} color="#fff" style={{ marginLeft: 8 }} />
            <Text style={styles.buttonText}>تحديث الآن</Text>
          </Pressable>

          <Text style={styles.hint}>
            يجب تحديث التطبيق للاستمرار في استخدام الخدمة
          </Text>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.3)",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(108, 99, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  iconGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(108, 99, 255, 0.08)",
  },
  title: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#ffffff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#6C63FF",
    textAlign: "center",
    marginTop: 2,
    letterSpacing: 1,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: "rgba(108, 99, 255, 0.4)",
    borderRadius: 1,
    marginVertical: 18,
  },
  message: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6C63FF",
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
  },
  buttonPressed: {
    backgroundColor: "#5a52e0",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#ffffff",
  },
  hint: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#475569",
    textAlign: "center",
    marginTop: 16,
  },
});
