import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar, Modal, View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import { LanguageProvider } from "@/lib/i18n/context";
import { ThemeProvider, useTheme } from "@/lib/theme/context";
import AlertModal from "@/lib/ui/AlertModal";
import UpdateModal from "@/components/ui/UpdateModal";
import { isVersionOutdated } from "@/lib/version";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";
import { subscribeToNetwork, flushPendingNotes } from "@/lib/offline";

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { mode, colors } = useTheme();

  return (
    <>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false }} />
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

  useEffect(() => {
    // Flush any notes created while offline as soon as we come back online
    const unsubscribe = subscribeToNetwork(async (online) => {
      if (online) {
        await flushPendingNotes();
      }
    });
    return unsubscribe;
  }, []);

  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("يرجى تحديث التطبيق للاستمرار");
  const [updateUrl, setUpdateUrl] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  useEffect(() => {
    async function checkAppConfig() {
      try {
        const res = await apiFetch<{
          minAppVersion: string;
          updateMessage: string;
          updateUrl: string;
          forceUpdateEnabled: boolean;
          maintenanceMode: boolean;
          maintenanceMessage: string;
        }>(ENDPOINTS.APP_CONFIG);
        if (!res.success || !res.data) return;
        const cfg = res.data;
        if (cfg.maintenanceMode) { setMaintenanceMessage(cfg.maintenanceMessage); setMaintenance(true); return; }
        if (cfg.forceUpdateEnabled) {
          const currentVersion = Constants.expoConfig?.version ?? "1.0.0";
          if (isVersionOutdated(currentVersion, cfg.minAppVersion)) {
            setUpdateMessage(cfg.updateMessage);
            setUpdateUrl(cfg.updateUrl);
            setUpdateRequired(true);
          }
        }
      } catch {}
    }
    checkAppConfig();
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <RootLayoutInner />
      </LanguageProvider>
      <UpdateModal
        visible={updateRequired}
        message={updateMessage}
        updateUrl={updateUrl}
      />
      <Modal visible={maintenance} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.maintenanceOverlay}>
          <LinearGradient
            colors={["#1a1040", "#231557", "#1a1040"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.maintenanceCard}
          >
            <View style={styles.maintenanceIconWrap}>
              <Feather name="tool" size={28} color="#F59E0B" />
            </View>
            <Text style={styles.maintenanceTitle}>تحت الصيانة</Text>
            <Text style={styles.maintenanceSubtitle}>Under Maintenance</Text>
            <View style={styles.maintenanceDivider} />
            <Text style={styles.maintenanceMessage}>{maintenanceMessage}</Text>
          </LinearGradient>
        </View>
      </Modal>
      <AlertModal />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  maintenanceOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  maintenanceCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  maintenanceIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  maintenanceTitle: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#ffffff",
    textAlign: "center",
  },
  maintenanceSubtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#F59E0B",
    textAlign: "center",
    marginTop: 2,
    letterSpacing: 1,
  },
  maintenanceDivider: {
    width: 40,
    height: 2,
    backgroundColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: 1,
    marginVertical: 18,
  },
  maintenanceMessage: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
  },
});
