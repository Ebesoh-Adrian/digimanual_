'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Info } from 'lucide-react';
import api from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, PlatformConfig } from '@/lib/types/api';

interface ConfigField {
  key: keyof PlatformConfig;
  label: string;
  suffix?: string;
  description?: string;
  isAiLimit?: boolean;
}

const CONFIG_FIELDS: ConfigField[] = [
  { key: 'subscription_basic_price', label: 'Basic Plan Price', suffix: 'XAF', description: 'Monthly price for the Basic subscription plan' },
  { key: 'subscription_premium_price', label: 'Premium Plan Price', suffix: 'XAF', description: 'Monthly price for the Premium subscription plan' },
  { key: 'topic_default_price', label: 'Default Topic Price', suffix: 'XAF', description: 'Default per-topic purchase price' },
  { key: 'mentor_commission_percent', label: 'Mentor Commission', suffix: '%', description: 'Platform cut from mentor session earnings' },
  { key: 'ai_limit_free', label: 'AI Limit — Free', suffix: 'questions/month', description: 'AI questions per month on free plan', isAiLimit: true },
  { key: 'ai_limit_basic', label: 'AI Limit — Basic', suffix: 'questions/month', description: 'AI questions per month on basic plan', isAiLimit: true },
  { key: 'ai_limit_premium', label: 'AI Limit — Premium', suffix: 'questions/month', description: 'Set to -1 for unlimited', isAiLimit: true },
  { key: 'past_q_free_views', label: 'Free Past Question Views', suffix: 'per month', description: 'How many past questions free users can view per month' },
  { key: 'discount_leaderboard_top', label: 'Leaderboard Auto-Reward Top N', suffix: 'students', description: 'Top N students who receive automatic discount rewards' },
];

// Normalize whatever the API returns into a flat { key: value } object
function normalizeConfig(raw: unknown): Partial<PlatformConfig> {
  if (!raw) return {};
  // Array of { key, value } pairs
  if (Array.isArray(raw)) {
    return raw.reduce((acc, item) => {
      if (item && typeof item === 'object' && 'key' in item && 'value' in item) {
        acc[item.key as keyof PlatformConfig] = String(item.value);
      }
      return acc;
    }, {} as Partial<PlatformConfig>);
  }
  // Already a flat object
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    // Might be nested under 'config' or 'data'
    if (r['config'] && typeof r['config'] === 'object') return normalizeConfig(r['config']);
    // Flat object — convert all values to strings
    return Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, String(v)])
    ) as Partial<PlatformConfig>;
  }
  return {};
}

function ConfigRow({ field, value, onSaved }: {
  field: ConfigField;
  value: string;
  onSaved: (key: string, val: string) => void;
}) {
  const [current, setCurrent] = useState(value);
  const [isUnlimited, setIsUnlimited] = useState(value === '-1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrent(value);
    setIsUnlimited(value === '-1');
  }, [value]);

  const handleSave = async () => {
    const toSave = isUnlimited ? '-1' : current;
    setSaving(true);
    try {
      await api.post('/admin/config', { key: field.key, value: toSave });
      onSaved(field.key, toSave);
      toast.success(`${field.label} saved`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const isDirty = field.isAiLimit
    ? isUnlimited ? value !== '-1' : current !== value
    : current !== value;

  return (
    <div className="flex items-center gap-4 py-4 border-b border-[#f1f5f9] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0f172a]">{field.label}</p>
        {field.description && <p className="text-xs text-[#64748b] mt-0.5">{field.description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {field.isAiLimit && (
          <label className="flex items-center gap-1.5 text-xs text-[#64748b] cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={isUnlimited}
              onChange={(e) => { setIsUnlimited(e.target.checked); if (!e.target.checked) setCurrent('100'); }}
              className="w-3.5 h-3.5 accent-[#2d6a4f]"
            />
            Unlimited
          </label>
        )}
        {(!field.isAiLimit || !isUnlimited) && (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={field.isAiLimit && isUnlimited}
              className="w-28 h-9 px-2 rounded-lg border border-[#e2e8f0] text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] disabled:bg-gray-50 disabled:text-gray-400"
            />
            {field.suffix && <span className="text-xs text-[#64748b] whitespace-nowrap">{field.suffix}</span>}
          </div>
        )}
        {field.isAiLimit && isUnlimited && (
          <span className="w-28 h-9 px-2 rounded-lg border border-[#e2e8f0] bg-gray-50 text-sm text-center text-gray-400 flex items-center justify-center">∞</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="h-9 px-3 rounded-lg bg-[#2d6a4f] text-white text-xs font-medium hover:bg-[#1b4332] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          <Save size={12} />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [localConfig, setLocalConfig] = useState<Partial<PlatformConfig>>({});

  const { data: raw, isLoading, error } = useQuery({
    queryKey: ['admin', 'config'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>('/admin/config');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (raw !== undefined) {
      setLocalConfig(normalizeConfig(raw));
    }
  }, [raw]);

  const handleSaved = (key: string, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Platform Config</h1>
        <p className="text-sm text-[#64748b] mt-1">Manage pricing, AI limits, and platform-wide settings.</p>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
        <Info size={15} className="shrink-0" />
        Changes apply within 10 minutes (server-side cache TTL).
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          Failed to load config: {getErrorMessage(error)}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e2e8f0]">
        {isLoading ? (
          Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-4 px-5 border-b border-[#f1f5f9] last:border-0">
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-64 bg-gray-50 rounded animate-pulse" />
              </div>
              <div className="h-9 w-36 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          ))
        ) : (
          <div className="px-5">
            {CONFIG_FIELDS.map((field) => (
              <ConfigRow
                key={field.key}
                field={field}
                value={localConfig[field.key] ?? ''}
                onSaved={handleSaved}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
