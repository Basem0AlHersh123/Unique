"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getAuthOrRefresh } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  MessageCircle,
  Send,
  Menu,
  Plus,
  Lock,
  Unlock,
  Users,
  Shield,
  UserPlus,
  UserMinus,
  LogIn,
  Clock,
  Check,
  X,
  Trash2,
  Settings,
  ExternalLink,
  Ban,
  Pencil,
  ImageIcon,
  EyeOff,
} from "lucide-react";

interface GroupData {
  _id: string;
  name: string;
  description?: string;
  type: "announcement" | "subject" | "general";
  subjectId?: { _id: string; name: string } | string;
  members: { _id: string; name: string; email: string; role: string }[] | string[];
  groupAdmins: { _id: string; name: string; email: string }[] | string[];
  blockedMembers: { _id: string; name: string; email: string }[] | string[];
  createdBy: { _id: string; name: string; email: string } | string;
  isLocked: boolean;
  joinMode: "open" | "request";
  isVisible: boolean;
  allowImages: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MessageData {
  _id: string;
  groupId: string;
  userId: { _id: string; name: string; role: string } | string;
  content: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  _deletedLabel?: string;
  _editedLabel?: string;
}

interface JoinRequestData {
  _id: string;
  groupId: string;
  userId: { _id: string; name: string; email: string; role: string };
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface UserInfo {
  userId: string;
  role: string;
  tier: string;
  name: string;
}

const typeStyle: Record<string, string> = {
  announcement: "bg-danger/10 text-danger border-danger/20",
  subject: "bg-primary/10 text-primary border-primary/20",
  general: "bg-secondary/10 text-secondary border-secondary/20",
};

import type { TranslationKey } from "@/lib/i18n/translations";

function getTypeLabel(t: (key: TranslationKey) => string, type: string): string {
  const labels: Record<string, string> = {
    announcement: t("chat.type_announcement"),
    subject: t("chat.type_subject"),
    general: t("chat.type_general"),
  };
  return labels[type] ?? labels.general;
}

type UserLike = string | { _id?: string; name?: string; email?: string } | null | undefined;

function getUserId(user: UserLike): string {
  if (!user) return "";
  if (typeof user === "string") return user;
  return user._id || "";
}

function getUserName(user: UserLike): string {
  if (!user) return "";
  if (typeof user === "object" && user.name) return user.name;
  return "";
}

function getUserEmail(user: UserLike): string {
  if (!user) return "";
  if (typeof user === "object" && user.email) return user.email;
  return "";
}

export default function ChatPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [authed, setAuthed] = useState(false);

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState("");

  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);

  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createType, setCreateType] = useState<"general" | "subject" | "announcement">("general");
  const [createJoinMode, setCreateJoinMode] = useState<"open" | "request">("open");
  const [createIsVisible, setCreateIsVisible] = useState(true);
  const [createAllowImages, setCreateAllowImages] = useState(false);
  const [creating, setCreating] = useState(false);

  const [manageTarget, setManageTarget] = useState<GroupData | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [manageName, setManageName] = useState("");

  const [joinRequests, setJoinRequests] = useState<JoinRequestData[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);

  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) { router.push("/auth/login"); return; }
      if (cancelled) return;
      setUser({
        userId: u.userId ?? "",
        role: u.role ?? "student",
        tier: u.tier ?? "free",
        name: u.name ?? "",
      });
      setAuthed(true);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const canCreate = user
    ? user.role === "admin" || user.role === "teacher" || (user.role === "student" && user.tier === "paid")
    : false;

  useEffect(() => {
    if (!authed) return;
    setGroupsLoading(true);
    setGroupsError("");
    apiFetch<GroupData[]>("/api/groups")
      .then((res) => {
        if (res.success && res.data) {
          setGroups(res.data);
          const groupParam = new URLSearchParams(window.location.search).get("group");
          if (groupParam) {
            const match = res.data.find((g) => g._id === groupParam);
            if (match) setSelectedGroup(match);
          }
        } else setGroupsError(res.error ?? "");
      })
      .catch((err: Error) => setGroupsError(err.message))
      .finally(() => setGroupsLoading(false));
  }, [authed]);

  const loadMessages = useCallback(async (groupId: string) => {
    setMessagesLoading(true);
    setMessagesError("");
    try {
      const res = await apiFetch<MessageData[]>(`/api/groups/${groupId}/messages`);
      if (res.success && res.data) setMessages(res.data);
      else setMessagesError(res.error ?? "");
    } catch (err: unknown) {
      setMessagesError(err instanceof Error ? err.message : "");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const selectedIsAdmin = selectedGroup ? isGroupAdmin(selectedGroup) : false;
  const selectedIsMember = selectedGroup ? isMember(selectedGroup) : false;
  const selectedIsBlocked = selectedGroup && user
    ? (selectedGroup.blockedMembers || []).some((m) => getUserId(m) === user.userId)
    : false;

  useEffect(() => {
    if (!selectedGroup || !selectedIsMember) { setMessages([]); return; }
    loadMessages(selectedGroup._id);
    pollRef.current = setInterval(() => {
      loadMessages(selectedGroup._id);
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedGroup, selectedIsMember, loadMessages]);

  useEffect(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [messages]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !selectedGroup || !user) return;
    if (selectedGroup.isLocked) {
      showToast(t("chat.group_locked"), "error");
      return;
    }
    setSending(true);
    try {
      const res = await apiFetch<MessageData>(
        `/api/groups/${selectedGroup._id}/messages`,
        { method: "POST", body: JSON.stringify({ content: text }) }
      );
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setInput("");
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  async function handleEditMessage(messageId: string, newContent: string) {
    if (!selectedGroup || !newContent.trim()) return;
    try {
      const res = await apiFetch<MessageData>(
        `/api/groups/${selectedGroup._id}/messages`,
        { method: "PATCH", body: JSON.stringify({ messageId, content: newContent.trim() }) }
      );
      if (res.success && res.data) {
        setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, content: newContent.trim(), isEdited: true } : m));
        setEditingMessageId(null);
        setEditInput("");
        setMenuMessageId(null);
      } else {
        showToast(res.error || "فشل التعديل", "error");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!selectedGroup) return;
    try {
      const res = await apiFetch<MessageData>(
        `/api/groups/${selectedGroup._id}/messages`,
        { method: "DELETE", body: JSON.stringify({ messageId }) }
      );
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, isDeleted: true, content: "[تم حذف هذه الرسالة]" } : m
          )
        );
        setMenuMessageId(null);
      } else {
        showToast(res.error || "فشل الحذف", "error");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function handleCreateGroup() {
    if (!createName.trim() || !user) return;
    setCreating(true);
    try {
      const res = await apiFetch<GroupData>("/api/groups", {
        method: "POST",
        body: JSON.stringify({
          name: createName,
          description: createDesc,
          type: createType,
          joinMode: createJoinMode,
          isVisible: createIsVisible,
          allowImages: createAllowImages,
        }),
      });
      if (res.success && res.data) {
        setGroups((prev) => [res.data!, ...prev]);
        setShowCreateDialog(false);
        setCreateName("");
        setCreateDesc("");
        showToast(t("chat.group_created"), "success");
      } else {
        showToast(res.error || t("chat.create_failed"), "error");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setCreating(false);
    }
  }

  function isGroupAdmin(group: GroupData): boolean {
    if (!user) return false;
    if (user.role === "admin") return true;
    const cid = getUserId(group.createdBy);
    if (cid === user.userId) return true;
    return (group.groupAdmins || []).some((a) => getUserId(a) === user.userId);
  }

  function isCreator(group: GroupData): boolean {
    if (!user) return false;
    if (user.role === "admin") return true;
    return getUserId(group.createdBy) === user.userId;
  }

  function isMember(group: GroupData): boolean {
    if (!user) return false;
    return (group.members || []).some((m) => getUserId(m) === user.userId);
  }

  function isOwnMessage(msg: MessageData): boolean {
    const senderId = typeof msg.userId === "string" ? msg.userId : msg.userId?._id;
    return senderId === user?.userId;
  }

  async function handleJoinGroup(groupId: string) {
    try {
      const res = await apiFetch<GroupData>(`/api/groups/${groupId}/join`, { method: "POST" });
      if (res.success) {
        if (res.data?.members) {
          setGroups((prev) => prev.map((g) => g._id === groupId ? { ...g, members: res.data!.members } : g));
          if (selectedGroup?._id === groupId) {
            setSelectedGroup((prev) => prev ? { ...prev, members: res.data!.members } : prev);
          }
        }
        showToast(t("chat.joined"), "success");
      } else {
        showToast(res.error || t("chat.join_failed"), "error");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function handleRequestJoin(groupId: string) {
    try {
      const res = await apiFetch(`/api/groups/${groupId}/join-requests`, { method: "POST" });
      if (res.success) {
        showToast(t("chat.request_sent"), "success");
      } else {
        showToast(res.error || t("chat.request_failed"), "error");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  function openManage(group: GroupData) {
    setManageTarget(group);
    setManageName(group.name);
    setShowManage(true);
    loadJoinRequests(group._id);
  }

  async function loadJoinRequests(groupId: string) {
    setJoinRequestsLoading(true);
    try {
      const res = await apiFetch<JoinRequestData[]>(`/api/groups/${groupId}/join-requests?status=pending`);
      if (res.success && res.data) setJoinRequests(res.data);
    } catch { /* silent */ }
    finally { setJoinRequestsLoading(false); }
  }

  async function handleJoinRequestAction(requestId: string, status: "approved" | "rejected") {
    if (!manageTarget) return;
    try {
      const res = await apiFetch(
        `/api/groups/${manageTarget._id}/join-requests/${requestId}`,
        { method: "PATCH", body: JSON.stringify({ status }) }
      );
      if (res.success) {
        setJoinRequests((prev) => prev.filter((r) => r._id !== requestId));
        showToast(status === "approved" ? t("chat.request_approved") : t("chat.request_rejected"), "success");
        const gRes = await apiFetch<GroupData>(`/api/groups/${manageTarget._id}`);
        if (gRes.success && gRes.data) {
          setManageTarget(gRes.data);
          setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? gRes.data! : g));
        }
      } else {
        showToast(res.error || t("chat.action_failed"), "error");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function handleToggleLock() {
    if (!manageTarget) return;
    try {
      const res = await apiFetch<GroupData>(`/api/groups/${manageTarget._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isLocked: !manageTarget.isLocked }),
      });
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        if (selectedGroup?._id === manageTarget._id) setSelectedGroup(res.data);
        showToast(manageTarget.isLocked ? t("chat.group_unlocked") : t("chat.group_locked_title"), "success");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function handleToggleJoinMode() {
    if (!manageTarget) return;
    const newMode = manageTarget.joinMode === "open" ? "request" : "open";
    try {
      const res = await apiFetch<GroupData>(`/api/groups/${manageTarget._id}`, {
        method: "PATCH",
        body: JSON.stringify({ joinMode: newMode }),
      });
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        if (selectedGroup?._id === manageTarget._id) setSelectedGroup(res.data);
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function handleToggleAllowImages() {
    if (!manageTarget) return;
    try {
      const res = await apiFetch<GroupData>(`/api/groups/${manageTarget._id}`, {
        method: "PATCH",
        body: JSON.stringify({ allowImages: !manageTarget.allowImages }),
      });
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function handleToggleVisibility() {
    if (!manageTarget) return;
    try {
      const res = await apiFetch<GroupData>(`/api/groups/${manageTarget._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isVisible: !manageTarget.isVisible }),
      });
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        if (selectedGroup?._id === manageTarget._id) setSelectedGroup(res.data);
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function handleUpdateGroupName() {
    if (!manageTarget || !manageName.trim()) return;
    if (manageName.trim() === manageTarget.name) return;
    try {
      const res = await apiFetch<GroupData>(`/api/groups/${manageTarget._id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: manageName.trim() }),
      });
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        if (selectedGroup?._id === manageTarget._id) setSelectedGroup(res.data);
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function handleAddMember() {
    if (!manageTarget || !addMemberEmail.trim()) return;
    setAddingMember(true);
    try {
      const res = await apiFetch<GroupData>(
        `/api/groups/${manageTarget._id}/members`,
        { method: "POST", body: JSON.stringify({ email: addMemberEmail }) }
      );
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        setAddMemberEmail("");
        showToast(t("chat.member_added"), "success");
      } else {
        showToast(res.error || t("chat.add_failed"), "error");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(targetUserId: string) {
    if (!manageTarget || !user) return;
    if (targetUserId === user.userId) {
      setProcessing(targetUserId);
      try {
        const res = await apiFetch(
          `/api/groups/${manageTarget._id}/members?userId=${targetUserId}`,
          { method: "DELETE" }
        );
        if (res.success) {
          setGroups((prev) => prev.filter((g) => g._id !== manageTarget._id));
          setShowManage(false);
          setManageTarget(null);
          if (selectedGroup?._id === manageTarget._id) setSelectedGroup(null);
          showToast(t("chat.member_left"), "success");
        }
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setProcessing(null);
      }
      return;
    }
    if (getUserId(manageTarget.createdBy) === targetUserId) {
      showToast(t("chat.cant_remove_creator"), "error");
      return;
    }
    setProcessing(targetUserId);
    try {
      const res = await apiFetch<GroupData>(
        `/api/groups/${manageTarget._id}/members?userId=${targetUserId}`,
        { method: "DELETE" }
      );
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        showToast(t("chat.member_removed"), "success");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  async function handlePromoteAdmin(targetUserId: string) {
    if (!manageTarget) return;
    setProcessing(targetUserId);
    try {
      const res = await apiFetch<GroupData>(
        `/api/groups/${manageTarget._id}/admins`,
        { method: "POST", body: JSON.stringify({ userId: targetUserId }) }
      );
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        showToast(t("chat.promoted_to_admin"), "success");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  async function handleDemoteAdmin(targetUserId: string) {
    if (!manageTarget) return;
    setProcessing(targetUserId);
    try {
      const res = await apiFetch<GroupData>(
        `/api/groups/${manageTarget._id}/admins?userId=${targetUserId}`,
        { method: "DELETE" }
      );
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        showToast(t("chat.demoted_from_admin"), "success");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  async function handleBlockMember(targetUserId: string) {
    if (!manageTarget) return;
    setProcessing(targetUserId);
    try {
      const res = await apiFetch<GroupData>(
        `/api/groups/${manageTarget._id}/block`,
        { method: "POST", body: JSON.stringify({ userId: targetUserId }) }
      );
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        showToast(t("chat.member_blocked"), "success");
      } else {
        showToast(res.error || t("chat.block_failed"), "error");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  async function handleUnblockMember(targetUserId: string) {
    if (!manageTarget) return;
    setProcessing(targetUserId);
    try {
      const res = await apiFetch<GroupData>(
        `/api/groups/${manageTarget._id}/block?userId=${targetUserId}`,
        { method: "DELETE" }
      );
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        showToast(t("chat.member_unblocked"), "success");
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  const sortedGroups = [...groups].sort((a, b) => {
    const aMem = a.members?.length || 0;
    const bMem = b.members?.length || 0;
    return bMem - aMem;
  });

  if (!authed) return null;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <nav className="sticky top-0 z-50 glass border-b border-border/20 px-3 sm:px-6 py-2 sm:py-3 shrink-0">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
            <Image src="/logo.svg" alt="UNIQUE" width={28} height={28} className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
            <span className="text-base sm:text-xl font-bold gradient-text">{t("common.brand")}</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="hidden lg:flex shrink-0">{renderSidebar()}</div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full">{renderSidebar()}</div>
          </div>
        )}

        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 p-2 border-b border-border lg:hidden shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
              <Menu className="w-4 h-4 text-text-primary" />
            </button>
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="font-semibold text-text-primary text-xs">{t("chat.messages")}</span>
          </div>

          {!selectedGroup ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold text-text-primary mb-1">{t("chat.select_group")}</h2>
                <p className="text-text-secondary text-sm">{t("chat.select_group_desc")}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-3 sm:px-6 py-2 sm:py-3 border-b border-border bg-surface/50 flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0">
                  {selectedGroup.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <h2 className="font-semibold text-text-primary text-xs sm:text-sm lg:text-base truncate max-w-[100px] sm:max-w-[200px] lg:max-w-none">
                      {selectedGroup.name}
                    </h2>
                    <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full border ${typeStyle[selectedGroup.type] ?? typeStyle.general}`}>
                      {getTypeLabel(t, selectedGroup.type)}
                    </span>
                    {selectedGroup.isLocked && (
                      <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 flex items-center gap-0.5">
                        <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> {t("chat.locked_badge")}
                      </span>
                    )}
                    {!selectedGroup.isVisible && (
                      <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-purple/10 text-purple border border-purple/20 flex items-center gap-0.5">
                        <EyeOff className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> مخفي
                      </span>
                    )}
                    {selectedGroup.allowImages && (
                      <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20 flex items-center gap-0.5">
                        <ImageIcon className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!selectedIsMember && selectedGroup.joinMode === "open" && (
                    <Button size="sm" onClick={() => handleJoinGroup(selectedGroup._id)} className="text-xs sm:text-sm px-2 sm:px-3">
                      <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" /> {t("chat.join")}
                    </Button>
                  )}
                  {!selectedIsMember && selectedGroup.joinMode === "request" && (
                    <Button size="sm" variant="secondary" onClick={() => handleRequestJoin(selectedGroup._id)} className="text-xs sm:text-sm px-2 sm:px-3">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" /> {t("chat.request_join")}
                    </Button>
                  )}
                  {selectedIsAdmin && (
                    <button
                      onClick={() => openManage(selectedGroup)}
                      className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all"
                      title={t("chat.manage")}
                    >
                      <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
                {messagesLoading && Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                    <div className={`h-14 w-3/5 shimmer rounded-2xl ${i % 2 === 0 ? "rounded-bl-sm" : "rounded-br-sm"}`} />
                  </div>
                ))}
                {messagesError && <p className="text-sm text-danger text-center py-6">{messagesError}</p>}
                {!messagesLoading && !messagesError && messages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-text-muted mx-auto mb-2" />
                    <p className="text-text-secondary text-sm">{t("chat.no_messages")}</p>
                  </div>
                )}
                {!messagesLoading && !messagesError && messages.map((msg) => {
                  const isOwn = isOwnMessage(msg);
                  const senderName = typeof msg.userId === "object" ? msg.userId?.name : "";
                  const senderRole = typeof msg.userId === "object" ? msg.userId?.role : "";
                  const isDeletedMsg = msg.isDeleted;

                  return (
                    <div key={msg._id} className="relative group">
                      <div
                        className={`flex ${isOwn ? (isRTL ? "justify-start" : "justify-end") : (isRTL ? "justify-end" : "justify-start")}`}
                        onClick={() => setMenuMessageId(null)}
                      >
                        <div
                          className={`max-w-[75%] sm:max-w-[65%] relative ${
                            isOwn
                              ? `bg-primary text-white rounded-2xl ${isRTL ? "rounded-br-sm" : "rounded-bl-sm"}`
                              : `bg-surface border border-border text-text-primary rounded-2xl ${isRTL ? "rounded-bl-sm" : "rounded-br-sm"}`
                          } px-4 py-2.5 shadow-sm`}
                        >
                          {!isOwn && !isDeletedMsg && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-semibold text-text-primary">{senderName}</span>
                              <span className="text-[9px] px-1 py-0.5 rounded-full bg-surface-hover/50 text-text-muted">
                                {senderRole === "admin" ? t("chat.role_admin") : senderRole === "teacher" ? t("chat.role_teacher") : t("chat.role_student")}
                              </span>
                            </div>
                          )}
                          {isDeletedMsg && !isOwn && user?.role !== "admin" ? (
                            <p className="text-sm italic text-text-muted">[تم حذف هذه الرسالة]</p>
                          ) : isDeletedMsg && user?.role === "admin" ? (
                            <p className="text-sm leading-relaxed break-words text-text-muted line-through">
                              {msg.content}
                              {msg._deletedLabel && <span className="mr-1 not-italic no-underline">{msg._deletedLabel}</span>}
                            </p>
                          ) : editingMessageId === msg._id ? (
                            <div className="flex items-end gap-1">
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editInput}
                                onChange={(e) => setEditInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleEditMessage(msg._id, editInput);
                                  }
                                  if (e.key === "Escape") {
                                    setEditingMessageId(null);
                                    setEditInput("");
                                  }
                                }}
                                className="flex-1 bg-surface/20 border border-white/20 rounded-lg px-2 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50"
                              />
                              <button
                                onClick={() => handleEditMessage(msg._id, editInput)}
                                disabled={!editInput.trim()}
                                className="p-1 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className={`text-sm leading-relaxed break-words ${isOwn ? "text-white/90" : "text-text-primary"}`}>
                                {msg.content}
                              </p>
                              {msg.isEdited && (
                                <span className="text-[9px] opacity-60 mr-1">✏️ معدّلة</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {isOwn && !isDeletedMsg && editingMessageId !== msg._id && (
                        <div className={`absolute top-0 ${isOwn ? (isRTL ? "left-0" : "right-0") : (isRTL ? "right-0" : "left-0")} opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5`}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingMessageId(msg._id); setEditInput(msg.content); setMenuMessageId(null); }}
                            className="p-1 rounded-lg bg-surface border border-border text-text-muted hover:text-primary hover:border-primary/30 transition-all"
                            title="تعديل"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg._id); }}
                            className="p-1 rounded-lg bg-surface border border-border text-text-muted hover:text-danger hover:border-danger/30 transition-all"
                            title="حذف"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-2 sm:p-4 border-t border-border bg-surface/50 shrink-0">
                {selectedGroup.isLocked ? (
                  <div className="text-center text-sm text-warning py-2 bg-warning/5 rounded-xl border border-warning/20">
                    <Lock className="w-4 h-4 inline ml-1" />
                    {t("chat.locked_warning")}
                  </div>
                ) : selectedIsBlocked ? (
                  <div className="text-center text-sm text-danger py-2 bg-danger/5 rounded-xl border border-danger/20">
                    <Ban className="w-4 h-4 inline ml-1" />
                    {t("chat.blocked_warning")}
                  </div>
                ) : !selectedIsMember ? (
                  <div className="text-center text-sm text-text-muted py-2">
                    {t("chat.join_prompt")}
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t("chat.message_placeholder")}
                      className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                      dir={isRTL ? "rtl" : "ltr"}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                      className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-dark transition-all shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {renderCreateDialog()}
      {renderManagePanel()}
      {renderConfirmDelete()}
    </div>
  );

  function renderSidebar() {
    return (
      <aside className="w-60 lg:w-72 bg-surface border-l border-border flex flex-col shrink-0 h-full">
        <div className="sticky top-0 z-10 bg-surface p-3 lg:p-4 border-b border-border flex items-center justify-between gap-1">
          <h2 className="text-sm lg:text-base font-semibold text-text-primary flex items-center gap-1.5 lg:gap-2">
            <MessageCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary" />
            <span className="truncate">{t("chat.groups")}</span>
          </h2>
          {canCreate && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all shrink-0"
              title={t("chat.create_group")}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-1">
          {groupsLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 lg:h-[72px] shimmer rounded-xl" />
          ))}
          {groupsError && <p className="text-sm text-danger text-center py-6">{groupsError}</p>}
          {!groupsLoading && !groupsError && sortedGroups.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="text-text-muted text-sm">{t("chat.no_groups")}</p>
              {canCreate && (
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-3 text-primary text-sm hover:underline"
                >
                  {t("chat.create_first")}
                </button>
              )}
            </div>
          )}
          {!groupsLoading && !groupsError && sortedGroups.map((g) => {
            const isActive = selectedGroup?._id === g._id;
            const isMem = isMember(g);
            return (
              <button
                key={g._id}
                onClick={() => { setSelectedGroup(g); setSidebarOpen(false); }}
                className={`w-full text-right p-2 lg:p-3 rounded-xl border transition-all ${
                  isActive
                    ? "bg-primary/10 border-primary/30 text-text-primary"
                    : "bg-surface-hover/50 border-border hover:bg-surface-hover text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-xs lg:text-sm truncate flex items-center gap-1">
                    {g.name}
                    {g.isLocked && <Lock className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-warning shrink-0" />}
                    {!g.isVisible && user?.role === "admin" && (
                      <span className="text-[8px] lg:text-[9px] px-1 py-0.5 rounded-full bg-purple/10 text-purple border border-purple/20 flex items-center gap-0.5">
                        <EyeOff className="w-2 h-2" /> مخفي
                      </span>
                    )}
                  </span>
                  <span className={`text-[9px] lg:text-[10px] px-1 lg:px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                    typeStyle[g.type] ?? typeStyle.general
                  }`}>
                    {getTypeLabel(t, g.type)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-[9px] lg:text-[10px] text-text-muted">
                    <Users className="w-2 h-2 lg:w-2.5 lg:h-2.5" />
                    {g.members?.length || 0}
                  </div>
                  {!isMem && (
                    <span className="text-[9px] lg:text-[10px] px-1 lg:px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary">
                      {g.joinMode === "request" ? t("chat.join_mode_request") : t("chat.join_mode_open")}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  function renderCreateDialog() {
    if (!showCreateDialog) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateDialog(false)} />
        <Card withGlass className="relative w-full max-w-sm sm:max-w-md p-4 sm:p-6 space-y-3 sm:space-y-4 mx-2">
          <h3 className="text-base sm:text-lg font-bold text-text-primary">{t("chat.create_title")}</h3>
          <div>
            <label className="block text-xs sm:text-sm text-text-secondary mb-1">{t("chat.name_label")}</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={t("chat.name_placeholder")}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-surface border-2 border-border text-text-primary placeholder:text-text-muted text-sm outline-none focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-text-secondary mb-1">{t("chat.desc_label")}</label>
            <textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder={t("chat.desc_placeholder")}
              rows={2}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-surface border-2 border-border text-text-primary placeholder:text-text-muted text-sm outline-none focus:border-primary transition-all resize-none"
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-xs sm:text-sm text-text-secondary mb-1">{t("chat.type_label")}</label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as "general" | "subject" | "announcement")}
                className="w-full px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-surface border-2 border-border text-text-primary text-xs sm:text-sm outline-none focus:border-primary"
              >
                <option value="general">{t("chat.type_general")}</option>
                <option value="subject">{t("chat.type_subject")}</option>
                <option value="announcement">{t("chat.type_announcement")}</option>
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs sm:text-sm text-text-secondary mb-1">{t("chat.join_method")}</label>
              <select
                value={createJoinMode}
                onChange={(e) => setCreateJoinMode(e.target.value as "open" | "request")}
                className="w-full px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-surface border-2 border-border text-text-primary text-xs sm:text-sm outline-none focus:border-primary"
              >
                <option value="open">{t("chat.join_direct")}</option>
                <option value="request">{t("chat.join_approval")}</option>
              </select>
            </div>
          </div>
          {/* isVisible toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm text-text-secondary">مرئي للجميع</label>
            <button
              type="button"
              onClick={() => setCreateIsVisible(!createIsVisible)}
              className={`relative w-11 h-6 rounded-full transition-colors ${createIsVisible ? "bg-primary" : "bg-border"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${createIsVisible ? "translate-x-5.5" : "translate-x-0.5"} ${isRTL && createIsVisible ? "translate-x-0.5" : ""} ${isRTL && !createIsVisible ? "translate-x-5.5" : ""}`} />
            </button>
          </div>
          {/* allowImages toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm text-text-secondary">السماح بإرسال الصور</label>
            <button
              type="button"
              onClick={() => setCreateAllowImages(!createAllowImages)}
              className={`relative w-11 h-6 rounded-full transition-colors ${createAllowImages ? "bg-primary" : "bg-border"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${createAllowImages ? "translate-x-5.5" : "translate-x-0.5"} ${isRTL && createAllowImages ? "translate-x-0.5" : ""} ${isRTL && !createAllowImages ? "translate-x-5.5" : ""}`} />
            </button>
          </div>
          <div className="flex gap-2 justify-end pt-1 sm:pt-2">
            <Button variant="secondary" onClick={() => setShowCreateDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreateGroup} isLoading={creating} disabled={!createName.trim()}>
              {t("common.create")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  function renderManagePanel() {
    if (!showManage || !manageTarget) return null;
    const target = manageTarget;
    const adminCount = (target.groupAdmins || []).length;
    const memberCount = (target.members || []).length;
    const isCreatorUser = isCreator(target);
    const isGroupAdminUser = isGroupAdmin(target);
    if (!isGroupAdminUser) return null;

    function memberList(target: GroupData) {
      const members = target.members || [];
      const blocked = target.blockedMembers || [];
      return members.map((m) => {
        const mid = getUserId(m);
        const mName = getUserName(m) || t("chat.user");
        const mEmail = getUserEmail(m) || "";
        const isCr = getUserId(target.createdBy) === mid;
        const isGrpAdmin = (target.groupAdmins || []).some((a) => getUserId(a) === mid);
        const isBlocked = blocked.some((b) => getUserId(b) === mid);
        return (
          <div key={mid} className={`flex items-center justify-between py-2 px-3 rounded-lg bg-background border ${
            isBlocked ? "border-danger/30 bg-danger/5" : "border-border"
          }`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-text-primary truncate">{mName}</p>
                {isCr && <Shield className="w-3 h-3 text-primary shrink-0" />}
                {isGrpAdmin && !isCr && <Shield className="w-3 h-3 text-secondary shrink-0" />}
                {isBlocked && <Ban className="w-3 h-3 text-danger shrink-0" />}
              </div>
              {mEmail && <p className="text-xs text-text-muted truncate">{mEmail}</p>}
            </div>
            <div className="flex gap-1 shrink-0 mr-2">
              {!isCr && isGroupAdminUser && (
                isBlocked ? (
                  <button
                    onClick={() => handleUnblockMember(mid)}
                    disabled={processing === mid}
                    className="p-1.5 rounded-lg text-teal hover:bg-teal/10 transition-all"
                    title={t("common.unblock")}
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleBlockMember(mid)}
                    disabled={processing === mid}
                    className="p-1.5 rounded-lg text-warning hover:bg-warning/10 transition-all"
                    title={t("common.block")}
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                )
              )}
              {isCr && isCreatorUser && !isGrpAdmin && (
                <button
                  onClick={() => handlePromoteAdmin(mid)}
                  disabled={processing === mid}
                  className="p-1.5 rounded-lg text-teal hover:bg-teal/10 transition-all"
                  title={t("common.promote")}
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
              )}
              {isGrpAdmin && !isCr && isCreatorUser && (
                <button
                  onClick={() => handleDemoteAdmin(mid)}
                  disabled={processing === mid}
                  className="p-1.5 rounded-lg text-warning hover:bg-warning/10 transition-all"
                  title={t("common.demote")}
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
              )}
              {!isCr && !isBlocked && (isCreatorUser || (isGroupAdminUser && !isGrpAdmin)) && (
                <button
                  onClick={() => handleRemoveMember(mid)}
                  disabled={processing === mid}
                  className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-all"
                  title={t("common.remove")}
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              )}
              {!isCr && user?.userId === mid && (
                <button
                  onClick={() => handleRemoveMember(mid)}
                  disabled={processing === mid}
                  className="p-1.5 rounded-lg text-warning hover:bg-warning/10 transition-all"
                  title={t("common.leave")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      });
    }

    function adminList(target: GroupData) {
      const admins = target.groupAdmins || [];
      return admins.map((a) => {
        const aid = getUserId(a);
        const aName = getUserName(a) || t("chat.user");
        const isCr = getUserId(target.createdBy) === aid;
        return (
          <div key={aid} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-background/50 border border-border/50">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-primary" />
              <span className="text-sm text-text-primary">{aName}</span>
              {isCr && <span className="text-[10px] text-text-muted">{t("chat.creator_badge")}</span>}
            </div>
          </div>
        );
      });
    }

    function joinRequestsSection() {
      return (
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary" />
            {t("chat.join_requests")}
            {joinRequests.length > 0 && (
              <span className="bg-danger/10 text-danger text-[10px] px-1.5 py-0.5 rounded-full">
                {joinRequests.length}
              </span>
            )}
          </h4>
          {joinRequestsLoading ? (
            <div className="h-12 shimmer rounded-lg" />
          ) : joinRequests.length === 0 ? (
            <p className="text-xs text-text-muted">{t("chat.no_pending")}</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {joinRequests.map((req) => (
                <div key={req._id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{req.userId?.name || t("chat.user")}</p>
                    <p className="text-xs text-text-muted">{req.userId?.email || ""}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleJoinRequestAction(req._id, "approved")}
                      className="p-1.5 rounded-lg text-teal hover:bg-teal/10 transition-all"
                      title={t("common.approve")}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleJoinRequestAction(req._id, "rejected")}
                      className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-all"
                      title={t("common.reject")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-12 sm:pt-16 md:pt-24">
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowManage(false)} />
        <Card withGlass className="relative w-full max-w-sm sm:max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 mx-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              {t("chat.manage_title")}
            </h3>
            <button
              onClick={() => setShowManage(false)}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t border-border pt-1" />

          {/* Group name edit */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm text-text-secondary">{t("chat.name_label")}</label>
            <div className="flex gap-2">
              <input
                value={manageName}
                onChange={(e) => setManageName(e.target.value)}
                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-background border border-border text-text-primary text-xs sm:text-sm outline-none focus:border-primary"
              />
              {manageName.trim() !== target.name && (
                <Button size="sm" onClick={handleUpdateGroupName}>حفظ</Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs sm:text-sm text-text-secondary">{t("chat.desc_label")}</label>
            <textarea
              defaultValue={manageTarget.description || ""}
              onBlur={(e) => { if (e.target.value !== (manageTarget.description || "")) handleUpdateGroup("description", e.target.value); }}
              rows={2}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-background border border-border text-text-primary text-xs sm:text-sm outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={handleToggleLock}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                manageTarget.isLocked
                  ? "bg-teal/10 text-teal border-teal/20"
                  : "bg-warning/10 text-warning border-warning/20"
              }`}
            >
              {manageTarget.isLocked ? <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {manageTarget.isLocked ? t("common.unlock") : t("common.lock")}
            </button>
            <button
              onClick={handleToggleJoinMode}
              className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-border bg-background/50 text-text-primary hover:bg-background transition-all"
            >
              {manageTarget.joinMode === "open" ? <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {manageTarget.joinMode === "open" ? t("chat.join_mode_request") : t("chat.join_mode_open")}
            </button>
            <button
              onClick={handleToggleAllowImages}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                manageTarget.allowImages
                  ? "bg-teal/10 text-teal border-teal/20"
                  : "bg-background/50 text-text-muted border-border"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              الصور
            </button>
            <button
              onClick={handleToggleVisibility}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                manageTarget.isVisible
                  ? "bg-teal/10 text-teal border-teal/20"
                  : "bg-warning/10 text-warning border-warning/20"
              }`}
            >
              <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {manageTarget.isVisible ? "مرئي" : "مخفي"}
            </button>
          </div>

          {joinRequestsSection()}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs sm:text-sm font-semibold text-text-primary flex items-center gap-1 sm:gap-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                {t("chat.members_section").replace("{count}", String(memberCount))}
              </h4>
            </div>
            {isGroupAdminUser && (
              <div className="flex gap-2 mb-2 sm:mb-3">
                <input
                  value={addMemberEmail}
                  onChange={(e) => setAddMemberEmail(e.target.value)}
                  placeholder={t("chat.email_placeholder")}
                  className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 rounded-lg bg-background border border-border text-text-primary text-xs sm:text-sm outline-none focus:border-primary placeholder:text-text-muted"
                />
                <Button
                  size="sm"
                  onClick={handleAddMember}
                  isLoading={addingMember}
                  disabled={!addMemberEmail.trim()}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <div className="space-y-1 max-h-36 sm:max-h-48 overflow-y-auto">{manageTarget ? memberList(manageTarget) : null}</div>
          </div>

          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-text-primary mb-2 flex items-center gap-1 sm:gap-2">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary" />
              {t("chat.admins_section").replace("{count}", String(adminCount))}
            </h4>
            <div className="space-y-1">{manageTarget ? adminList(manageTarget) : null}</div>
          </div>

          {(manageTarget.blockedMembers?.length || 0) > 0 && (
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-text-primary mb-2 flex items-center gap-1 sm:gap-2">
                <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-danger" />
                {t("chat.blocked_section").replace("{count}", String(manageTarget.blockedMembers?.length || 0))}
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {(manageTarget.blockedMembers || []).map((b) => {
                  const bid = getUserId(b);
                  const bName = getUserName(b) || t("chat.user");
                  return (
                    <div key={bid} className="flex items-center justify-between py-1.5 px-2 sm:px-3 rounded-lg bg-danger/5 border border-danger/20">
                      <span className="text-xs sm:text-sm text-text-primary truncate">{bName}</span>
                      {isGroupAdminUser && (
                        <button
                          onClick={() => handleUnblockMember(bid)}
                          disabled={processing === bid}
                          className="p-1 rounded-lg text-teal hover:bg-teal/10 transition-all shrink-0"
                          title={t("common.unblock")}
                        >
                          <Ban className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(isCreatorUser) && (
            <div className="border-t border-border pt-3 sm:pt-4">
              <button
                onClick={() => setDeleteTarget(manageTarget._id)}
                className="w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium text-danger bg-danger/5 border border-danger/20 hover:bg-danger/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t("chat.delete_group")}
              </button>
              <p className="text-[10px] text-text-muted text-center mt-1">{t("chat.delete_warning")}</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  function renderConfirmDelete() {
    return (
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("chat.delete_confirm_title")}
        message={t("chat.delete_confirm_msg")}
        confirmLabel={t("dialog.delete_confirm")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`/api/groups/${deleteTarget}`, { method: "DELETE" });
      if (res.success) {
        setGroups((prev) => prev.filter((g) => g._id !== deleteTarget));
        if (selectedGroup?._id === deleteTarget) setSelectedGroup(null);
        setShowManage(false);
        setManageTarget(null);
        setDeleteTarget(null);
        showToast(t("chat.group_deleted"), "success");
      } else {
        showToast(res.error || t("chat.delete_failed"), "error");
        setDeleteTarget(null);
      }
    } catch (err) {
      showToast((err as Error).message, "error");
      setDeleteTarget(null);
    }
  }

  async function handleUpdateGroup(field: string, value: unknown) {
    if (!manageTarget) return;
    try {
      const res = await apiFetch<GroupData>(`/api/groups/${manageTarget._id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      if (res.success && res.data) {
        setManageTarget(res.data);
        setGroups((prev) => prev.map((g) => g._id === manageTarget._id ? res.data! : g));
        if (selectedGroup?._id === manageTarget._id) setSelectedGroup(res.data);
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }
}
