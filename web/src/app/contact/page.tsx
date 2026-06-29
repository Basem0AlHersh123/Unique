"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { apiFetch } from "@/lib/api";
import { Send, Mail, Phone, MapPin, MessageSquare, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const { t } = useLanguage();
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

      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 border-b border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            <MessageSquare className="w-4 h-4" />
            تواصل معنا
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary mb-4">
            تواصل معنا
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            لديك سؤال أو اقتراح؟ نحن هنا لمساعدتك
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-6">معلومات التواصل</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-surface rounded-xl border border-border">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary mb-1">البريد الإلكتروني</p>
                    <a href="mailto:info@unique.edu" className="text-primary hover:underline text-sm">info@unique.edu</a>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-surface rounded-xl border border-border">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary mb-1">الهاتف</p>
                    <a href="tel:+966123456789" className="text-primary hover:underline text-sm">+966 123 456 789</a>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-surface rounded-xl border border-border">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary mb-1">العنوان</p>
                    <p className="text-text-secondary text-sm">{t('footer.address')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-6">أرسل لنا رسالة</h2>
              {sent ? (
                <div className="p-8 bg-surface rounded-2xl border border-border text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-teal" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">تم إرسال الرسالة</h3>
                  <p className="text-text-secondary mb-4">شكراً لتواصلك معنا، سنرد عليك في أقرب وقت</p>
                  <button
                    onClick={() => setSent(false)}
                    className="text-primary hover:underline text-sm"
                  >
                    إرسال رسالة أخرى
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">الاسم</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      minLength={2}
                      className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">الرسالة</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required
                      minLength={10}
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 resize-none"
                    />
                  </div>
                  {error && <p className="text-sm text-danger">{error}</p>}
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? "جاري الإرسال..." : "إرسال"}
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
            <Image src="/logo.svg" alt="UNIQUE" width={28} height={28} className="shrink-0" />
            <span className="text-lg font-bold gradient-text">{t('common.brand')}</span>
          </div>
          <p className="text-sm text-text-muted">
            {t('footer.copyright')} {new Date().getFullYear()} {t('common.brand')}
          </p>
        </div>
      </footer>
    </main>
  );
}
