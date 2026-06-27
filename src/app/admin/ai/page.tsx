"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Key, Save, Activity, Users } from "lucide-react";

interface UsageTotals {
  totalTokensIn: number;
  totalTokensOut: number;
  totalRequests: number;
}

interface ApiSettingData {
  key: string | null;
  provider: string;
  model: string;
  updatedAt: string | null;
  usage: UsageTotals;
}

const AI_MODELS = [
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
];

interface ByUserEntry {
  userId: string;
  name: string;
  email: string;
  tokensIn: number;
  tokensOut: number;
  requests: number;
}

interface UsageData {
  totalTokensIn: number;
  totalTokensOut: number;
  totalRequests: number;
  byUser: ByUserEntry[];
}

export default function AdminAIPage() {
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [setting, setSetting] = useState<ApiSettingData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");
  const [savingModel, setSavingModel] = useState(false);
  const [daysFilter, setDaysFilter] = useState(30);

  const fetchData = useCallback(
    async (days: number) => {
      setLoading(true);
      try {
        const [settingRes, usageRes] = await Promise.all([
          apiFetch<ApiSettingData>("/api/admin/ai"),
          apiFetch<UsageData>(`/api/admin/ai/usage?days=${days}`),
        ]);
        if (settingRes.success) {
          setSetting(settingRes.data ?? null);
          if (settingRes.data?.model) setSelectedModel(settingRes.data.model);
        }
        if (usageRes.success) setUsage(usageRes.data ?? null);
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchData(daysFilter);
  }, [fetchData, daysFilter]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSaveKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const res = await apiFetch<{ provider: string; updatedAt: string }>(
        "/api/admin/ai",
        {
          method: "POST",
          body: JSON.stringify({ key: trimmed }),
        }
      );
      if (res.success) {
        showToast(t('admin.ai_key_saved'), "success");
        setKeyInput("");
        await fetchData(daysFilter);
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveModel() {
    setSavingModel(true);
    try {
      const res = await apiFetch<{ model: string }>("/api/admin/ai", {
        method: "POST",
        body: JSON.stringify({ model: selectedModel }),
      });
      if (res.success) {
        showToast("تم حفظ الموديل", "success");
        await fetchData(daysFilter);
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSavingModel(false);
    }
  }

  if (loading && !setting) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
          {t('admin.ai_settings')}
        </h2>
        <p className="text-text-secondary mt-1 text-sm sm:text-base">
          {t('admin.ai_settings_desc')}
        </p>
      </div>

      <Card withGlass>
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-text-primary">
            {t('admin.api_key')}
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Gemini API Key
              {setting?.provider && (
                <Badge variant="info">{setting.provider}</Badge>
              )}
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={
                setting?.key
                  ? t('admin.api_key_placeholder')
                  : t('admin.api_key_placeholder_short')
              }
              className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:shadow-lg focus:shadow-primary/10 transition-all duration-300"
            />
          </div>
          <Button
            onClick={handleSaveKey}
            isLoading={saving}
            disabled={!keyInput.trim()}
          >
            <Save className="w-4 h-4 ml-2" />
            {t('common.save')}
          </Button>
        </div>

        {setting?.key && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-muted bg-background/50 rounded-xl p-3">
            <span className="text-xs font-medium">{t('admin.current_key')}</span>
            <span
              dir="ltr"
              className="font-mono text-xs bg-surface px-2 py-1 rounded-lg border border-border"
            >
              {setting.key}
            </span>
            {setting.updatedAt && (
              <span className="text-xs">
                {t('admin.last_updated')}{" "}
                {new Date(setting.updatedAt).toLocaleDateString("ar-SA", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">AI Model</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleSaveModel}
              isLoading={savingModel}
              disabled={selectedModel === setting?.model}
            >
              <Save className="w-4 h-4 ml-2" />
              حفظ الموديل
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card withGlass className="text-center">
          <Activity className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-text-primary">
            {(setting?.usage.totalRequests ?? 0).toLocaleString("ar-SA")}
          </p>
          <p className="text-sm text-text-muted">{t('admin.total_requests')}</p>
        </Card>
        <Card withGlass className="text-center">
          <p className="text-2xl font-bold text-text-primary">
            {(setting?.usage.totalTokensIn ?? 0).toLocaleString("ar-SA")}
          </p>
          <p className="text-sm text-text-muted">{t('admin.input_tokens')}</p>
        </Card>
        <Card withGlass className="text-center">
          <p className="text-2xl font-bold text-text-primary">
            {(setting?.usage.totalTokensOut ?? 0).toLocaleString("ar-SA")}
          </p>
          <p className="text-sm text-text-muted">{t('admin.output_tokens')}</p>
        </Card>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">
              {t('admin.user_usage')}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">{t('admin.days_label')}</label>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-surface border-2 border-border text-text-primary text-sm outline-none focus:border-primary transition-all duration-300"
            >
              <option value={7}>{t('admin.days_7')}</option>
              <option value={30}>{t('admin.days_30')}</option>
              <option value={60}>{t('admin.days_60')}</option>
              <option value={90}>{t('admin.days_90')}</option>
            </select>
          </div>
        </div>

        {usage === null ? (
          <LoadingSkeleton />
        ) : (
          <Table
            headers={[
              t('admin.table_user'),
              t('admin.table_email'),
              t('admin.table_input'),
              t('admin.table_output'),
              t('admin.table_requests'),
            ]}
          >
            {usage.byUser.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-text-muted"
                >
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  {t('admin.no_usage_data')}
                </TableCell>
              </TableRow>
            ) : (
              usage.byUser.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-text-secondary text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell className="text-text-primary">
                    {u.tokensIn.toLocaleString("ar-SA")}
                  </TableCell>
                  <TableCell className="text-text-primary">
                    {u.tokensOut.toLocaleString("ar-SA")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">
                      {u.requests.toLocaleString("ar-SA")} {t('admin.request_count')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </Table>
        )}
      </div>
    </div>
  );
}
