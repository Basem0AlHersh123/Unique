"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, LogOut, BookOpen, HelpCircle, MessageCircle, BarChart3, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getAuthOrRefresh } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

function TeacherLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navItems = [
    { href: "/teacher/dashboard", label: t("teacher.stats"), icon: BarChart3 },
    { href: "/teacher/dashboard?tab=subjects", label: t("teacher.subjects"), icon: BookOpen },
    { href: "/teacher/dashboard?tab=questions", label: t("teacher.questions"), icon: HelpCircle },
    { href: "/teacher/dashboard?tab=groups", label: t("teacher.groups"), icon: MessageCircle },
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
      if (!u) { router.push("/auth/login"); setLoading(false); return; }
      if (u.role !== "teacher" && u.role !== "admin") {
        localStorage.removeItem("accessToken");
        router.push("/auth/login");
        setLoading(false);
        return;
      }
      if (!cancelled) setIsAuthed(true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    setSidebarOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthed) return null;

  const sidebar = (
    <aside className={`flex flex-col bg-surface border-l border-border shrink-0 h-full overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-64"}`}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="UNIQUE" width={28} height={28} className="shrink-0" />
          {!sidebarCollapsed && <h1 className="text-xl font-bold text-primary">UNIQUE</h1>}
        </div>
        {!sidebarCollapsed && <p className="text-xs text-text-muted mt-0.5">{t("teacher.title")}</p>}
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = fullUrl === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={`flex items-center justify-center lg:justify-start gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                sidebarCollapsed ? "px-0" : "px-4"
              } ${
                isActive
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border flex flex-col gap-2">
        <button
          onClick={() => setSidebarCollapsed(c => {
            const newVal = !c;
            localStorage.setItem("teacher_sidebar_collapsed", String(newVal));
            return newVal;
          })}
          className="flex items-center justify-center w-full p-3 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors rounded-lg"
          title={sidebarCollapsed ? (lang === "ar" ? "توسيع القائمة" : "Expand menu") : (lang === "ar" ? "طي القائمة" : "Collapse menu")}
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} />
          {!sidebarCollapsed && <span className="text-xs mr-2">{lang === "ar" ? "طي القائمة" : "Collapse"}</span>}
        </button>
        <Link
          href="/dashboard"
          className="flex items-center justify-center lg:justify-start gap-2 text-sm text-text-muted hover:text-primary transition-colors"
          title={sidebarCollapsed ? t("admin.back") : undefined}
        >
          {!sidebarCollapsed && t("admin.back")}
        </Link>
        <button
          onClick={() => setLogoutConfirm(true)}
          className="flex items-center justify-center lg:justify-start gap-2 text-sm text-text-muted hover:text-danger transition-colors"
          title={sidebarCollapsed ? t("admin.logout") : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && t("admin.logout")}
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
      <div className="hidden lg:flex shrink-0 transition-all duration-300">{sidebar}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 h-full">{sidebar}</div>
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
            <Image src="/logo.svg" alt="UNIQUE" width={22} height={22} className="shrink-0" />
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
