import { useEffect, useState } from "react";
import { View, ActivityIndicator, StatusBar, StyleSheet } from "react-native";
import { Slot, useRouter } from "expo-router";
import { getStoredUser } from "@/lib/auth";

export default function AuthLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getStoredUser().then((user) => {
      if (user) {
        router.replace("/(app)/" as any);
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0a2e" />
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0a2e" />
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0a2e",
  },
  loading: {
    flex: 1,
    backgroundColor: "#0f0a2e",
    justifyContent: "center",
    alignItems: "center",
  },
});
