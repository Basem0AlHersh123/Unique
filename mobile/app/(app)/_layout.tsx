import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getStoredUser } from "@/lib/auth";

const REFRESH_TOKEN_KEY = "unique_refresh_token";
const ACCESS_TOKEN_KEY  = "unique_access_token";

export default function AppLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        // Try to get a valid (non-expired) user first
        const user = await getStoredUser();
        if (user) {
          setChecking(false);
          return;
        }

        // User is null — either no token or token is expired.
        // Before kicking to login, check if a refresh token exists.
        // If it does, the user IS authenticated — they just have an
        // expired access token. Let them into the app; api.ts will
        // auto-refresh on the first API call.
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        const accessToken  = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

        if (refreshToken || accessToken) {
          // Has tokens — let them in. If truly expired and online, api.ts
          // will refresh. If offline, cached data will display.
          setChecking(false);
          return;
        }

        // No tokens at all — this person has never logged in
        router.replace("/(auth)/login" as any);
      } catch {
        // On unexpected errors, still allow access if any token exists
        const hasAnyToken = !!(await SecureStore.getItemAsync(REFRESH_TOKEN_KEY));
        if (!hasAnyToken) {
          router.replace("/(auth)/login" as any);
        }
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
