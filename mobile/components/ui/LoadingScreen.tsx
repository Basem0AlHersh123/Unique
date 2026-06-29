import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoadingScreen({ message }: { message?: string }) {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <ActivityIndicator color="#6C63FF" size="large" />
        {message && <Text style={s.msg}>{message}</Text>}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0a2e" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  msg: { fontSize: 14, color: "#94a3b8" },
});
