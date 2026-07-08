"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getStoredAuth, getAuthOrRefresh, type AuthUser } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  MessageCircle,
  LayoutDashboard,
  LogOut,
  ArrowRight,
  Building2,
  Info,
  ShieldCheck,
  LogIn,
  UserPlus,
  Bot,
  Phone,
  Menu,
  X,
  Settings,
} from "lucide-react";
import Image from "next/image";

interface NavbarProps {
  variant?: "full" | "minimal";
  showBack?: boolean;
}

function NavLink({
  href,
  icon: Icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${
        active
          ? "bg-primary/15 text-primary"
          : "text-text-muted hover:text-primary hover:bg-primary/8"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="hidden lg:inline text-sm font-medium whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}

function NavLinkPrimary({
  href,
  icon: Icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${
        active
          ? "bg-primary text-white shadow-lg shadow-primary/20"
          : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="hidden lg:inline text-sm font-medium whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}

export function Navbar({ variant = "full", showBack }: NavbarProps) {
  const { t, isRTL, lang } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredAuth());
    (async () => {
      const u = await getAuthOrRefresh();
      if (u) setUser(u);
    })();
  }, []);

  function handleLogout() {
    setLogoutConfirm(true);
    setMobileMenuOpen(false);
  }

  function confirmLogout() {
    localStorage.removeItem("accessToken");
    window.location.href = "/";
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navLinks = user
    ? [
        ...(user.role === "student"
          ? [{ href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard"), primary: true }]
          : []),
        ...(user.role === "admin"
          ? [{ href: "/admin", icon: ShieldCheck, label: t("nav.admin"), primary: true }]
          : []),
        ...(user.role === "teacher"
          ? [{ href: "/teacher/dashboard", icon: LayoutDashboard, label: t("nav.teacher_dashboard"), primary: true }]
          : []),
        { href: "/colleges", icon: Building2, label: t("nav.colleges"), primary: false },
        { href: "/chat", icon: MessageCircle, label: t("nav.chat"), primary: false },
        { href: "/ai/chat", icon: Bot, label: t("nav.ai_chat"), primary: false },
        { href: "/settings", icon: Settings, label: t("nav.settings"), primary: false },
        { href: "/about", icon: Info, label: t("nav.about"), primary: false },
        { href: "/contact", icon: Phone, label: t("nav.contact"), primary: false },
      ]
    : [
        { href: "/colleges", icon: Building2, label: t("nav.colleges"), primary: false },
        { href: "/about", icon: Info, label: t("nav.about"), primary: false },
        { href: "/contact", icon: Phone, label: t("nav.contact"), primary: false },
      ];

  return (
    <>
      <nav className="sticky top-0 z-50 glass border-b border-border/20 px-3 sm:px-6 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Brand + Back */}
          <div className="flex items-center gap-2 min-w-0">
            {showBack && (
              <button
                onClick={() => router.back()}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200 shrink-0"
                aria-label={t("common.back")}
              >
                <ArrowRight className={`w-5 h-5 ${isRTL ? "" : "rotate-180"}`} />
              </button>
            )}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image
                src="/logo.svg"
                alt="UNIQUE"
                width={38}
                height={38}
                priority
                className="shrink-0"
              />
              <span className="text-xl font-bold gradient-text hidden sm:inline">
                {t("common.brand")}
              </span>
            </Link>
          </div>

          {/* Center: Nav links - Desktop */}
          {variant === "full" && (
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) =>
                link.primary ? (
                  <NavLinkPrimary
                    key={link.href}
                    href={link.href}
                    icon={link.icon}
                    label={link.label}
                    active={isActive(link.href)}
                  />
                ) : (
                  <NavLink
                    key={link.href}
                    href={link.href}
                    icon={link.icon}
                    label={link.label}
                    active={isActive(link.href)}
                  />
                )
              )}
            </div>
          )}

          {/* Right: Toggles + Account */}
          <div className="flex items-center gap-1 shrink-0">
            {variant === "minimal" && user && (
              <div className="hidden lg:flex items-center gap-1">
                {user.role === "student" && (
                  <NavLinkPrimary
                    href="/dashboard"
                    icon={LayoutDashboard}
                    label={t("nav.dashboard")}
                    active={isActive("/dashboard")}
                  />
                )}
                {user.role === "admin" && (
                  <NavLinkPrimary
                    href="/admin"
                    icon={ShieldCheck}
                    label={t("nav.admin")}
                    active={isActive("/admin")}
                  />
                )}
                {user.role === "teacher" && (
                  <NavLinkPrimary
                    href="/teacher/dashboard"
                    icon={LayoutDashboard}
                    label={t("nav.teacher_dashboard")}
                    active={isActive("/teacher/dashboard")}
                  />
                )}
              </div>
            )}

            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

            <ThemeToggle />
            <LanguageToggle />

            {user ? (
              <button
                onClick={handleLogout}
                title={t("nav.logout")}
                className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="hidden lg:inline text-sm font-medium whitespace-nowrap">
                  {t("nav.logout")}
                </span>
              </button>
            ) : (
              <div className="hidden lg:flex items-center gap-1">
                <NavLink href="/auth/login" icon={LogIn} label={t("nav.login")} />
                <NavLinkPrimary href="/auth/register" icon={UserPlus} label={t("nav.register")} />
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-text-primary hover:bg-surface-hover transition-all"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-border/50 space-y-1 animate-slide-in-right">
            {/* Mobile nav links */}
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{link.label}</span>
                  {active && <span className="mr-auto w-1.5 h-8 rounded-full bg-primary" />}
                </Link>
              );
            })}

            <div className="border-t border-border/50 my-2" />

            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-danger hover:bg-danger/10 transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">{t("nav.logout")}</span>
              </button>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all duration-200"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="text-sm font-medium">{t("nav.login")}</span>
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white hover:bg-primary-dark transition-all duration-200"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="text-sm font-medium">{t("nav.register")}</span>
                </Link>
              </>
            )}
          </div>
        )}
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
