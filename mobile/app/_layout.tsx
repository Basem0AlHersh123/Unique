import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar, Modal, Linking, Pressable, View, Text } from "react-native";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import { LanguageProvider } from "@/lib/i18n/context";
import { ThemeProvider, useTheme } from "@/lib/theme/context";
import AlertModal from "@/lib/ui/AlertModal";
import { isVersionOutdated } from "@/lib/version";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";

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
      <Modal visible={updateRequired} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:"rgba(0,0,0,0.85)", justifyContent:"center", alignItems:"center", padding:32 }}>
          <View style={{ backgroundColor:"#1a1040", borderRadius:24, padding:28, borderWidth:1, borderColor:"#6C63FF", width:"100%", maxWidth:360, alignItems:"center", gap:16 }}>
            <Text style={{ fontSize:48 }}>🚀</Text>
            <Text style={{ fontSize:20, fontFamily:"Cairo_700Bold", color:"#fff", textAlign:"center" }}>تحديث مطلوب</Text>
            <Text style={{ fontSize:14, fontFamily:"Cairo_400Regular", color:"#94a3b8", textAlign:"center", lineHeight:22 }}>{updateMessage}</Text>
            {updateUrl ? (
              <Pressable style={{ backgroundColor:"#6C63FF", paddingHorizontal:32, paddingVertical:14, borderRadius:16, width:"100%", alignItems:"center" }}
                onPress={() => Linking.openURL(updateUrl)}>
                <Text style={{ color:"#fff", fontSize:16, fontFamily:"Cairo_700Bold" }}>تحديث الآن</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal visible={maintenance} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:"rgba(0,0,0,0.9)", justifyContent:"center", alignItems:"center", padding:32 }}>
          <View style={{ backgroundColor:"#1a1040", borderRadius:24, padding:28, borderWidth:1, borderColor:"#F59E0B", width:"100%", maxWidth:360, alignItems:"center", gap:16 }}>
            <Text style={{ fontSize:48 }}>🔧</Text>
            <Text style={{ fontSize:20, fontFamily:"Cairo_700Bold", color:"#fff", textAlign:"center" }}>تحت الصيانة</Text>
            <Text style={{ fontSize:14, fontFamily:"Cairo_400Regular", color:"#94a3b8", textAlign:"center", lineHeight:22 }}>{maintenanceMessage}</Text>
          </View>
        </View>
      </Modal>
      <AlertModal />
    </ThemeProvider>
  );
}
