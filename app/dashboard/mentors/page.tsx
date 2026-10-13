'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, Ban, DollarSign, RotateCcw } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, formatXAF, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, MentorProfile } from '@/lib/types/api';

function extract(raw: unknown): MentorProfile[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['mentors'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as MentorProfile[];
  if (Array.isArray(raw)) return raw as MentorProfile[];
  return [];
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
  changes_requested: 'bg-orange-100 text-orange-700',
};

function ReasonModal({ title, actionLabel, onConfirm, onClose, loading }: {
  title: string; actionLabel: string; onConfirm: (reason: string) => void; onClose: () => void; loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)}
          rows={3} placeholder="Enter reason…"
          className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onConfirm(reason)} disabled={loading || !reason.trim()}
            className="flex-1 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {loading ? 'Saving…' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayoutModal({ mentor, onClose, onDone }: { mentor: MentorProfile; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    amount: mentor.pending_payout_xaf ?? 0,
    phone: mentor.users?.phone_number ?? '',
    service: 'MTN',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.phone) { toast.error('Phone number required'); return; }
    setLoading(true);
    try {
      await api.post(`/admin/mentors/${mentor.id}/payout`, form);
      toast.success('Payout processed');
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
        <h3 className="font-semibold text-slate-900">Process Payout</h3>
        <p className="text-sm text-slate-500">Mentor: <strong>{mentor.full_name}</strong></p>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Amount (XAF)</label>
          <input type="number" value={form.amount} onChange={(e) => set('amount', Number(e.target.value))}
            className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="6XXXXXXXX"
            className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Service</label>
          <div className="flex gap-2">
            {['MTN', 'Orange'].map((s) => (
              <button key={s} onClick={() => set('service', s)}
                className={`px-4 h-9 rounded-lg text-sm font-medium border transition-colors ${form.service === s ? 'bg-purple-600 text-white border-purple-600' : 'border-[#e2e8f0] text-slate-600 hover:bg-gray-50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {loading ? 'Processing…' : 'Pay Out'}
          </button>
        </div>
      </div>
    </div>
  );
}

type TabKey = 'pending' | 'needs_review' | 'changes_requested' | 'approved' | 'rejected' | 'suspended';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'changes_requested', label: 'Changes Requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

export default function MentorsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('pending');
  const [search, setSearch] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<MentorProfile | null>(null);
  const [payoutTarget, setPayoutTarget] = useState<MentorProfile | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'mentors', tab, search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      let url: string;
      if (tab === 'pending') {
        url = `/admin/mentors/pending?${params}`;
      } else if (tab === 'needs_review') {
        params.set('needsReview', 'true');
        url = `/admin/mentors?${params}`;
      } else {
        params.set('status', tab);
        url = `/admin/mentors?${params}`;
      }
      const res = await api.get<ApiResponse<unknown>>(url);
      return res.data.data;
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/mentors/${id}/suspend`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'mentors'] });
      toast.success('Mentor suspended');
      setSuspendTarget(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reinstateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/mentors/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'mentors'] });
      toast.success('Mentor reinstated');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const mentors = extract(raw);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'mentors'] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mentors</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review applications and manage mentor accounts</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="overflow-x-auto">
          <div className="flex gap-0.5 bg-[#f8fafc] rounded-lg p-1 border border-[#e2e8f0] w-fit">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 pr-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-56"
            placeholder="Search mentors…" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                {['Name', 'Subjects', 'Status', 'Completeness', 'Earnings', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : mentors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <UserCheck size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-slate-600">No mentors in this category</p>
                  </td>
                </tr>
              ) : mentors.map((m) => (
                <tr key={m.id}
                  onClick={() => router.push(`/dashboard/mentors/${m.id}`)}
                  className="border-b border-[#f1f5f9] hover:bg-purple-50/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{m.full_name}</p>
                    <p className="text-xs text-slate-400">{m.users?.phone_number ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[140px]">
                    <p className="text-slate-700 truncate text-xs">{m.subjects?.join(', ') ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[m.verification_status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {m.verification_status.replace(/_/g, ' ')}
                      </span>
                      {m.overdue && tab === 'pending' && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">Overdue</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${m.completeness ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">{m.completeness ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{formatXAF(m.total_earnings_xaf)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(m.created_at)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {m.verification_status === 'approved' && (
                        <>
                          <button onClick={() => setSuspendTarget(m)}
                            className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium">
                            <Ban size={12} /> Suspend
                          </button>
                          <button onClick={() => setPayoutTarget(m)}
                            className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium">
                            <DollarSign size={12} /> Payout
                          </button>
                        </>
                      )}
                      {m.verification_status === 'suspended' && (
                        <button onClick={() => reinstateMutation.mutate(m.id)} disabled={reinstateMutation.isPending}
                          className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-60">
                          <RotateCcw size={12} /> Reinstate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {suspendTarget && (
        <ReasonModal title="Suspend Mentor" actionLabel="Suspend"
          loading={suspendMutation.isPending}
          onClose={() => setSuspendTarget(null)}
          onConfirm={(reason) => suspendMutation.mutate({ id: suspendTarget.id, reason })} />
      )}
      {payoutTarget && (
        <PayoutModal mentor={payoutTarget} onClose={() => setPayoutTarget(null)} onDone={refresh} />
      )}
    </div>
  );
}
