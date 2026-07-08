"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  LogOut,
  BookOpen,
  HelpCircle,
  MessageCircle,
  BarChart3,
  ChevronRight,
  Sparkles,
  Users,
  GraduationCap,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getAuthOrRefresh } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

function TeacherLayoutInner({ children }: { children: React.ReactNode }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navItems = [
    {
      href: "/teacher/dashboard",
      label: t("teacher.stats"),
      icon: BarChart3,
    },
    {
      href: "/teacher/dashboard?tab=subjects",
      label: t("teacher.subjects"),
      icon: BookOpen,
    },
    {
      href: "/teacher/dashboard?tab=questions",
      label: t("teacher.questions"),
      icon: HelpCircle,
    },
    {
      href: "/teacher/dashboard?tab=groups",
      label: t("teacher.groups"),
      icon: MessageCircle,
    },
  ];

  const currentSearch = searchParams.toString();
  const fullUrl = pathname + (currentSearch ? `?${currentSearch}` : "");

  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("teacher_sidebar_collapsed");
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
      if (u.role !== "teacher" && u.role !== "admin") {
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
      className={`flex flex-col backdrop-blur-sm border-l border-border shrink-0 h-full overflow-y-auto transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? "w-16" : "w-64"
      } dark:bg-surface/50 bg-white/80`}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Image
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
            <h1 className="text-xl font-bold text-primary whitespace-nowrap">
              UNIQUE
            </h1>
          </div>
          <button
            onClick={() =>
              setSidebarCollapsed((c) => {
                const newVal = !c;
                localStorage.setItem("teacher_sidebar_collapsed", String(newVal));
                return newVal;
              })
            }
            className={`p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors ${
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
          <p className="text-xs text-text-muted mt-0.5 mr-auto whitespace-nowrap">
            {t("teacher.title")}
          </p>
        </div>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = fullUrl === item.href;
          const tooltip =
            lang === "ar" ? item.label : item.label.split("/").pop() || item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? tooltip : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span
                className={`truncate transition-all duration-300 ease-in-out overflow-hidden ${
                  sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
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
          className="flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors"
          title={
            sidebarCollapsed
              ? lang === "ar"
                ? "العودة للموقع"
                : "Back to site"
              : undefined
          }
        >
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
          className="flex items-center gap-2 text-sm text-text-muted hover:text-danger transition-colors"
          title={
            sidebarCollapsed
              ? lang === "ar"
                ? "تسجيل الخروج"
                : "Logout"
              : undefined
          }
        >
          <LogOut className="w-4 h-4 shrink-0" />
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
    <div className="flex min-h-screen">
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

      <main className="flex-1 bg-background min-w-0">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <Menu className="w-5 h-5 text-text-primary" />
            </button>
            <Image
              src="/logo.svg"
              alt="UNIQUE"
              width={22}
              height={22}
              className="shrink-0"
            />
            <h1 className="text-lg font-bold text-primary">UNIQUE</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
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

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TeacherLayoutInner>{children}</TeacherLayoutInner>
    </Suspense>
  );
}