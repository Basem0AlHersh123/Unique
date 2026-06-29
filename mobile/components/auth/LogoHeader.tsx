import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Image, Easing } from "react-native";
import { Feather } from "@expo/vector-icons";

const SPARKLE_SIZE = 16;

export default function LogoHeader() {
  const mount = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const glow = useRef(new Animated.Value(1)).current;
  const subtitleY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0.5)).current;
  const s3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 3,
      tension: 30,
      useNativeDriver: true,
    }).start();

    Animated.timing(mount, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleY, {
        toValue: 0,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1.12, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    Animated.loop(
      Animated.sequence([
        Animated.timing(s1, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(s1, { toValue: 0, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(s2, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(s2, { toValue: 0, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(s3, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(s3, { toValue: 0, duration: 3500, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowScale = glow.interpolate({
    inputRange: [1, 1.12],
    outputRange: [1, 1.12],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [1, 1.12],
    outputRange: [0.35, 0.7],
  });

  const r1 = s1.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const r2 = s2.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] });
  const r3 = s3.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] });

  return (
    <View style={styles.wrap}>
      {/* sparkles */}
      <Animated.View style={[styles.sparkle, { top: -8, right: -4, opacity: s1, transform: [{ rotate: r1 }] }]}>
        <Feather name="star" size={SPARKLE_SIZE} color="#F59E0B" />
      </Animated.View>
      <Animated.View style={[styles.sparkle, { top: 20, left: -12, opacity: s2, transform: [{ rotate: r2 }] }]}>
        <Feather name="star" size={SPARKLE_SIZE - 2} color="#6C63FF" />
      </Animated.View>
      <Animated.View style={[styles.sparkle, { bottom: -10, right: 20, opacity: s3, transform: [{ rotate: r3 }] }]}>
        <Feather name="zap" size={SPARKLE_SIZE} color="#F59E0B" />
      </Animated.View>

      {/* pulsing glow ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowOuter,
          {
            opacity: mount,
            transform: [{ scale: glowScale }],
          },
        ]}
      >
        <View style={styles.glowInner} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowRing2,
          {
            opacity: Animated.multiply(glowOpacity, mount),
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* logo */}
      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: mount }}>
        <View style={styles.logoWrap}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* UNIQUE title — neon glow via layered shadows */}
      <Animated.View style={{ opacity: mount }}>
        <Text style={styles.title}>UNIQUE</Text>
      </Animated.View>

      {/* subtitle */}
      <Animated.View style={{ opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] }}>
        <Text style={styles.subtitle}>منصة التعلم الذكي</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 28,
    paddingTop: 20,
    position: "relative",
  },
  sparkle: {
    position: "absolute",
    zIndex: 10,
  },
  glowOuter: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    top: 0,
  },
  glowInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(108,99,255,0.08)",
  },
  glowRing2: {
    position: "absolute",
    top: 12,
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    borderColor: "rgba(108,99,255,0.2)",
  },
  logoWrap: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: "rgba(108,99,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(108,99,255,0.15)",
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 18,
    letterSpacing: 3,
    textShadowColor: "rgba(108,99,255,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 6,
    fontFamily: "Cairo_400Regular",
  },
});
