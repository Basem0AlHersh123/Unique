import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Image, Easing } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { getStoredUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

export default function Index() {
  const router = useRouter();

  const logoScale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(1)).current;
  const subtitleY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const dots = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 3,
        tension: 25,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 600,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleY, {
        toValue: 0,
        duration: 600,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1.15,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dots, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(dots, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(async () => {
      try {
        // Step 1: Check if university has been picked
        const universityId = await SecureStore.getItemAsync("unique_university_id");
        if (!universityId) {
          router.replace("/university-picker" as any);
          return;
        }

        // Step 2: Check if college has been picked
        const collegeId = await SecureStore.getItemAsync("unique_college_id");
        if (!collegeId) {
          router.replace("/college-picker" as any);
          return;
        }

        // Step 3: Check if user is logged in
        const user = await getStoredUser();
        if (!user) {
          router.replace("/(auth)/login" as any);
          return;
        }

        // Step 4: Register push notifications in background
        try {
          const { registerForPushNotifications } = await import("@/lib/notifications");
          registerForPushNotifications()
            .then(pushToken => {
              if (pushToken) {
                apiFetch("/api/auth/profile", {
                  method: "PATCH",
                  body: { pushToken },
                }).catch(() => {});
              }
            })
            .catch(() => {});
        } catch {}

        // Step 5: Go to app
        router.replace("/(app)/" as any);
      } catch {
        router.replace("/(auth)/login" as any);
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [router]);

  const dot1 = dots.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0.3, 1, 0.3, 0.3],
  });
  const dot2 = dots.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0.3, 0.3, 1, 0.3],
  });
  const dot3 = dots.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0.3, 0.3, 0.3, 1],
  });

  return (
    <View style={s.safe}>
      {/* glow ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          s.glowRing,
          {
            opacity: fadeIn,
            transform: [{ scale: glow }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          s.glowRing2,
          {
            opacity: Animated.multiply(
              glow.interpolate({ inputRange: [1, 1.15], outputRange: [0.3, 0.7] }),
              fadeIn
            ),
            transform: [{ scale: glow }],
          },
        ]}
      />

      {/* logo */}
      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: fadeIn }}>
        <View style={s.logoWrap}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={s.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* brand */}
      <Animated.View style={{ opacity: fadeIn }}>
        <Text style={s.brand}>UNIQUE</Text>
      </Animated.View>

      {/* subtitle */}
      <Animated.View style={{ opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] }}>
        <Text style={s.subtitle}>منصة التعلم الذكي</Text>
      </Animated.View>

      {/* loading dots */}
      <View style={s.dotsRow}>
        <Animated.View style={[s.dot, { opacity: dot1 }]} />
        <Animated.View style={[s.dot, { opacity: dot2 }]} />
        <Animated.View style={[s.dot, { opacity: dot3 }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0f0a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  glowRing: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(108,99,255,0.06)",
    top: 85,
  },
  glowRing2: {
    position: "absolute",
    top: 97,
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 2,
    borderColor: "rgba(108,99,255,0.15)",
  },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: "rgba(108,99,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(108,99,255,0.15)",
  },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 28,
  },
  brand: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 20,
    letterSpacing: 4,
    textShadowColor: "rgba(108,99,255,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  subtitle: {
    fontSize: 15,
    color: "#94a3b8",
    marginTop: 8,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 40,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#6C63FF",
  },
});
