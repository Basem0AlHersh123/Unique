"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import {
  Menu, LogOut, BarChart3, GraduationCap, BookOpen, Layers, HelpCircle,
  Users, UserCheck, MessageCircle, Sparkles, GitBranch, FolderOpen, Building2, Image as ImageIcon, Mail,
} from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { getAuthOrRefresh } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: t('admin.title'), icon: BarChart3 },
    { href: "/admin/universities", label: t('admin.universities'), icon: Building2 },
    { href: "/admin/colleges", label: t('admin.colleges'), icon: GraduationCap },
    { href: "/admin/subjects", label: t('admin.subjects'), icon: BookOpen },
    { href: "/admin/levels", label: t('admin.levels'), icon: GitBranch },
    { href: "/admin/units", label: t('admin.units'), icon: FolderOpen },
    { href: "/admin/topics", label: t('admin.topics'), icon: Layers },
    { href: "/admin/questions", label: t('admin.questions'), icon: HelpCircle },
    { href: "/admin/students", label: t('admin.students'), icon: Users },
    { href: "/admin/teachers", label: t('admin.teachers'), icon: UserCheck },
    { href: "/admin/groups", label: t('nav.groups'), icon: MessageCircle },
    { href: "/admin/ai", label: t('admin.ai_settings'), icon: Sparkles },
    { href: "/admin/cms", label: "محتوى الموقع", icon: ImageIcon },
    { href: "/admin/contact-messages", label: "رسائل التواصل", icon: Mail },
  ];
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) { router.push("/auth/login"); setLoading(false); return; }
      if (u.role !== "admin") {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthed) return null;

  const sidebar = (
    <aside className="w-64 bg-surface border-l border-border flex flex-col shrink-0 h-full overflow-y-auto">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <NextImage src="/logo.svg" alt="UNIQUE" width={28} height={28} className="shrink-0" />
          <h1 className="text-xl font-bold text-primary">UNIQUE</h1>
        </div>
        <p className="text-xs text-text-muted mt-0.5">{t('admin.title')}</p>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
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
          {t('admin.back')}
        </Link>
        <button
          onClick={() => setLogoutConfirm(true)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-danger transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('admin.logout')}
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
      {/* Desktop sidebar — always visible */}
      <div className="hidden lg:flex shrink-0">{sidebar}</div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full">{sidebar}</div>
        </div>
      )}

      <main className="flex-1 bg-background min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 p-4 border-b border-border lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <Menu className="w-5 h-5 text-text-primary" />
          </button>
          <NextImage src="/logo.svg" alt="UNIQUE" width={22} height={22} className="shrink-0" />
          <h1 className="text-lg font-bold text-primary">UNIQUE</h1>
          <span className="text-xs text-text-muted">{t('admin.title')}</span>
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
