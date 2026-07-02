"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getAuthOrRefresh } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Bot, Send, Plus, Trash2, Sparkles, MessageSquare, Menu, Brain, ArrowLeft,
} from "lucide-react";

interface ConversationSummary {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: { role: string; content: string; createdAt: string }[];
}

interface ConversationDetail {
  _id: string;
  userId: string;
  title: string;
  messages: { role: "user" | "model"; content: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

interface AiMessage {
  role: "user" | "model";
  content: string;
  createdAt: string;
}

export default function AiChatPage() {
  const router = useRouter();
  const { t, isRTL, lang } = useLanguage();
  const { showToast } = useToast();

  const [userId, setUserId] = useState<string>("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [convLoading, setConvLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) { router.push("/auth/login"); return; }
      if (cancelled) return;
      setUserId(u.userId ?? "");
      setAuthed(true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!authed) return;
    setConvLoading(true);
    apiFetch<ConversationSummary[]>("/api/ai/chat")
      .then((res) => {
        if (res.success && res.data) setConversations(res.data);
      })
      .catch(() => {})
      .finally(() => setConvLoading(false));
  }, [authed]);

  const loadConversation = useCallback(async (id: string) => {
    setMsgLoading(true);
    try {
      const res = await apiFetch<ConversationDetail>(`/api/ai/chat/${id}`);
      if (res.success && res.data) {
        setMessages(res.data.messages || []);
      }
    } catch { /* silent */ }
    finally { setMsgLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadConversation(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId, loadConversation]);

  useEffect(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !userId || sending) return;

    setSending(true);
    const userMessage: AiMessage = {
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await apiFetch<{ conversationId: string; reply: string; messageCount: number }>(
        "/api/ai/chat",
        {
          method: "POST",
          body: JSON.stringify({
            message: text,
            conversationId: selectedId || undefined,
          }),
        }
      );

      if (res.success && res.data) {
        const { reply, conversationId } = res.data;
        const replyMessage: AiMessage = {
          role: "model",
          content: reply,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, replyMessage]);

        if (!selectedId) {
          setSelectedId(conversationId);
          setConversations((prev) => [
            {
              _id: conversationId,
              title: text.slice(0, 60),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: [{ role: "model", content: reply, createdAt: "" }],
            },
            ...prev,
          ]);
        } else {
          setConversations((prev) =>
            prev.map((c) =>
              c._id === conversationId
                ? { ...c, updatedAt: new Date().toISOString(), messages: [{ role: "model", content: reply, createdAt: "" }] }
                : c
            )
          );
        }
      } else {
        showToast(res.error || t("ai_chat.error"), "error");
        setMessages((prev) => prev.filter((m) => m !== userMessage));
      }
    } catch (err) {
      showToast((err as Error).message || t("ai_chat.error"), "error");
      setMessages((prev) => prev.filter((m) => m !== userMessage));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await apiFetch(`/api/ai/chat/${id}`, { method: "DELETE" });
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c._id !== id));
        if (selectedId === id) {
          setSelectedId(null);
          setMessages([]);
        }
        showToast(t("ai_chat.conversation_deleted"), "success");
      } else {
        showToast(res.error || t("ai_chat.error"), "error");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
    setDeleteTarget(null);
  }

  function handleNewConversation() {
    setSelectedId(null);
    setMessages([]);
    setInput("");
    setSidebarOpen(false);
  }

  function handleMobileBack() {
    setSelectedId(null);
    setMessages([]);
  }

  if (loading) return null;

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      <nav className="sticky top-0 z-50 glass border-b border-border/20 px-3 sm:px-6 py-2 sm:py-3 shrink-0">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group">
            <Image
              src="/logo.svg"
              alt="UNIQUE"
              width={28}
              height={28}
              className="w-5 h-5 sm:w-7 sm:h-7 shrink-0 transition-transform duration-300 group-hover:scale-110"
            />
            <span className="text-base sm:text-xl font-bold gradient-text">
              {t("common.brand")}
            </span>
            <span className="text-[10px] font-bold bg-gradient-to-r from-primary to-secondary text-white px-2 py-0.5 rounded-full shadow-lg shadow-primary/30">
              AI
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {renderSidebar()}

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
              onClick={() => setSidebarOpen(false)}
            />
            <div className={`absolute top-0 ${isRTL ? "right-0" : "left-0"} h-full w-72 bg-surface border-r border-border shadow-2xl animate-slide-in-left ${isRTL ? "animate-slide-in-right" : ""}`}>
              {renderSidebar()}
            </div>
          </div>
        )}

        <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-background via-background to-primary/5">
          {selectedId && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface/50 lg:hidden shrink-0">
              <button
                onClick={handleMobileBack}
                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <ArrowLeft className={`w-4 h-4 text-text-primary ${isRTL ? "rotate-180" : ""}`} />
              </button>
              <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                <Menu className="w-4 h-4 text-text-primary" />
              </button>
              <Bot className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-text-primary text-xs truncate">
                {conversations.find((c) => c._id === selectedId)?.title || t("ai_chat.new_conversation")}
              </span>
            </div>
          )}

          {!selectedId && !sidebarOpen && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface/50 lg:hidden shrink-0">
              <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                <Menu className="w-4 h-4 text-text-primary" />
              </button>
              <Bot className="w-4 h-4 text-primary" />
              <span className="font-semibold text-text-primary text-xs">{t("ai_chat.title")}</span>
            </div>
          )}

          {!selectedId && messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md stagger-children">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center animate-float shadow-lg shadow-primary/10">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2 gradient-text">{t("ai_chat.title")}</h2>
                <p className="text-text-secondary mb-2">{t("ai_chat.subtitle")}</p>
                <p className="text-sm text-text-muted mb-6">{t("ai_chat.select_conversation")}</p>
                <button
                  onClick={handleNewConversation}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                  {t("ai_chat.new_conversation")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden lg:flex px-3 sm:px-6 py-2 sm:py-3 border-b border-border bg-surface/40 items-center gap-2 sm:gap-3 shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0 shadow-lg shadow-primary/20">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-text-primary text-xs sm:text-sm lg:text-base truncate">
                    {conversations.find((c) => c._id === selectedId)?.title || t("ai_chat.new_conversation")}
                  </h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
                {msgLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? (isRTL ? "justify-start" : "justify-end") : (isRTL ? "justify-end" : "justify-start")}`}>
                        <div className={`h-16 w-3/5 shimmer rounded-2xl ${i % 2 === 0 ? "rounded-br-sm" : "rounded-bl-sm"}`} />
                      </div>
                    ))}
                  </div>
                )}
                {!msgLoading && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-3">
                      <MessageSquare className="w-8 h-8 text-text-muted" />
                    </div>
                    <p className="text-text-secondary text-sm">{t("ai_chat.empty_chat")}</p>
                    <p className="text-text-muted text-xs mt-1">{t("ai_chat.input_placeholder")}</p>
                  </div>
                )}
                {!msgLoading && messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={i}
                      className={`flex ${
                        isUser
                          ? isRTL ? "justify-start" : "justify-end"
                          : isRTL ? "justify-end" : "justify-start"
                      } slide-up`}
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <div
                        className={`max-w-[88%] sm:max-w-[75%] lg:max-w-[65%] ${
                          isUser
                            ? `bg-gradient-to-r from-primary to-primary-dark text-white rounded-2xl ${
                                isRTL ? "rounded-br-sm" : "rounded-bl-sm"
                              } shadow-lg shadow-primary/20`
                            : `bg-surface/80 backdrop-blur-sm border border-border/60 text-text-primary rounded-2xl ${
                                isRTL ? "rounded-bl-sm" : "rounded-br-sm"
                              } shadow-lg shadow-black/5`
                        } px-4 py-3 transition-all duration-200 hover:shadow-xl`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {isUser ? (
                            <span className="text-xs font-semibold opacity-80 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                              {t("ai_chat.you")}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-primary flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              {t("ai_chat.ai")}
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                            </span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed whitespace-pre-line break-words ${
                          isUser ? "text-white/90" : "text-text-primary"
                        }`}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {sending && (
                  <div className={`flex ${isRTL ? "justify-end" : "justify-start"} slide-up`}>
                    <div className="max-w-[75%] bg-surface/80 backdrop-blur-sm border border-border/60 rounded-2xl rounded-bl-sm px-4 py-3 shadow-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Bot className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold text-primary">{t("ai_chat.ai")}</span>
                      </div>
                      <div className="flex gap-1.5 py-1">
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </>
          )}

          <div className="p-2 sm:p-4 border-t border-border bg-surface/30 shrink-0 backdrop-blur-sm">
            <div className="flex items-end gap-2 max-w-3xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("ai_chat.input_placeholder")}
                className="flex-1 bg-surface border-2 border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all hover:border-primary/20"
                dir={isRTL ? "rtl" : "ltr"}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="p-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("ai_chat.delete_title")}
        message={t("ai_chat.delete_confirm")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );

  function renderSidebar() {
    return (
      <aside className={`hidden lg:flex flex-col shrink-0 h-full ${isRTL ? "border-l" : "border-r"} border-border bg-surface/30 backdrop-blur-sm`}
        style={{ width: sidebarOpen ? "16rem" : "16rem" }}
      >
        <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-sm p-3 lg:p-4 border-b border-border flex items-center justify-between gap-1">
          <h2 className="text-sm lg:text-base font-semibold text-text-primary flex items-center gap-1.5 lg:gap-2">
            <Brain className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary" />
            <span className="truncate">{t("ai_chat.conversations")}</span>
            <span className="text-[10px] font-medium text-text-muted bg-surface-hover px-1.5 py-0.5 rounded-full">
              {conversations.length}
            </span>
          </h2>
          <button
            onClick={handleNewConversation}
            className="p-1.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/20 hover:scale-110 active:scale-95 transition-all duration-200 shrink-0"
            title={t("ai_chat.new_conversation")}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-1 scrollbar-thin">
          {convLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 shimmer rounded-xl" />
          ))}
          {!convLoading && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-primary/40" />
              </div>
              <p className="text-text-muted text-sm mb-1">{t("ai_chat.no_conversations")}</p>
              <p className="text-text-muted/60 text-xs mb-4">{t("ai_chat.subtitle")}</p>
              <button
                onClick={handleNewConversation}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("ai_chat.new_conversation")}
              </button>
            </div>
          )}
          {!convLoading && conversations.map((conv) => {
            const isActive = selectedId === conv._id;
            const lastMsg = conv.messages?.[0]?.content;
            return (
              <div key={conv._id} className="relative group">
                <button
                  onClick={() => { setSelectedId(conv._id); setSidebarOpen(false); }}
                  className={`w-full text-right p-2 lg:p-3 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 text-text-primary shadow-lg shadow-primary/5"
                      : "bg-surface/50 border-border/60 hover:bg-surface-hover hover:border-primary/20 text-text-secondary hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-xs lg:text-sm truncate flex items-center gap-1">
                      <MessageSquare className={`w-3 h-3 shrink-0 ${isActive ? "text-primary" : "text-text-muted"}`} />
                      {conv.title}
                    </span>
                  </div>
                  {lastMsg && (
                    <p className="text-[10px] lg:text-xs text-text-muted/80 truncate mt-1 text-right line-clamp-1">
                      {lastMsg.slice(0, 80)}{lastMsg.length > 80 ? "..." : ""}
                    </p>
                  )}
                  <p className="text-[9px] text-text-muted/50 mt-1 text-left">
                    {new Date(conv.updatedAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(conv._id); }}
                  className="absolute top-1 left-1 p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title={t("common.delete")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </aside>
    );
  }
}
