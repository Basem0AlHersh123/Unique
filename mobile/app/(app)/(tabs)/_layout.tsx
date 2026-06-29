import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { colors, mode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64 + Math.max(insets.bottom, 14),
          paddingBottom: Math.max(insets.bottom, 14),
          paddingTop: 10,
          paddingHorizontal: 4,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          fontFamily: "Cairo_400Regular",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: lang === "ar" ? "الرئيسية" : "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: lang === "ar" ? "لوحتي" : "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: lang === "ar" ? "مساعد AI" : "AI Tutor",
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: focused ? 54 : 46,
              height: focused ? 54 : 46,
              borderRadius: focused ? 27 : 23,
              backgroundColor: focused ? "#6C63FF" : "#1a1040",
              alignItems: "center",
              justifyContent: "center",
              marginTop: focused ? -14 : -8,
              borderWidth: focused ? 0 : 2,
              borderColor: "#2d1f6e",
              shadowColor: focused ? "#6C63FF" : "transparent",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: focused ? 0.6 : 0,
              shadowRadius: 10,
              elevation: focused ? 8 : 0,
            }}>
              <Text style={{ fontSize: focused ? 24 : 20 }}>✨</Text>
            </View>
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: 10,
              fontFamily: "Cairo_700Bold",
              color: focused ? "#6C63FF" : color,
              marginTop: 2,
            }}>
              {lang === "ar" ? "مساعد AI" : "AI Tutor"}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: t("notes.title"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="edit-3" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: lang === "ar" ? "حسابي" : "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
