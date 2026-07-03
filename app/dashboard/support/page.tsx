'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Headphones, ChevronLeft, Send } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, SupportTicket } from '@/lib/types/api';

function extract(raw: unknown): SupportTicket[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['tickets'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as SupportTicket[];
  if (Array.isArray(raw)) return raw as SupportTicket[];
  return [];
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};
const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

interface TicketReply {
  id: string;
  message: string;
  sender: 'user' | 'admin';
  created_at: string;
}

function TicketDetail({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [priority, setPriority] = useState(ticket.priority);

  const { data: detailRaw } = useQuery({
    queryKey: ['admin', 'ticket', ticket.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>(`/admin/support/${ticket.id}`);
      return res.data.data;
    },
  });

  const replies: TicketReply[] = (() => {
    if (!detailRaw || typeof detailRaw !== 'object') return [];
    const r = detailRaw as Record<string, unknown>;
    const list = r['replies'] ?? r['messages'] ?? r['data'];
    return Array.isArray(list) ? (list as TicketReply[]) : [];
  })();

  const replyMutation = useMutation({
    mutationFn: () => api.post(`/admin/support/${ticket.id}/reply`, { message: reply }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ticket', ticket.id] });
      qc.invalidateQueries({ queryKey: ['admin', 'support'] });
      setReply('');
      toast.success('Reply sent');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const priorityMutation = useMutation({
    mutationFn: (p: string) => api.patch(`/admin/support/${ticket.id}/priority`, { priority: p }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'support'] }); toast.success('Priority updated'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft size={16} /> Back to tickets
      </button>

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{ticket.subject}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {ticket.users?.display_name ?? 'Unknown'} · {formatDate(ticket.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <button key={p} onClick={() => { setPriority(p); priorityMutation.mutate(p); }}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium border capitalize transition-colors ${priority === p ? `${PRIORITY_COLOR[p]} border-transparent` : 'border-[#e2e8f0] text-slate-500 hover:bg-gray-50'}`}>
                  {p}
                </button>
              ))}
            </div>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLOR[ticket.status]}`}>
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="bg-[#f8fafc] rounded-lg p-4 text-sm text-slate-700 border border-[#e2e8f0]">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Original Message</p>
          {ticket.message}
        </div>

        {replies.length > 0 && (
          <div className="space-y-3">
            {replies.map((r) => (
              <div key={r.id} className={`flex ${r.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${r.sender === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-slate-800'}`}>
                  <p>{r.message}</p>
                  <p className={`text-xs mt-1 ${r.sender === 'admin' ? 'text-purple-200' : 'text-slate-400'}`}>{formatDate(r.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-[#e2e8f0] pt-4 flex gap-3">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)}
            rows={3} placeholder="Type your reply…"
            className="flex-1 px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          <button onClick={() => replyMutation.mutate()} disabled={!reply.trim() || replyMutation.isPending}
            className="h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60 flex items-center gap-2 self-end">
            <Send size={14} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [tab, setTab] = useState<'open' | 'in_progress' | 'resolved' | 'all'>('open');
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'support', tab],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (tab !== 'all') params.set('status', tab);
      const res = await api.get<ApiResponse<unknown>>(`/admin/support?${params}`);
      return res.data.data;
    },
  });

  const tickets = extract(raw);

  if (selected) return <TicketDetail ticket={selected} onBack={() => setSelected(null)} />;

  const TABS: { key: typeof tab; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage student helpdesk requests</p>
      </div>

      <div className="flex gap-1 bg-[#f8fafc] rounded-lg p-1 border border-[#e2e8f0] w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                {['Subject', 'Student', 'Category', 'Priority', 'Status', 'Opened', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Headphones size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-slate-600">No tickets in this category</p>
                  </td>
                </tr>
              ) : tickets.map((t) => (
                <tr key={t.id} onClick={() => setSelected(t)}
                  className="border-b border-[#f1f5f9] hover:bg-purple-50/20 transition-colors cursor-pointer">
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="font-medium text-slate-900 truncate">{t.subject}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.users?.display_name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-slate-500 text-xs">{t.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLOR[t.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[t.status]}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(t.created_at)}</td>
                  <td className="px-4 py-3 text-purple-600 text-xs font-medium">View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
