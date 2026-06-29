//app/(app)/_layout.tsx
import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { getStoredUser } from "@/lib/auth";

export default function AppLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getStoredUser();
        if (!user) {
          router.replace("/(auth)/login" as any);
          return;
        }
      } catch {
        router.replace("/(auth)/login" as any);
        return;
      } finally {
        setChecking(false);
      }
    }
    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f0a2e", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
