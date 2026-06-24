"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import {
  MessageCircle, Lock, Shield, Users, Ban,
  ExternalLink,
} from "lucide-react";

interface GroupData {
  _id: string;
  name: string;
  description?: string;
  type: "announcement" | "subject" | "general";
  members: { _id: string; name: string; email: string; role: string }[] | string[];
  groupAdmins: { _id: string; name: string; email: string }[] | string[];
  blockedMembers: { _id: string; name: string; email: string }[] | string[];
  createdBy: { _id: string; name: string; email: string } | string;
  isLocked: boolean;
  joinMode: "open" | "request";
  createdAt: string;
  updatedAt: string;
}

const typeStyle: Record<string, string> = {
  announcement: "bg-danger/10 text-danger border-danger/20",
  subject: "bg-primary/10 text-primary border-primary/20",
  general: "bg-secondary/10 text-secondary border-secondary/20",
};

function getUserId(user: string | { _id?: string } | null | undefined): string {
  if (!user) return "";
  if (typeof user === "string") return user;
  return user._id || "";
}

function getUserName(user: string | { name?: string } | null | undefined): string {
  if (!user) return "";
  if (typeof user === "object" && user.name) return user.name;
  return "";
}

export default function AdminGroupsPage() {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchGroups() {
    setLoading(true);
    try {
      const res = await apiFetch<GroupData[]>("/api/groups");
      if (res.success && res.data) setGroups(res.data);
      else setError(res.error ?? "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchGroups();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          {t('admin.manage_groups')}
        </h2>
        <Link
          href="/chat"
          className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          {t('admin.open_chat')}
        </Link>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 shimmer rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card withGlass className="p-12 text-center">
          <MessageCircle className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
          <p className="text-text-secondary">{t('admin.no_groups_yet')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => {
            const memberCount = g.members?.length || 0;
            const adminCount = g.groupAdmins?.length || 0;
            const blockedCount = g.blockedMembers?.length || 0;
            const creatorName = getUserName(g.createdBy) || t('chat.user');
            return (
              <Card key={g._id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-text-primary text-base truncate flex items-center gap-1.5">
                      {g.name}
                      {g.isLocked && <Lock className="w-3.5 h-3.5 text-warning shrink-0" />}
                    </h3>
                    {g.description && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{g.description}</p>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                    typeStyle[g.type] ?? typeStyle.general
                  }`}>
                    {g.type === "announcement" ? t('admin.type_announcement') : g.type === "subject" ? t('admin.type_subject') : t('admin.type_general')}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {memberCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {adminCount}
                  </span>
                  {blockedCount > 0 && (
                    <span className="flex items-center gap-1 text-danger">
                      <Ban className="w-3 h-3" />
                      {blockedCount}
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    g.joinMode === "open"
                      ? "bg-teal/10 text-teal"
                      : "bg-warning/10 text-warning"
                  }`}>
                    {g.joinMode === "open" ? t('admin.join_mode_open') : t('admin.join_mode_request')}
                  </span>
                </div>

                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    {t('admin.by')}<span className="text-text-secondary font-medium">{creatorName}</span>
                  </span>
                  <Link
                    href={`/chat?group=${g._id}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t('common.go')}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
