"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import {
  Menu,
  LogOut,
  BarChart3,
  GraduationCap,
  BookOpen,
  Layers,
  HelpCircle,
  Users,
  UserCheck,
  MessageCircle,
  Sparkles,
  GitBranch,
  FolderOpen,
  Building2,
  Image as ImageIcon,
  Mail,
  ChevronRight,
  ArrowLeft,
  Megaphone,
  Settings,
  Shield,
  BookMarked,
  CreditCard,
  ClipboardList,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getAuthOrRefresh } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t, lang, isRTL } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: t("admin.title"), icon: BarChart3 },
    { href: "/admin/universities", label: t("admin.universities"), icon: Building2 },
    { href: "/admin/colleges", label: t("admin.colleges"), icon: GraduationCap },
    { href: "/admin/subjects", label: t("admin.subjects"), icon: BookOpen },
    { href: "/admin/levels", label: t("admin.levels"), icon: GitBranch },
    { href: "/admin/units", label: t("admin.units"), icon: FolderOpen },
    { href: "/admin/topics", label: t("admin.topics"), icon: Layers },
    { href: "/admin/questions", label: t("admin.questions"), icon: HelpCircle },
    { href: "/admin/vocabulary", label: lang === "ar" ? "المفردات" : "Vocabulary", icon: BookMarked },
    { href: "/admin/students", label: t("admin.students"), icon: Users },
    { href: "/admin/teachers", label: t("admin.teachers"), icon: UserCheck },
    { href: "/admin/groups", label: t("nav.groups"), icon: MessageCircle },
    { href: "/admin/ai", label: t("admin.ai_settings"), icon: Sparkles },
    {
      href: "/admin/payments",
      label: lang === "ar" ? "المدفوعات" : "Payments",
      icon: CreditCard,
    },
    {
      href: "/admin/exam-results",
      label: lang === "ar" ? "نتائج الاختبارات" : "Exam Results",
      icon: ClipboardList,
    },
    {
      href: "/admin/cms",
      label: lang === "ar" ? "محتوى الموقع" : "Site Content",
      icon: ImageIcon,
    },
    {
      href: "/admin/contact-messages",
      label: lang === "ar" ? "رسائل التواصل" : "Contact Messages",
      icon: Mail,
    },
    {
      href: "/admin/announcements",
      label: lang === "ar" ? "الإعلانات" : "Announcements",
      icon: Megaphone,
    },
    {
      href: "/admin/app-settings",
      label: lang === "ar" ? "إعدادات التطبيق" : "App Settings",
      icon: Settings,
    },
  ];

  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_sidebar_collapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) {
        router.push("/auth/login");
        setLoading(false);
        return;
      }
      if (u.role !== "admin") {
        localStorage.removeItem("accessToken");
        router.push("/auth/login");
        setLoading(false);
        return;
      }
      if (!cancelled) setIsAuthed(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthed) return null;

  const sidebar = (
    <aside
      className={`flex flex-col dark:bg-[#0d0a30]/90 bg-white/95 backdrop-blur-xl dark:border-r dark:border-[#6C63FF]/15 border-r border-border shrink-0 h-full overflow-y-auto transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <NextImage
            src="/logo.svg"
            alt="UNIQUE"
            width={sidebarCollapsed ? 24 : 28}
            height={sidebarCollapsed ? 24 : 28}
            className="shrink-0"
          />
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
            }`}
          >
            <h1 className="text-xl font-bold gradient-text whitespace-nowrap">
              UNIQUE
            </h1>
          </div>
          <button
            onClick={() =>
              setSidebarCollapsed((c) => {
                const newVal = !c;
                localStorage.setItem("admin_sidebar_collapsed", String(newVal));
                return newVal;
              })
            }
              className={`p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors ${
              sidebarCollapsed ? "mx-auto" : "mr-auto"
            }`}
            title={
              lang === "ar"
                ? sidebarCollapsed
                  ? "توسيع القائمة"
                  : "طي القائمة"
                : sidebarCollapsed
                ? "Expand menu"
                : "Collapse menu"
            }
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-300 ${
                sidebarCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? "max-h-0 opacity-0" : "max-h-8 opacity-100"
          }`}
        >
          <p className="text-xs text-text-secondary mt-0.5 mr-auto whitespace-nowrap">
            {t("admin.title")}
          </p>
        </div>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const tooltip =
            lang === "ar" ? item.label : item.label.split("/").pop() || item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? tooltip : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10"
                  : "text-text-secondary hover:text-primary hover:bg-primary/5"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span
                className={`truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  sidebarCollapsed ? "max-w-0 opacity-0 w-0" : "max-w-[160px] opacity-100"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors group"
          title={
            sidebarCollapsed
              ? lang === "ar"
                ? "العودة للموقع"
                : "Back to site"
              : undefined
          }
        >
          <ArrowLeft
            className={`w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-1 ${
              isRTL ? "" : "rotate-180"
            }`}
          />
          <span
            className={`truncate transition-all duration-300 ease-in-out overflow-hidden ${
              sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
            }`}
          >
            {t("admin.back")}
          </span>
        </Link>
        <button
          onClick={() => setLogoutConfirm(true)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-danger transition-colors group"
          title={
            sidebarCollapsed
              ? lang === "ar"
                ? "تسجيل الخروج"
                : "Logout"
              : undefined
          }
        >
          <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          <span
            className={`truncate transition-all duration-300 ease-in-out overflow-hidden ${
              sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
            }`}
          >
            {t("admin.logout")}
          </span>
        </button>
      </div>
    </aside>
  );

  function confirmLogout() {
    localStorage.removeItem("accessToken");
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:flex shrink-0 transition-all duration-300">
        {sidebar}
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full animate-slide-in-right">
            {sidebar}
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border lg:hidden bg-surface/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <Menu className="w-5 h-5 text-text-primary" />
            </button>
            <NextImage
              src="/logo.svg"
              alt="UNIQUE"
              width={22}
              height={22}
              className="shrink-0"
            />
            <h1 className="text-lg font-bold gradient-text">UNIQUE</h1>
          </div>
          <span className="text-xs text-text-muted bg-primary/10 px-2 py-1 rounded-full">
            {t("admin.title")}
          </span>
        </div>

        <div className="p-4 sm:p-6 overflow-auto">{children}</div>
      </main>

      <ConfirmDialog
        open={logoutConfirm}
        title={t("logout.title")}
        message={t("logout.message")}
        confirmLabel={t("logout.confirm")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirm(false)}
      />
    </div>
  );
}