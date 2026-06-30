"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Mail, User, MessageSquare, CheckCircle, Clock, Search } from "lucide-react";

interface ContactMsg {
  _id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function AdminContactMessagesPage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMsg | null>(null);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<ContactMsg[]>("/api/admin/contact-messages");
      setMessages(res.data ?? []);
    } catch {
      showToast(lang === "ar" ? "حدث خطأ" : "An error occurred", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function markRead(id: string) {
    try {
      await apiFetch("/api/admin/contact-messages", {
        method: "PATCH",
        body: JSON.stringify({ id, read: true }),
      });
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, read: true } : m))
      );
    } catch {
      // silent
    }
  }

  const unread = messages.filter((m) => !m.read).length;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{lang === "ar" ? "رسائل التواصل" : "Contact Messages"}</h2>
          <p className="text-text-secondary mt-1 text-sm">
            {unread > 0 ? (lang === "ar" ? `${unread} رسائل غير مقروءة` : `${unread} unread messages`) : (lang === "ar" ? "جميع الرسائل مقروءة" : "All messages read")}
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "ar" ? "ابحث عن رسالة بالاسم أو البريد..." : "Search by name or email..."}
          className="w-full px-4 py-2 pr-10 rounded-xl bg-background border border-border text-text-primary text-sm outline-none focus:border-primary transition-all"
        />
      </div>
      {messages.length === 0 ? (
        <Card withGlass>
          <div className="text-center py-12 text-text-muted">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            {lang === "ar" ? "لا توجد رسائل بعد" : "No messages yet"}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
            {messages.filter((msg) => {
              if (!search) return true;
              const q = search.toLowerCase();
              return msg.name.toLowerCase().includes(q) || msg.email.toLowerCase().includes(q) || msg.message.toLowerCase().includes(q);
            }).map((msg) => (
              <button
                key={msg._id}
                onClick={() => { setSelected(msg); if (!msg.read) markRead(msg._id); }}
                className={`w-full text-right p-4 rounded-xl border transition-all ${
                  selected?._id === msg._id
                    ? "bg-primary/10 border-primary/30"
                    : msg.read
                    ? "bg-surface border-border hover:bg-surface-hover"
                    : "bg-primary/5 border-primary/20 font-semibold"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm text-text-primary truncate flex items-center gap-1">
                    <User className="w-3 h-3 shrink-0" />
                    {msg.name}
                  </span>
                  {!msg.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-xs text-text-muted truncate">{msg.email}</p>
                <p className="text-xs text-text-muted mt-1 truncate">{msg.message.slice(0, 60)}...</p>
                <p className="text-[10px] text-text-muted mt-1">
                  {new Date(msg.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                </p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <Card withGlass>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-text-primary">{selected.name}</p>
                      <p className="text-sm text-text-muted">{selected.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Clock className="w-3 h-3" />
                    {new Date(selected.createdAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}
                    {selected.read && (
                      <span className="flex items-center gap-1 text-teal">
                        <CheckCircle className="w-3 h-3" /> {lang === "ar" ? "مقروءة" : "Read"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-background rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-2 text-sm text-text-muted">
                    <MessageSquare className="w-4 h-4" />
                    {lang === "ar" ? "الرسالة" : "Message"}
                  </div>
                  <p className="text-text-primary leading-relaxed whitespace-pre-line">
                    {selected.message}
                  </p>
                </div>
              </Card>
            ) : (
              <Card withGlass>
                <div className="text-center py-12 text-text-muted">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  {lang === "ar" ? "اختر رسالة لعرضها" : "Select a message to view"}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
