import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getStoredUser, saveUser, clearTokens, type AuthUser } from "@/lib/auth";
import * as SecureStore from "expo-secure-store";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { scheduleDailyReminder, cancelDailyReminder } from "@/lib/notifications";
import apiClient, { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme, type ThemeMode } from "@/lib/theme/context";
import { STORAGE_KEYS as STORAGE } from "@/constants/config";
import { showAlert } from "@/lib/ui/AlertModal";

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  icon,
  isDanger,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  icon: keyof typeof Feather.glyphMap;
  isDanger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={styles.settingsRight}>
        <Feather name={icon} size={20} color={isDanger ? colors.danger : colors.textSecondary} />
        <Text
          style={[
            styles.settingsLabel,
            { color: colors.text },
            isDanger && { color: colors.danger },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.settingsLeft}>
        {value && <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{value}</Text>}
        {!isDanger && <Feather name="chevron-left" size={18} color={colors.textTertiary} />}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
  const { mode, setMode, colors, toggle: toggleTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [dailyGoal, setDailyGoal] = useState(1);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [essentialMode, setEssentialMode] = useState(false);
  const [profileImage, setProfileImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const u = await getStoredUser();
      setUser(u);
      if (u) {
        try {
          const profileRes = await apiFetch<{ profileImage?: string }>(ENDPOINTS.PROFILE);
          if (profileRes.success && profileRes.data?.profileImage) {
            setProfileImage(profileRes.data.profileImage);
          }
        } catch { /* silent */ }
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadPrefs() {
      const on = await SecureStore.getItemAsync("unique_reminder_on");
      const time = await SecureStore.getItemAsync("unique_reminder_time");
      const goal = await SecureStore.getItemAsync("unique_daily_goal");
      setReminderEnabled(on === "true");
      if (time) {
        const [h, m] = time.split(":").map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0);
        setReminderTime(d);
      }
      if (goal) setDailyGoal(parseInt(goal, 10) || 1);

      const em = await SecureStore.getItemAsync("unique_essential_mode");
      setEssentialMode(em === "true");

      try {
        const prog = await apiFetch<{ stats: { totalScore: number; averagePercentage: number } }>(ENDPOINTS.PROGRESS_DASHBOARD);
        if (prog.success && prog.data?.stats) {
          setProgressPct(Math.round(prog.data.stats.averagePercentage));
          setTotalXP(prog.data.stats.totalScore);
        }
      } catch { /* silent */ }

      try {
        const notesRes = await apiFetch<unknown[]>(ENDPOINTS.NOTES);
        if (notesRes.success && notesRes.data) setNoteCount(notesRes.data.length);
      } catch { /* silent */ }
    }
    loadPrefs();
  }, []);

  const initial = (user?.name ?? "?")[0];

  async function handleImagePick() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert({ type: "error", title: "خطأ", message: "يجب منح إذن الوصول إلى معرض الصور" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingImage(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: asset.mimeType ?? "image/jpeg",
        name: "profile.jpg",
      } as any);

      const uploadRes = await apiClient.post<{ success: boolean; data?: { url: string } }>(
        "/api/admin/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (uploadRes.data.success && uploadRes.data.data?.url) {
        const url = uploadRes.data.data.url;
        setProfileImage(url);
        await apiFetch(ENDPOINTS.UPDATE_PROFILE, {
          method: "PATCH",
          body: { profileImage: url },
        });
      }
    } catch {
      showAlert({ type: "error", title: "خطأ", message: "فشل رفع الصورة، حاول مرة أخرى" });
    } finally {
      setUploadingImage(false);
    }
  }

  function handleLogout() {
    showAlert({
      type: "confirm",
      title: t("profile.logout_title"),
      message: t("profile.logout_confirm"),
      buttons: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.logout"),
          style: "destructive",
          onPress: async () => {
            await clearTokens();
            router.replace("/(auth)/login" as any);
          },
        },
      ],
    });
  }

  function handleDeleteAccount() {
    showAlert({
      type: "info",
      title: lang === "ar" ? "حذف الحساب" : "Delete Account",
      message: lang === "ar" ? "لحذف حسابك، يرجى التواصل مع الدعم الفني." : "To delete your account, please contact support.",
      buttons: [{ text: t("common.ok") }],
    });
  }

  const roleLabel =
    user?.role === "admin"
      ? t("profile.admin")
      : user?.role === "teacher"
        ? t("profile.teacher")
        : t("profile.student");

  const tierLabel = user?.tier === "paid" ? t("profile.paid") : t("profile.free");
  const tierColor = user?.tier === "paid" ? "#F59E0B" : colors.textSecondary;

  async function handleToggleReminder(val: boolean) {
    setReminderEnabled(val);
    await SecureStore.setItemAsync("unique_reminder_on", val ? "true" : "false");
    if (val) {
      const h = reminderTime.getHours().toString().padStart(2, "0");
      const m = reminderTime.getMinutes().toString().padStart(2, "0");
      const timeStr = `${h}:${m}`;
      await scheduleDailyReminder(timeStr, dailyGoal);
      await SecureStore.setItemAsync("unique_reminder_time", timeStr);
      apiFetch("/api/auth/profile", { method: "PATCH", body: { studyReminderEnabled: true, studyReminderTime: timeStr, dailyGoal } }).catch(() => {});
    } else {
      await cancelDailyReminder();
      apiFetch("/api/auth/profile", { method: "PATCH", body: { studyReminderEnabled: false } }).catch(() => {});
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowEditSheet(true)}
          >
            <Feather name="edit-2" size={18} color={colors.accent} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {lang === "ar" ? "حسابي" : "My Account"}
          </Text>
          <Pressable
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowSettingsSheet(true)}
          >
            <Feather name="settings" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* ── Avatar Section ── */}
        <View style={styles.avatarSection}>
          <Pressable onPress={handleImagePick} style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarInitial}>{user?.name?.charAt(0)?.toUpperCase() ?? "U"}</Text>
              </View>
            )}
            {uploadingImage ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : (
              <View style={styles.avatarEdit}>
                <Feather name="camera" size={14} color="#fff" />
              </View>
            )}
          </Pressable>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name ?? t("profile.student")}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email ?? ""}</Text>
          <View style={styles.badgeRow}>
            <Badge label={roleLabel} color={colors.accent} />
            <Badge label={tierLabel} color={tierColor} />
          </View>
        </View>

        {/* ── Progress Card ── */}
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.progressCardInner}>
            <View>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {lang === "ar" ? "التقدم الكلي" : "Overall Progress"}
              </Text>
              <Text style={[styles.progressSub, { color: colors.text }]}>
                {lang === "ar" ? "جميع المواد" : "All subjects"}
              </Text>
            </View>
            <View style={[styles.circleProgress, { borderColor: colors.accent }]}>
              <Text style={[styles.circleProgressText, { color: colors.accent }]}>{progressPct}%</Text>
            </View>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {[
            { emoji: "🔥", value: String((user as any)?.streak ?? 0), label: lang === "ar" ? "يوم متواصل" : "Day Streak" },
            { emoji: "⭐", value: String(totalXP), label: lang === "ar" ? "نقاط XP" : "XP Points" },
            { emoji: "📓", value: String(noteCount), label: lang === "ar" ? "ملاحظة" : "Notes" },
          ].map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.statEmoji}>{stat.emoji}</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Danger Zone ── */}
        <Pressable style={[styles.logoutBtn, { borderColor: colors.danger, backgroundColor: lang === "ar" ? "rgba(239, 68, 68, 0.08)" : "transparent" }]} onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>{t("profile.logout")}</Text>
        </Pressable>

        <Pressable style={[styles.deleteBtn, { borderColor: colors.danger }]} onPress={handleDeleteAccount}>
          <Feather name="trash-2" size={20} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>
            {lang === "ar" ? "حذف الحساب" : "Delete Account"}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal visible={showLangPicker} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("profile.language")}</Text>
            {(["ar", "en"] as const).map((l) => (
              <Pressable
                key={l}
                style={[
                  styles.langOption,
                  { backgroundColor: lang === l ? colors.accent : colors.inputBg },
                ]}
                onPress={() => { setLang(l); setShowLangPicker(false); }}
              >
                <Text style={[
                  styles.langOptionText,
                  { color: lang === l ? "#ffffff" : colors.text },
                ]}>
                  {l === "ar" ? "العربية" : "English"}
                </Text>
                {lang === l && <Feather name="check" size={18} color="#ffffff" />}
              </Pressable>
            ))}
            <Pressable style={styles.modalCancel} onPress={() => setShowLangPicker(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Theme Picker Modal */}
      <Modal visible={showThemePicker} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("profile.theme")}</Text>
            {(["dark", "light"] as ThemeMode[]).map((m) => (
              <Pressable
                key={m}
                style={[
                  styles.langOption,
                  { backgroundColor: mode === m ? colors.accent : colors.inputBg },
                ]}
                onPress={() => { setMode(m); setShowThemePicker(false); }}
              >
                <Text style={[
                  styles.langOptionText,
                  { color: mode === m ? "#ffffff" : colors.text },
                ]}>
                  {m === "dark" ? t("profile.dark") : t("profile.light")}
                </Text>
                {mode === m && <Feather name="check" size={18} color="#ffffff" />}
              </Pressable>
            ))}
            <Pressable style={styles.modalCancel} onPress={() => setShowThemePicker(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("settings.change_password")}</Text>

            <TextInput
              style={[styles.pwInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder={t("settings.current_password")}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              textAlign={lang === "ar" ? "right" : "left"}
            />
            <TextInput
              style={[styles.pwInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder={t("settings.new_password")}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              textAlign={lang === "ar" ? "right" : "left"}
            />
            <TextInput
              style={[styles.pwInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder={t("settings.confirm_password")}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              textAlign={lang === "ar" ? "right" : "left"}
            />

            {passwordError ? (
              <Text style={[styles.pwError, { color: colors.danger }]}>{passwordError}</Text>
            ) : null}

            <Pressable
              style={[styles.modalBtn, { backgroundColor: colors.accent }, passwordLoading && { opacity: 0.5 }]}
              disabled={passwordLoading}
              onPress={async () => {
                setPasswordError("");
                if (!currentPassword || !newPassword || !confirmPassword) {
                  setPasswordError(t("settings.fill_all_fields"));
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setPasswordError(t("settings.password_mismatch"));
                  return;
                }
                if (newPassword.length < 8) {
                  setPasswordError(t("settings.password_min_length"));
                  return;
                }
                setPasswordLoading(true);
                try {
                  await apiFetch(ENDPOINTS.CHANGE_PASSWORD, {
                    method: "POST",
                    body: { currentPassword, newPassword },
                  });
                  setShowPasswordModal(false);
                  showAlert({ type: "success", title: t("common.success"), message: t("settings.password_success") });
                } catch (e: unknown) {
                  setPasswordError(e instanceof Error ? e.message : t("common.error"));
                } finally {
                  setPasswordLoading(false);
                }
              }}
            >
              <Text style={styles.modalBtnText}>{t("settings.save")}</Text>
            </Pressable>

            <Pressable
              style={styles.modalCancel}
              onPress={() => setShowPasswordModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Settings Sheet ── */}
      <Modal visible={showSettingsSheet} transparent animationType="slide" onRequestClose={() => setShowSettingsSheet(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowSettingsSheet(false)} />
        <View style={[styles.sheetBody, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {lang === "ar" ? "الإعدادات" : "Settings"}
          </Text>

          <View style={[styles.settingsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingsRow
              label={lang === "ar" ? "تغيير الجامعة" : "Change University"}
              icon="globe"
              onPress={async () => {
                showAlert({
                  type: "confirm",
                  title: lang === "ar" ? "تغيير الجامعة" : "Change University",
                  message: lang === "ar" ? "هل تريد تغيير جامعتك؟ ستختار كلية جديدة بعد ذلك." : "Change your university? You'll pick a new college after.",
                  buttons: [
                    { text: lang === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
                    {
                      text: lang === "ar" ? "تغيير" : "Change",
                      onPress: async () => {
                        await SecureStore.deleteItemAsync("unique_university_id");
                        await SecureStore.deleteItemAsync("unique_college_id");
                        router.replace("/university-picker" as any);
                      },
                    },
                  ],
                });
              }}
            />
            <SettingsRow
              label={t("profile.change_college")}
              icon="refresh-cw"
              onPress={async () => {
                showAlert({
                  type: "confirm",
                  title: t("profile.change_college"),
                  message: t("profile.change_college_confirm"),
                  buttons: [
                    { text: t("common.cancel"), style: "cancel" },
                    { text: t("profile.change_college_action"), onPress: async () => {
                      await SecureStore.deleteItemAsync("unique_college_id");
                      router.replace("/college-picker" as any);
                    }},
                  ],
                });
              }}
            />
            <SettingsRow
              label={t("profile.language")}
              value={lang === "ar" ? "العربية" : "English"}
              icon="globe"
              onPress={() => setShowLangPicker(true)}
            />
            <SettingsRow
              label={t("profile.theme")}
              value={mode === "dark" ? t("profile.dark") : t("profile.light")}
              icon={mode === "dark" ? "moon" : "sun"}
              onPress={() => setShowThemePicker(true)}
            />
          </View>

          <View style={[styles.settingsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingsRight}>
                <Feather name="bookmark" size={20} color={colors.textSecondary} />
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>
                    {lang === "ar" ? "وضع الدروس الأساسية" : "Essential Lessons Mode"}
                  </Text>
                  <Text style={[styles.settingsSub, { color: colors.textTertiary }]}>
                    {lang === "ar" ? "عرض الدروس الأساسية فقط" : "Show only essential lessons for quick review"}
                  </Text>
                </View>
              </View>
              <Switch
                value={essentialMode}
                onValueChange={async (val) => {
                  setEssentialMode(val);
                  await SecureStore.setItemAsync("unique_essential_mode", val ? "true" : "false");
                }}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={[styles.settingsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingsRight}>
                <Feather name="bell" size={20} color={colors.textSecondary} />
                <Text style={[styles.settingsLabel, { color: colors.text }]}>{t("profile.reminder")}</Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#fff"
              />
            </View>
            {reminderEnabled && (
              <>
                <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]} onPress={() => {
                  if (Platform.OS === "android") {
                    DateTimePickerAndroid.open({
                      value: reminderTime,
                      mode: "time",
                      is24Hour: true,
                      onChange: (_, date) => {
                        if (date) setReminderTime(date);
                      },
                    });
                  } else {
                    setShowTimePicker(true);
                  }
                }}>
                  <View style={styles.settingsRight}>
                    <Feather name="clock" size={20} color={colors.textSecondary} />
                    <Text style={[styles.settingsLabel, { color: colors.text }]}>{t("profile.reminder_time")}</Text>
                  </View>
                  <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>
                    {reminderTime.getHours().toString().padStart(2,"0")}:{reminderTime.getMinutes().toString().padStart(2,"0")}
                  </Text>
                </Pressable>
                <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.settingsRight}>
                    <Feather name="target" size={20} color={colors.textSecondary} />
                    <Text style={[styles.settingsLabel, { color: colors.text }]}>{t("profile.daily_goal")}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Pressable onPress={() => setDailyGoal(g => Math.max(1, g - 1))}><Feather name="minus-circle" size={22} color={colors.accent} /></Pressable>
                    <Text style={{ color: colors.text, fontWeight: "bold", fontSize: 16, minWidth: 20, textAlign: "center", fontFamily: "Cairo_700Bold" }}>{dailyGoal}</Text>
                    <Pressable onPress={() => setDailyGoal(g => Math.min(20, g + 1))}><Feather name="plus-circle" size={22} color={colors.accent} /></Pressable>
                  </View>
                </View>
              </>
            )}
            {showTimePicker && Platform.OS === "ios" && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={true}
                onChange={(_, date) => {
                  setShowTimePicker(false);
                  if (date) setReminderTime(date);
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Edit Profile Sheet ── */}
      <Modal visible={showEditSheet} transparent animationType="slide" onRequestClose={() => setShowEditSheet(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowEditSheet(false)} />
        <View style={[styles.sheetBody, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {lang === "ar" ? "تعديل الحساب" : "Edit Profile"}
          </Text>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handleImagePick} style={styles.avatarContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
                  <Text style={styles.avatarInitial}>{user?.name?.charAt(0)?.toUpperCase() ?? "U"}</Text>
                </View>
              )}
              {uploadingImage ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : (
                <View style={styles.avatarEdit}>
                  <Feather name="camera" size={14} color="#fff" />
                </View>
              )}
            </Pressable>
          </View>

          {/* Name edit */}
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={[styles.nameInput, { color: colors.text, borderBottomColor: colors.accent }]}
                value={nameInput}
                onChangeText={setNameInput}
                textAlign="center"
                autoFocus
              />
              <Pressable onPress={async () => {
                if (!nameInput.trim() || !user) return;
                try {
                  await apiFetch(ENDPOINTS.UPDATE_PROFILE, { method: "PATCH", body: { name: nameInput.trim() } });
                  await saveUser({ ...user, name: nameInput.trim() });
                  const updated = await getStoredUser();
                  if (updated) setUser(updated);
                  setEditingName(false);
                  showAlert({ type: "success", title: t("common.success"), message: t("settings.name_saved") });
                } catch {
                  showAlert({ type: "error", title: t("common.error"), message: t("settings.name_error") });
                }
              }}>
                <Feather name="check" size={22} color={colors.success} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { setEditingName(true); setNameInput(user?.name ?? ""); }} style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.name, { color: colors.text }]}>{user?.name ?? t("profile.student")}</Text>
            </Pressable>
          )}

          {/* Change password button */}
          <SettingsRow
            label={t("settings.password")}
            icon="lock"
            onPress={() => {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setPasswordError("");
              setShowPasswordModal(true);
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  sheetOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheetBody: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, padding: 20, paddingBottom: 40,
    maxHeight: "80%",
    position: "absolute", bottom: 0, left: 0, right: 0,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#2d1f6e", alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17, fontWeight: "700",
    fontFamily: "Cairo_700Bold", textAlign: "center",
    marginBottom: 16,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
    width: 90,
    height: 90,
    alignSelf: "center",
    marginBottom: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#6C63FF",
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 32,
    color: "#fff",
    fontFamily: "Cairo_700Bold",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEdit: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#6C63FF",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0f0a2e",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    fontFamily: "Cairo_700Bold",
  },
  email: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    fontFamily: "Cairo_400Regular",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Cairo_400Regular",
  },
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  progressCardInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    marginBottom: 4,
  },
  progressSub: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
  },
  circleProgress: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  circleProgressText: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statEmoji: {
    fontSize: 22,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
  },
  settingsSection: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Cairo_400Regular",
  },
  settingsSub: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    marginTop: 2,
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settingsValue: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    borderBottomWidth: 1,
    minWidth: 120,
    fontFamily: "Cairo_700Bold",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    width: "90%",
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    fontFamily: "Cairo_700Bold",
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
  },
  langOptionText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Cairo_400Regular",
  },
  pwInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
  },
  pwError: {
    fontSize: 14,
    textAlign: "right",
    fontFamily: "Cairo_400Regular",
  },
  modalBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  modalCancel: {
    alignItems: "center",
    paddingVertical: 6,
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
  },
  settingsHint: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    lineHeight: 18,
  },
});
