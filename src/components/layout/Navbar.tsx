"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getStoredAuth, getAuthOrRefresh, type AuthUser } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  MessageCircle, Settings, LayoutDashboard, LogOut, ArrowRight,
  Building2, Info, ShieldCheck, Presentation, LogIn, UserPlus,
} from "lucide-react";
import Image from "next/image";

interface NavbarProps {
  variant?: "full" | "minimal";
  showBack?: boolean;
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      className="group flex items-center p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="hidden lg:inline max-w-0 overflow-hidden group-hover:max-w-40 group-hover:ms-2 transition-all duration-500 whitespace-nowrap text-sm">
        {label}
      </span>
    </Link>
  );
}

function NavLinkPrimary({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      className="group flex items-center p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200"
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="hidden lg:inline max-w-0 overflow-hidden group-hover:max-w-40 group-hover:ms-2 transition-all duration-500 whitespace-nowrap text-sm font-medium">
        {label}
      </span>
    </Link>
  );
}

export function Navbar({ variant = "full", showBack }: NavbarProps) {
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setUser(getStoredAuth());
    (async () => {
      const u = await getAuthOrRefresh();
      if (u) setUser(u);
    })();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleLogout() {
    setLogoutConfirm(true);
  }

  function confirmLogout() {
    localStorage.removeItem("accessToken");
    window.location.href = "/";
  }

  return (
    <>
      <nav className="sticky top-0 z-50 glass border-b border-border/20 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Brand */}
          <div className="flex items-center gap-3 min-w-0">
            {showBack && (
              <button
                onClick={() => router.back()}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200 shrink-0"
                aria-label={t('common.back')}
              >
                <ArrowRight className={`w-5 h-5 ${isRTL ? "" : "rotate-180"}`} />
              </button>
            )}
            <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
  src="/logo.svg"
  alt="UNIQUE"
  width={45}
  height={45}
  priority
  className="shrink-0"
/>            <span className="text-2xl font-bold gradient-text hidden sm:inline">{t('common.brand')}</span>
            </Link>
          </div>

          {/* Center: Nav links */}
          {variant === "full" && (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mx-2">
              {user ? (
                <>
                  {user.role === "student" && (
                    <NavLinkPrimary href="/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
                  )}
                  {user.role === "admin" && (
                    <NavLinkPrimary href="/admin" icon={ShieldCheck} label={t('nav.admin')} />
                  )}
                  {user.role === "teacher" && (
                    <NavLinkPrimary href="/teacher/dashboard" icon={Presentation} label={t('nav.teacher_dashboard')} />
                  )}
                  <NavLink href="/colleges" icon={Building2} label={t('nav.colleges')} />
                  <NavLink href="/chat" icon={MessageCircle} label={t('nav.chat')} />
                  <NavLink href="/about" icon={Info} label={t('nav.about')} />
                  <NavLink href="/settings" icon={Settings} label={t('nav.settings')} />
                </>
              ) : (
                <>
                  <NavLink href="/colleges" icon={Building2} label={t('nav.colleges')} />
                  <NavLink href="/about" icon={Info} label={t('nav.about')} />
                </>
              )}
            </div>
          )}

          {/* Right: Toggles + Account */}
          <div className="flex items-center gap-1 shrink-0">
            {variant === "minimal" && user && (
              <>
                {user.role === "student" && (
                  <NavLinkPrimary href="/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
                )}
                {user.role === "admin" && (
                  <NavLinkPrimary href="/admin" icon={ShieldCheck} label={t('nav.admin')} />
                )}
                {user.role === "teacher" && (
                  <NavLinkPrimary href="/teacher/dashboard" icon={Presentation} label={t('nav.teacher_dashboard')} />
                )}
              </>
            )}
            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
            <ThemeToggle />
            <LanguageToggle />
            {user ? (
              <button
                onClick={handleLogout}
                title={t('nav.logout')}
                className="group flex items-center p-2 rounded-xl text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="hidden lg:inline max-w-0 overflow-hidden group-hover:max-w-40 group-hover:ms-2 transition-all duration-500 whitespace-nowrap text-sm">
                  {t('nav.logout')}
                </span>
              </button>
            ) : (
              <>
                <NavLink href="/auth/login" icon={LogIn} label={t('nav.login')} />
                <NavLinkPrimary href="/auth/register" icon={UserPlus} label={t('nav.register')} />
              </>
            )}
          </div>
        </div>
      </nav>

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
    </>
  );
}
