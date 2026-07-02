"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { apiFetch } from "@/lib/api";
import {
  Send,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  CheckCircle,
  Clock,
  User,
} from "lucide-react";

export default function ContactPage() {
  const { t, isRTL } = useLanguage();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await apiFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res.success) {
        setSent(true);
        setForm({ name: "", email: "", message: "" });
      } else {
        setError(res.error || "حدث خطأ");
      }
    } catch {
      setError("حدث خطأ في إرسال الرسالة");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 border-b border-border/20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20 slide-up">
            <MessageSquare className="w-4 h-4" />
            {isRTL ? "تواصل معنا" : "Contact Us"}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary mb-4 slide-up" style={{ animationDelay: "0.05s" }}>
            {isRTL ? "تواصل معنا" : "Contact Us"}
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed slide-up" style={{ animationDelay: "0.1s" }}>
            {isRTL
              ? "لديك سؤال أو اقتراح؟ نحن هنا لمساعدتك"
              : "Have a question or suggestion? We're here to help"}
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="slide-up">
              <h2 className="text-2xl font-bold text-text-primary mb-6">
                {isRTL ? "معلومات التواصل" : "Contact Information"}
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-surface rounded-2xl border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary mb-1">
                      {isRTL ? "البريد الإلكتروني" : "Email"}
                    </p>
                    <a
                      href="mailto:info@unique.edu"
                      className="text-primary hover:underline text-sm"
                    >
                      info@unique.edu
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-surface rounded-2xl border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary mb-1">
                      {isRTL ? "الهاتف" : "Phone"}
                    </p>
                    <a
                      href="tel:+966123456789"
                      className="text-primary hover:underline text-sm"
                    >
                      +966 123 456 789
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-surface rounded-2xl border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary mb-1">
                      {isRTL ? "العنوان" : "Address"}
                    </p>
                    <p className="text-text-secondary text-sm">
                      {t("footer.address")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="slide-up" style={{ animationDelay: "0.1s" }}>
              <h2 className="text-2xl font-bold text-text-primary mb-6">
                {isRTL ? "أرسل لنا رسالة" : "Send Us a Message"}
              </h2>

              {sent ? (
                <div className="p-8 bg-surface rounded-2xl border border-border text-center scale-in">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-teal" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">
                    {isRTL ? "تم إرسال الرسالة" : "Message Sent!"}
                  </h3>
                  <p className="text-text-secondary mb-4">
                    {isRTL
                      ? "شكراً لتواصلك معنا، سنرد عليك في أقرب وقت"
                      : "Thank you for contacting us. We'll get back to you soon."}
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    {isRTL ? "إرسال رسالة أخرى" : "Send another message"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      {isRTL ? "الاسم" : "Name"}
                    </label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        required
                        minLength={2}
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                        placeholder={isRTL ? "الاسم الكامل" : "Full name"}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      {isRTL ? "البريد الإلكتروني" : "Email"}
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        required
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                        placeholder="example@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      {isRTL ? "الرسالة" : "Message"}
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      required
                      minLength={10}
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10 resize-none"
                      placeholder={isRTL
                        ? "اكتب رسالتك هنا..."
                        : "Write your message here..."}
                    />
                  </div>

                  {error && (
                    <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-medium hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {sending
                      ? isRTL
                        ? "جاري الإرسال..."
                        : "Sending..."
                      : isRTL
                      ? "إرسال"
                      : "Send"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/20 py-8 bg-surface mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="UNIQUE"
              width={28}
              height={28}
              className="shrink-0"
            />
            <span className="text-lg font-bold gradient-text">
              {t("common.brand")}
            </span>
          </div>
          <p className="text-sm text-text-muted">
            {t("footer.copyright")} {new Date().getFullYear()} {t("common.brand")}
          </p>
        </div>
      </footer>
    </main>
  );
}