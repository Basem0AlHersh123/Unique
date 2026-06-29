import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { LanguageProvider } from "@/lib/i18n/context";
import { ThemeProvider, useTheme } from "@/lib/theme/context";
import AlertModal from "@/lib/ui/AlertModal";

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { mode, colors } = useTheme();

  return (
    <>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false }} />
      <AlertModal />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    async function load() {
      try {
        await Font.loadAsync({
          Cairo_400Regular: require("@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf"),
          Cairo_700Bold: require("@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf"),
        });
      } catch {
        // use system default
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    load();
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <RootLayoutInner />
      </LanguageProvider>
    </ThemeProvider>
  );
}
