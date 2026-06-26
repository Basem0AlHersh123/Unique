"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
  GraduationCap, BookOpen, Layers, Users, HelpCircle,
  ClipboardCheck, UserCheck, MessageCircle, MessageSquare, Building2,
} from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageProvider';

interface AdminStats {
  colleges: number;
  subjects: number;
  topics: number;
  questions: number;
  students: number;
  teachers: number;
  attempts: number;
  attemptsToday: number;
  activeWeek: number;
  freeStudents: number;
  paidStudents: number;
  totalGroups: number;
  totalMessages: number;
  universities: number;
}

export default function AdminHome() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    apiFetch<AdminStats>("/api/admin/stats").then((res) => {
      if (res.success && res.data) setStats(res.data);
    });
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const statCards = stats ? [
    { label: t('admin.universities'), value: stats.universities, color: "bg-primary", icon: Building2 },
    { label: t('admin.colleges'), value: stats.colleges, color: "bg-teal", icon: GraduationCap },
    { label: t('admin.subjects'), value: stats.subjects, color: "bg-teal", icon: BookOpen },
    { label: t('admin.topics'), value: stats.topics, color: "bg-secondary", icon: Layers },
    { label: t('admin.questions'), value: stats.questions, color: "bg-warning", icon: HelpCircle },
    { label: t('admin.students'), value: stats.students, color: "bg-info", icon: Users, sub: `${stats.freeStudents} free · ${stats.paidStudents} paid` },
    { label: t('admin.teachers'), value: stats.teachers, color: "bg-danger", icon: GraduationCap },
    { label: t('admin.attempts'), value: stats.attempts, color: "bg-accent", icon: ClipboardCheck, sub: `${stats.attemptsToday} today` },
    { label: t('admin.active_week'), value: stats.activeWeek, color: "bg-success", icon: UserCheck },
    { label: t('admin.groups'), value: stats.totalGroups, color: "bg-indigo", icon: MessageCircle },
    { label: t('admin.messages'), value: stats.totalMessages, color: "bg-pink", icon: MessageSquare },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">
          {t('admin.title')}
        </h2>
        <Link
          href="/admin/groups"
          className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          {t('admin.manage_groups')}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-surface rounded-xl border border-border p-5 flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center text-white shrink-0`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{card.value}</p>
                <p className="text-text-secondary text-sm">{card.label}</p>
                {(card as { sub?: string }).sub && (
                  <p className="text-text-muted text-xs mt-0.5">{(card as { sub?: string }).sub}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
