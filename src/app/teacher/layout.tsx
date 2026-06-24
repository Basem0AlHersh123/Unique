"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, LogOut, BookOpen, HelpCircle, MessageCircle, BarChart3 } from "lucide-react";
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
  const { t } = useLanguage();
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
  const [logoutConfirm, setLogoutConfirm] = useState(false);

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
    <aside className="w-64 bg-surface border-l border-border flex flex-col shrink-0 h-full overflow-y-auto">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="UNIQUE" width={28} height={28} className="shrink-0" />
          <h1 className="text-xl font-bold text-primary">UNIQUE</h1>
        </div>
        <p className="text-xs text-text-muted mt-0.5">{t("teacher.title")}</p>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = fullUrl === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                isActive
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="text-sm text-text-muted hover:text-primary transition-colors"
        >
          {t("admin.back")}
        </Link>
        <button
          onClick={() => setLogoutConfirm(true)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-danger transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t("admin.logout")}
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
      <div className="hidden lg:flex shrink-0">{sidebar}</div>

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
