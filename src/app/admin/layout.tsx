"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import {
  Menu, LogOut, BarChart3, GraduationCap, BookOpen, Layers, HelpCircle,
  Users, UserCheck, MessageCircle, Sparkles, GitBranch, FolderOpen, Building2, Image as ImageIcon, Mail, ChevronRight, ArrowLeft,
  Megaphone, Settings,
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
  const { t, lang } = useLanguage();
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
    { href: "/admin/cms", label: lang === "ar" ? "محتوى الموقع" : "Site Content", icon: ImageIcon },
    { href: "/admin/contact-messages", label: lang === "ar" ? "رسائل التواصل" : "Contact Messages", icon: Mail },
    { href: "/admin/announcements", label: lang === "ar" ? "الإعلانات" : "Announcements", icon: Megaphone },
    { href: "/admin/app-settings", label: lang === "ar" ? "إعدادات التطبيق" : "App Settings", icon: Settings },
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
    <aside className={`flex flex-col bg-surface border-l border-border shrink-0 h-full overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-64"}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <NextImage src="/logo.svg" alt="UNIQUE" width={sidebarCollapsed ? 24 : 28} height={sidebarCollapsed ? 24 : 28} className="shrink-0" />
          {!sidebarCollapsed && <h1 className="text-xl font-bold text-primary">UNIQUE</h1>}
          <button
            onClick={() => setSidebarCollapsed(c => {
              const newVal = !c;
              localStorage.setItem("admin_sidebar_collapsed", String(newVal));
              return newVal;
            })}
            className={`p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors ${sidebarCollapsed ? "mx-auto" : "mr-auto"}`}
            title={sidebarCollapsed ? (lang === "ar" ? "توسيع القائمة" : "Expand menu") : (lang === "ar" ? "طي القائمة" : "Collapse menu")}
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        {!sidebarCollapsed && <p className="text-xs text-text-muted mt-0.5 mr-auto">{t('admin.title')}</p>}
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={`flex items-center justify-center lg:justify-start gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                sidebarCollapsed ? "justify-center" : "px-4"
              } ${
                isActive
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 text-sm text-text-muted hover:text-primary transition-colors"
          title={sidebarCollapsed ? t('admin.back') : undefined}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && t('admin.back')}
        </Link>
        <button
          onClick={() => setLogoutConfirm(true)}
          className="flex items-center justify-center lg:justify-start gap-2 text-sm text-text-muted hover:text-danger transition-colors"
          title={sidebarCollapsed ? t('admin.logout') : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && t('admin.logout')}
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
      <div className="hidden lg:flex shrink-0 transition-all duration-300">{sidebar}</div>

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
