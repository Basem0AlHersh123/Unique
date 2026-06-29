import { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";
import type { AiConversation, AiMessage } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { showAlert } from "@/lib/ui/AlertModal";
export default function AiChatTab() {
  const { lang } = useLanguage();
  const { colors } = useTheme();

  const [view, setView] = useState<"list" | "chat">("list");
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);

  const flatRef = useRef<FlatList<AiMessage>>(null);

  useFocusEffect(useCallback(() => {
    loadConversations();
  }, []));

  async function loadConversations() {
    setLoadingList(true);
    try {
      const res = await apiFetch<AiConversation[]>(ENDPOINTS.AI_CHAT);
      if (res.success && res.data) setConversations(res.data);
    } catch {}
    finally { setLoadingList(false); }
  }

  async function openConversation(conv: AiConversation) {
    setLoadingChat(true);
    setView("chat");
    setActiveConvId(conv._id);
    try {
      const res = await apiFetch<AiConversation>(ENDPOINTS.AI_CHAT_CONV(conv._id));
      if (res.success && res.data) {
        setMessages(res.data.messages);
      }
    } catch {}
    finally { setLoadingChat(false); }
  }

  function startNewConversation() {
    setActiveConvId(null);
    setMessages([]);
    setInput("");
    setView("chat");
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const userMsg: AiMessage = { role: "user", content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setAiTyping(true);

    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await apiFetch<{ conversationId: string; reply: string; messageCount: number }>(
        ENDPOINTS.AI_CHAT,
        {
          method: "POST",
          body: { message: text, conversationId: activeConvId ?? undefined },
        }
      );

      if (res.success && res.data) {
        if (!activeConvId) {
          setActiveConvId(res.data.conversationId);
        }
        const aiMsg: AiMessage = {
          role: "model",
          content: res.data.reply,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMsg]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      const errorMsg: AiMessage = {
        role: "model",
        content: err instanceof Error ? err.message : "حدث خطأ، حاول مرة أخرى",
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
      setAiTyping(false);
    }
  }

  async function deleteConversation(id: string) {
    showAlert({
      type: "confirm",
      title: lang === "ar" ? "حذف المحادثة" : "Delete Conversation",
      message: lang === "ar" ? "هل تريد حذف هذه المحادثة نهائياً؟" : "Delete this conversation permanently?",
      buttons: [
        { text: lang === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: lang === "ar" ? "حذف" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(ENDPOINTS.AI_CHAT_CONV(id), { method: "DELETE" });
              setConversations(prev => prev.filter(c => c._id !== id));
            } catch {}
          },
        },
      ],
    });
  }

  function renderMessage({ item }: { item: AiMessage }) {
    const isUser = item.role === "user";
    return (
      <View style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowAi]}>
        {!isUser && (
          <View style={s.aiAvatar}>
            <Text style={{ fontSize: 16 }}>✨</Text>
          </View>
        )}
        <View style={[s.msgBubble, isUser ? s.bubbleUser : s.bubbleAi]}>
          <Text style={[s.msgText, isUser ? s.msgTextUser : s.msgTextAi]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  }

  if (view === "chat") {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={[s.chatHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => { setView("list"); loadConversations(); }} style={s.backBtn}>
            <Feather name="arrow-right" size={22} color={colors.text} />
          </Pressable>
          <View style={s.aiHeaderInfo}>
            <Text style={s.aiHeaderName}>✨ مساعد UNIQUE</Text>
            <Text style={s.aiHeaderSub}>متاح دائماً للمساعدة</Text>
          </View>
          <Pressable onPress={startNewConversation} style={s.newChatBtn}>
            <Feather name="plus" size={20} color="#6C63FF" />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={90}
        >
          {loadingChat ? (
            <View style={s.center}>
              <ActivityIndicator color="#6C63FF" size="large" />
            </View>
          ) : (
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={(_, i) => i.toString()}
              renderItem={renderMessage}
              contentContainerStyle={s.msgList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={s.emptyChat}>
                  <Text style={s.emptyChatEmoji}>🧠</Text>
                  <Text style={s.emptyChatTitle}>مساعدك الذكي</Text>
                  <Text style={s.emptyChatSub}>اسألني عن أي شيء — رياضيات، لغات، أو أي سؤال في بالك</Text>
                  {["ما هي مشتقات الدالة؟", "كيف أكتب مقال باللغة الإنجليزية؟", "اشرح لي قانون أوم"].map((s, i) => (
                    <Pressable key={i} style={sug.chip} onPress={() => setInput(s)}>
                      <Text style={sug.chipText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              }
              onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {aiTyping && (
            <View style={[s.msgRow, s.msgRowAi]}>
              <View style={s.aiAvatar}><Text style={{ fontSize: 16 }}>✨</Text></View>
              <View style={[s.msgBubble, s.bubbleAi]}>
                <View style={s.typingDots}>
                  <View style={[s.dot, s.dot1]} />
                  <View style={[s.dot, s.dot2]} />
                  <View style={[s.dot, s.dot3]} />
                </View>
              </View>
            </View>
          )}

          <View style={[s.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <Pressable
              style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnOff]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
            >
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Feather name="send" size={18} color="#fff" />
              }
            </Pressable>
            <TextInput
              style={[s.textInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              value={input}
              onChangeText={setInput}
              placeholder={lang === "ar" ? "اكتب سؤالك..." : "Type your question..."}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={2000}
              textAlign="right"
              onSubmitEditing={handleSend}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.listHeader, { borderBottomColor: colors.border }]}>
        <Text style={[s.listTitle, { color: colors.text }]}>✨ مساعد UNIQUE</Text>
        <Pressable style={s.newBtn} onPress={startNewConversation}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={s.newBtnText}>محادثة جديدة</Text>
        </Pressable>
      </View>

      {loadingList ? (
        <View style={s.center}><ActivityIndicator color="#6C63FF" size="large" /></View>
      ) : conversations.length === 0 ? (
        <View style={s.emptyList}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🤖</Text>
          <Text style={[s.emptyListTitle, { color: colors.text }]}>لا توجد محادثات بعد</Text>
          <Text style={[s.emptyListSub, { color: colors.textSecondary }]}>ابدأ محادثة جديدة مع مساعدك الذكي</Text>
          <Pressable style={s.startBtn} onPress={startNewConversation}>
            <Text style={s.startBtnText}>ابدأ الآن ✨</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c._id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={[s.convCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openConversation(item)}
              onLongPress={() => deleteConversation(item._id)}
            >
              <View style={s.convCardLeft}>
                <View style={s.convIcon}>
                  <Text style={{ fontSize: 20 }}>✨</Text>
                </View>
              </View>
              <View style={s.convCardBody}>
                <Text style={[s.convTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.messages?.[0] && (
                  <Text style={[s.convPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.messages[0].content}
                  </Text>
                )}
              </View>
              <Feather name="chevron-left" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const sug = StyleSheet.create({
  chip: {
    backgroundColor: "#1a1040",
    borderWidth: 1,
    borderColor: "#2d1f6e",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    alignSelf: "center",
  },
  chipText: { fontSize: 13, color: "#94a3b8", fontFamily: "Cairo_400Regular", textAlign: "center" },
});

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  listHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  listTitle: { fontSize: 20, fontFamily: "Cairo_700Bold" },
  newBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#6C63FF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  newBtnText: { color: "#fff", fontSize: 13, fontFamily: "Cairo_700Bold" },

  emptyList: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyListTitle: { fontSize: 18, fontFamily: "Cairo_700Bold", marginBottom: 8 },
  emptyListSub: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "center", marginBottom: 24 },
  startBtn: {
    backgroundColor: "#6C63FF", paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 24,
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  startBtnText: { color: "#fff", fontSize: 16, fontFamily: "Cairo_700Bold" },

  convCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14,
  },
  convCardLeft: {},
  convIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#6C63FF20", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#6C63FF40",
  },
  convCardBody: { flex: 1 },
  convTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", textAlign: "right", marginBottom: 3 },
  convPreview: { fontSize: 12, fontFamily: "Cairo_400Regular", textAlign: "right" },

  chatHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  aiHeaderInfo: { flex: 1 },
  aiHeaderName: { fontSize: 15, fontFamily: "Cairo_700Bold", color: "#fff", textAlign: "right" },
  aiHeaderSub: { fontSize: 11, color: "#22C55E", fontFamily: "Cairo_400Regular", textAlign: "right" },
  newChatBtn: { padding: 6 },

  msgList: { padding: 16, gap: 12, paddingBottom: 8 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowUser: { justifyContent: "flex-start" },
  msgRowAi: { justifyContent: "flex-end" },

  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#6C63FF20",
    borderWidth: 1, borderColor: "#6C63FF40",
    alignItems: "center", justifyContent: "center",
  },

  msgBubble: { maxWidth: "78%", borderRadius: 18, padding: 12 },
  bubbleUser: {
    backgroundColor: "#6C63FF",
    borderBottomLeftRadius: 4,
  },
  bubbleAi: {
    backgroundColor: "#1a1040",
    borderWidth: 1, borderColor: "#2d1f6e",
    borderBottomRightRadius: 4,
  },
  msgText: { fontSize: 14, lineHeight: 22, fontFamily: "Cairo_400Regular" },
  msgTextUser: { color: "#fff", textAlign: "right" },
  msgTextAi: { color: "#cbd5e1", textAlign: "right" },

  typingDots: { flexDirection: "row", gap: 4, paddingVertical: 4, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#6C63FF" },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1,
  },
  textInput: {
    flex: 1, borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, fontFamily: "Cairo_400Regular",
    maxHeight: 120, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#6C63FF",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  sendBtnOff: { backgroundColor: "#2d1f6e", shadowOpacity: 0 },

  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, paddingTop: 60 },
  emptyChatEmoji: { fontSize: 56, marginBottom: 16 },
  emptyChatTitle: { fontSize: 20, fontFamily: "Cairo_700Bold", color: "#fff", marginBottom: 8 },
  emptyChatSub: {
    fontSize: 14, color: "#94a3b8", fontFamily: "Cairo_400Regular",
    textAlign: "center", marginBottom: 24, lineHeight: 22,
  },
});
