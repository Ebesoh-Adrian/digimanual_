'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, TrendingUp, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, formatXAF, getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Payment, PaymentStats } from '@/lib/types/api';

function extractPayments(raw: unknown): Payment[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['payments'] ?? r['transactions'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as Payment[];
  if (Array.isArray(raw)) return raw as Payment[];
  return [];
}
function extractPag(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return (r['pagination'] ?? null) as { total: number; pages: number; page: number } | null;
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const PURPOSE_LABEL: Record<string, string> = {
  subscription: 'Subscription',
  topic: 'Topic',
  past_question: 'Past Paper',
  mentor_session: 'Mentor Session',
};

export default function PaymentsPage() {
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'payment-stats'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaymentStats>>('/admin/payments/stats');
      return res.data.data;
    },
  });

  const { data: raw, isLoading, error } = useQuery({
    queryKey: ['admin', 'payments', { status, startDate, endDate, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await api.get<ApiResponse<unknown>>(`/admin/payments?${params}`);
      return res.data.data;
    },
  });

  const payments = extractPayments(raw);
  const pagination = extractPag(raw);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500 mt-0.5">Revenue transactions and financial overview</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-medium">API error loading payments</p>
            <p className="text-xs mt-0.5 text-amber-700">{getErrorMessage(error)}</p>
            <p className="text-xs mt-1 text-amber-600">Backend fix needed: FK ambiguity on payments ↔ users join (admin.controller.js:462)</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatXAF(stats?.totalRevenue), icon: <DollarSign size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
          { label: 'Total Transactions', value: stats?.totalTransactions ?? '—', icon: <CreditCard size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Success Rate', value: stats ? `${Math.round(stats.successRate)}%` : '—', icon: <TrendingUp size={18} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'Revenue This Month', value: formatXAF(stats?.revenueByMonth?.[stats.revenueByMonth.length - 1]?.revenue), icon: <Calendar size={18} className="text-indigo-600" />, bg: 'bg-indigo-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>{s.icon}</div>
            <div>
              {statsLoading
                ? <div className="h-5 w-16 bg-gray-100 rounded animate-pulse mb-1" />
                : <p className="text-xl font-bold text-slate-900">{s.value}</p>}
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {[{ v: '', l: 'All' }, { v: 'completed', l: 'Completed' }, { v: 'pending', l: 'Pending' }, { v: 'failed', l: 'Failed' }].map(({ v, l }) => (
            <button key={v} onClick={() => { setStatus(v); setPage(1); }}
              className={`h-9 px-3 rounded-lg text-sm font-medium border transition-colors ${status === v ? 'bg-purple-600 text-white border-purple-600' : 'border-[#e2e8f0] text-slate-600 hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                {['Transaction ID', 'Amount', 'Purpose', 'Gateway', 'Phone', 'Status', 'Date'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <CreditCard size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-slate-600">No transactions found</p>
                  </td>
                </tr>
              ) : payments.map((p) => (
                <tr key={p.id} className="border-b border-[#f1f5f9] hover:bg-purple-50/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.transaction_id?.slice(0, 14)}…</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{formatXAF(p.amount)}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{PURPOSE_LABEL[p.purpose] ?? p.purpose}</p>
                    {p.subscription_plan && <p className="text-xs text-slate-400 capitalize">{p.subscription_plan}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 uppercase text-xs">{p.gateway}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{p.phone_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLOR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0]">
            <p className="text-xs text-slate-500">{pagination.total} transactions — page {page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page === 1}
                className="h-8 px-3 rounded-lg border border-[#e2e8f0] text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage((n) => Math.min(pagination.pages, n + 1))} disabled={page === pagination.pages}
                className="h-8 px-3 rounded-lg border border-[#e2e8f0] text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
