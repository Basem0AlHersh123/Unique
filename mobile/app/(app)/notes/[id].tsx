import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";
import type { StudentNote, NoteType } from "@/lib/types";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { showAlert } from "@/lib/ui/AlertModal";

const COLORS = ["#6C63FF", "#06B6D4", "#EC4899", "#F59E0B", "#22C55E", "#EF4444"];

const NOTE_TYPES: { key: NoteType; label: TranslationKey; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "general", label: "notes.type_general", icon: "feather" },
  { key: "question", label: "notes.type_question", icon: "help-circle" },
  { key: "summary", label: "notes.type_summary", icon: "file-text" },
  { key: "important", label: "notes.type_important", icon: "alert-circle" },
];

export default function NoteEditorScreen() {
  const { id, lessonId, lessonTitle } = useLocalSearchParams<{ id: string; lessonId?: string; lessonTitle?: string }>();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { colors } = useTheme();
  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#6C63FF");
  const [type, setType] = useState<NoteType>("general");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isStarred, setIsStarred] = useState(false);
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lessonTitle) setTitle(lessonTitle);
  }, [lessonTitle]);

  useEffect(() => {
    if (isNew) return;
    async function load() {
      try {
        const res = await apiFetch<StudentNote>(ENDPOINTS.NOTE(id));
        if (res.success && res.data) {
          setTitle(res.data.title || "");
          setContent(res.data.content);
          setColor(res.data.color || "#6C63FF");
          setType(res.data.type || "general");
          setTags(res.data.tags || []);
          setIsStarred(res.data.isStarred || false);
          if (res.data.reminderAt) setReminderAt(new Date(res.data.reminderAt));
        }
      } catch {
        showAlert({ type: "error", title: t("common.error"), message: t("notes.save_error") });
        router.back();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
  }

  async function handleSave() {
    if (!content.trim()) {
      showAlert({ type: "warning", title: lang === "ar" ? "تنبيه" : "Warning", message: lang === "ar" ? "يرجى كتابة محتوى الملاحظة" : "Please write note content" });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        content: content.trim(),
        color,
        type,
        tags,
        isStarred,
      };
      if (title.trim()) body.title = title.trim();
      if (lessonId) body.lessonId = lessonId;
      if (reminderAt) body.reminderAt = reminderAt.toISOString();

      if (isNew) {
        await apiFetch(ENDPOINTS.NOTES, { method: "POST", body });
      } else {
        await apiFetch(ENDPOINTS.NOTE(id), { method: "PATCH", body });
      }
      router.back();
    } catch {
      showAlert({ type: "error", title: t("common.error"), message: t("notes.save_error") });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-right" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            {isNew ? (lang === "ar" ? "ملاحظة جديدة" : "New Note") : (lang === "ar" ? "تعديل الملاحظة" : "Edit Note")}
          </Text>
          <View style={s.headerRight}>
            <Pressable onPress={() => setIsStarred(!isStarred)} hitSlop={8}>
              <Feather name="star" size={22} color={isStarred ? "#F59E0B" : "#475569"} />
            </Pressable>
            <Pressable style={[s.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>{t("common.save")}</Text>}
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Title input */}
          <TextInput
            style={[s.titleInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            placeholder={t("notes.title_placeholder")}
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            textAlign="right"
          />

          {/* Content input */}
          <TextInput
            style={[s.contentInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            placeholder={t("notes.content_placeholder")}
            placeholderTextColor={colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            textAlign="right"
          />

          {/* Tags */}
          <Text style={[s.label, { color: colors.text }]}>{t("notes.tags")}</Text>
          <View style={s.tagInputRow}>
            <TextInput
              style={[s.tagInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder={t("notes.tag_placeholder")}
              placeholderTextColor={colors.textTertiary}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              textAlign="right"
            />
            <Pressable style={[s.tagAddBtn, { backgroundColor: colors.accent }]} onPress={addTag}>
              <Feather name="plus" size={18} color="#fff" />
            </Pressable>
          </View>
          {tags.length > 0 ? (
            <View style={s.tagList}>
              {tags.map((tag) => (
                <Pressable key={tag} style={[s.tagChip, { backgroundColor: colors.accent + "20", borderColor: colors.accent + "40" }]} onPress={() => removeTag(tag)}>
                  <Text style={[s.tagChipText, { color: colors.accent }]}>{tag}</Text>
                  <Feather name="x" size={14} color={colors.accent} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={[s.noTags, { color: colors.textTertiary }]}>{t("notes.no_tags")}</Text>
          )}

          {/* Reminder */}
          <Text style={[s.label, { color: colors.text }]}>{t("notes.reminder")}</Text>
          <Pressable
            style={[s.reminderRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => {
              if (Platform.OS === "android") {
                const currentDate = reminderAt || new Date(Date.now() + 3600000);
                DateTimePickerAndroid.open({
                  value: currentDate,
                  mode: "date",
                  is24Hour: true,
                  onChange: (_, date) => {
                    if (date) {
                      const temp = date;
                      DateTimePickerAndroid.open({
                        value: temp,
                        mode: "time",
                        is24Hour: true,
                        onChange: (e2, time) => {
                          if (time) setReminderAt(time);
                        },
                      });
                    }
                  },
                });
              } else {
                setShowReminderPicker(true);
              }
            }}
          >
            <Feather name="bell" size={18} color={reminderAt ? colors.accent : colors.textTertiary} />
            <Text style={[s.reminderText, { color: reminderAt ? colors.text : colors.textTertiary }]}>
              {reminderAt ? reminderAt.toLocaleString(lang === "ar" ? "ar" : "en") : t("notes.reminder_set")}
            </Text>
            {reminderAt && (
              <Pressable onPress={() => setReminderAt(null)}>
                <Feather name="x-circle" size={18} color={colors.danger} />
              </Pressable>
            )}
          </Pressable>

          {/* Color picker */}
          <Text style={[s.label, { color: colors.text }]}>{t("notes.color_picker")}</Text>
          <View style={s.colorRow}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                style={[s.colorSwatch, { backgroundColor: c }, color === c && s.colorSwatchSel]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* Note Type selector */}
          <Text style={[s.label, { color: colors.text }]}>{t("notes.type")}</Text>
          <View style={s.typeRow}>
            {NOTE_TYPES.map((nt) => (
              <Pressable
                key={nt.key}
                style={[
                  s.typePill,
                  { borderColor: type === nt.key ? "#6C63FF" : "#2d1f6e", backgroundColor: type === nt.key ? "#6C63FF20" : "#1a1040" },
                ]}
                onPress={() => setType(nt.key)}
              >
                <Feather name={nt.icon} size={14} color={type === nt.key ? "#6C63FF" : "#94a3b8"} />
                <Text style={[s.typePillText, { color: type === nt.key ? "#6C63FF" : "#94a3b8", fontFamily: type === nt.key ? "Cairo_700Bold" : "Cairo_400Regular" }]}>
                  {t(nt.label)}
                </Text>
              </Pressable>
            ))}
          </View>

        </ScrollView>

        {showReminderPicker && Platform.OS === "ios" && (
          <DateTimePicker
            value={reminderAt || new Date(Date.now() + 3600000)}
            mode="datetime"
            is24Hour={true}
            onChange={(_, date) => {
              setShowReminderPicker(false);
              if (date) setReminderAt(date);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "bold", textAlign: "center", flex: 1, fontFamily: "Cairo_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  saveText: { fontSize: 14, fontWeight: "700", color: "#ffffff", fontFamily: "Cairo_700Bold" },
  scroll: { padding: 16 },
  label: { fontSize: 14, fontWeight: "600", textAlign: "right", marginBottom: 8, marginTop: 16, fontFamily: "Cairo_400Regular" },
  typeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  typePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: "#2d1f6e", backgroundColor: "#1a1040",
  },
  typePillText: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  titleInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 17, fontWeight: "600", marginBottom: 12, textAlign: "right", fontFamily: "Cairo_700Bold" },
  contentInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 200, textAlign: "right", lineHeight: 22, fontFamily: "Cairo_400Regular" },
  tagInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  tagInput: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, textAlign: "right", fontFamily: "Cairo_400Regular" },
  tagAddBtn: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tagChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  tagChipText: { fontSize: 13, fontWeight: "600", fontFamily: "Cairo_400Regular" },
  noTags: { fontSize: 13, marginTop: 8, fontFamily: "Cairo_400Regular" },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  reminderText: { flex: 1, fontSize: 14, textAlign: "right", fontFamily: "Cairo_400Regular" },
  colorRow: { flexDirection: "row", gap: 12, justifyContent: "center", marginBottom: 40 },
  colorSwatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: "transparent" },
  colorSwatchSel: { borderColor: "#ffffff", transform: [{ scale: 1.15 }] },
});
