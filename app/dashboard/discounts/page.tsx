'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Trash2, Trophy, Copy, RefreshCw } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, DiscountCampaign } from '@/lib/types/api';

function extract(raw: unknown): DiscountCampaign[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['discounts'] ?? r['campaigns'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as DiscountCampaign[];
  if (Array.isArray(raw)) return raw as DiscountCampaign[];
  return [];
}

function genCode() {
  return `DIGI${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    code: genCode(),
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 20,
    max_uses: 100,
    description: '',
    end_date: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.code || !form.discount_value) { toast.error('Code and value are required'); return; }
    setLoading(true);
    try {
      await api.post('/admin/discounts', form);
      toast.success('Discount created');
      onCreated();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
          <h2 className="font-semibold text-slate-900">Create Discount Code</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Discount Code</label>
            <div className="flex gap-2">
              <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())}
                className="flex-1 h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <button onClick={() => set('code', genCode())}
                className="h-10 px-3 rounded-lg border border-[#e2e8f0] text-slate-500 hover:bg-gray-50">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <div className="flex gap-2">
              {(['percentage', 'fixed'] as const).map((t) => (
                <button key={t} onClick={() => set('discount_type', t)}
                  className={`px-4 h-9 rounded-lg text-sm font-medium border transition-colors ${form.discount_type === t ? 'bg-purple-600 text-white border-purple-600' : 'border-[#e2e8f0] text-slate-600 hover:bg-gray-50'}`}>
                  {t === 'percentage' ? 'Percentage %' : 'Fixed XAF'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Value {form.discount_type === 'percentage' ? '(%)' : '(XAF)'}
              </label>
              <input type="number" value={form.discount_value} onChange={(e) => set('discount_value', Number(e.target.value))}
                min={1} className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Uses (0 = unlimited)</label>
              <input type="number" value={form.max_uses} onChange={(e) => set('max_uses', Number(e.target.value))}
                min={0} className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date (optional)</label>
            <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (internal)</label>
            <input value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Back to school promo"
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#e2e8f0] flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="h-10 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {loading ? 'Creating…' : 'Create Code'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaderboardModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ topN: 5, discountPercent: 20, expiryDays: 30 });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: number) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api.post<ApiResponse<{ rewarded: number }>>('/admin/discounts/leaderboard-reward', form);
      const rewarded = res.data.data?.rewarded ?? 0;
      toast.success(`${rewarded} students rewarded`);
      onDone();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-yellow-500" />
          <h3 className="font-semibold text-slate-900">Auto-Reward Top Students</h3>
        </div>
        <p className="text-sm text-slate-500">Generate and send discount codes to leaderboard toppers automatically.</p>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Top N Students</label>
          <input type="number" value={form.topN} onChange={(e) => set('topN', Number(e.target.value))} min={1} max={50}
            className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Discount Value (%)</label>
          <input type="number" value={form.discountPercent} onChange={(e) => set('discountPercent', Number(e.target.value))} min={1} max={100}
            className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Valid For (days)</label>
          <input type="number" value={form.expiryDays} onChange={(e) => set('expiryDays', Number(e.target.value))} min={1}
            className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {loading ? 'Sending…' : 'Send Rewards'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DiscountsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'discounts'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>('/admin/discounts');
      return res.data.data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/discounts/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'discounts'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/discounts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'discounts'] }); toast.success('Discount deleted'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const discounts = extract(raw);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'discounts'] });

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success('Code copied'); };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Discounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage promotional codes and rewards</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-[#e2e8f0] text-slate-700 text-sm font-medium hover:bg-gray-50 shrink-0 transition-colors">
            <Trophy size={16} className="text-yellow-500" /> Reward Top Students
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shrink-0 transition-colors">
            <Plus size={16} /> Create Code
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Codes', value: discounts.length, icon: <Tag size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
          { label: 'Active', value: discounts.filter((d) => d.is_active).length, icon: <Tag size={18} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'Total Uses', value: discounts.reduce((a, d) => a + d.current_uses, 0), icon: <Trophy size={18} className="text-yellow-500" />, bg: 'bg-yellow-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                {['Code', 'Type', 'Value', 'Uses', 'Expires', 'Active', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9]">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : discounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Tag size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-slate-600">No discount codes yet</p>
                    <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-purple-600 hover:underline">Create the first code</button>
                  </td>
                </tr>
              ) : discounts.map((d) => (
                <tr key={d.id} className="border-b border-[#f1f5f9] hover:bg-purple-50/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{d.code}</span>
                      <button onClick={() => copyCode(d.code)} className="text-gray-400 hover:text-purple-600"><Copy size={12} /></button>
                    </div>
                    {d.description && <p className="text-xs text-slate-400 mt-0.5">{d.description}</p>}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{d.discount_type}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {d.discount_type === 'percentage' ? `${d.discount_value}%` : `${d.discount_value} XAF`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.current_uses} / {d.max_uses ?? '∞'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{d.end_date ? formatDate(d.end_date) : 'Never'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleMutation.mutate(d.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${d.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${d.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(d.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteMutation.mutate(d.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} onDone={refresh} />}
    </div>
  );
}
