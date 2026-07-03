'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Plus, FlaskConical, Atom, Leaf, Code2, FileText,
  MoreVertical, Pencil, Trash2, Search, Eye, EyeOff,
} from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse } from '@/lib/types/api';

/* ─── types ──────────────────────────────────────────── */
interface Practical {
  id: string;
  title: string;
  subject_template: string;
  is_published: boolean;
  is_premium: boolean;
  difficulty: string;
  estimated_time: number;
  total_marks: number;
  manual_id: string;
  chapter_id: string | null;
  manuals?: { title: string; subject: string };
}

/* ─── constants ─────────────────────────────────────── */
const TEMPLATE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  chemistry_al: { label: 'Chemistry AL', icon: <FlaskConical size={13} />, color: 'bg-emerald-100 text-emerald-800' },
  physics_al:   { label: 'Physics AL',   icon: <Atom size={13} />,        color: 'bg-blue-100 text-blue-800' },
  biology:      { label: 'Biology',      icon: <Leaf size={13} />,        color: 'bg-lime-100 text-lime-800' },
  computer_science: { label: 'CS',       icon: <Code2 size={13} />,       color: 'bg-indigo-100 text-indigo-800' },
  generic:      { label: 'Generic',      icon: <FileText size={13} />,    color: 'bg-gray-100 text-gray-700' },
};

const DIFF_COLOR: Record<string, string> = {
  beginner:     'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced:     'bg-red-100 text-red-700',
};

/* ─── helpers ────────────────────────────────────────── */
function extractPracticals(raw: unknown): Practical[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['practicals'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as Practical[];
  if (Array.isArray(raw)) return raw as Practical[];
  return [];
}
function extractPagination(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return (r['pagination'] ?? null) as { total: number; pages: number; page: number } | null;
}

/* ─── action menu ────────────────────────────────────── */
function ActionMenu({ id, onEdit, onDelete }: { id: string; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
        <MoreVertical size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-[#e2e8f0] rounded-xl shadow-lg w-40 py-1">
            <button onClick={() => { onEdit(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Pencil size={13} /> Edit
            </button>
            <button onClick={() => { onDelete(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── delete confirm ─────────────────────────────────── */
function DeleteConfirm({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
        <h3 className="font-semibold text-slate-900">Delete Practical</h3>
        <p className="text-sm text-slate-600">
          Delete <strong>"{name}"</strong>? This will permanently delete the practical and all student attempts. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-10 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────── */
export default function PracticalsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Practical | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'practicals', { search, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await api.get<ApiResponse<unknown>>(`/admin/practicals?${params}`);
      return res.data.data;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/admin/practicals/${id}/publish`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'practicals'] }); toast.success('Status updated'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/practicals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'practicals'] }); toast.success('Practical deleted'); setDeleteTarget(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const practicals = extractPracticals(raw);
  const pagination = extractPagination(raw);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Practical Workbooks</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage GCE practical exercises and lab workbooks</p>
        </div>
        <button onClick={() => router.push('/dashboard/content/practicals/new')}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors shrink-0">
          <Plus size={16} /> New Practical
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: pagination?.total ?? practicals.length, icon: <FileText size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
          { label: 'Published', value: practicals.filter((p) => p.is_published).length, icon: <Eye size={18} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'Draft', value: practicals.filter((p) => !p.is_published).length, icon: <EyeOff size={18} className="text-yellow-600" />, bg: 'bg-yellow-50' },
          { label: 'Premium', value: practicals.filter((p) => p.is_premium).length, icon: <FlaskConical size={18} className="text-indigo-600" />, bg: 'bg-indigo-50' },
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Search practicals…"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                {['Title', 'Template', 'Manual', 'Difficulty', 'Marks', 'Published', 'Created', 'Actions'].map((h) => (
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
              ) : practicals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <FlaskConical size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-slate-600">No practicals yet</p>
                    <button onClick={() => router.push('/dashboard/content/practicals/new')}
                      className="mt-2 text-sm text-purple-600 hover:underline">Create your first practical</button>
                  </td>
                </tr>
              ) : practicals.map((p) => {
                const tmpl = TEMPLATE_META[p.subject_template] ?? TEMPLATE_META.generic;
                return (
                  <tr key={p.id}
                    className="border-b border-[#f1f5f9] hover:bg-purple-50/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/content/practicals/${p.id}`)}>
                    <td className="px-4 py-3 max-w-[240px]">
                      <p className="font-semibold text-slate-900 truncate">{p.title}</p>
                      <p className="text-xs text-slate-400">{p.estimated_time} min</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tmpl.color}`}>
                        {tmpl.icon} {tmpl.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="text-slate-700 truncate text-xs">{p.manuals?.title ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${DIFF_COLOR[p.difficulty] ?? 'bg-gray-100 text-gray-700'}`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{p.total_marks}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => publishMutation.mutate(p.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${p.is_published ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${p.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate((p as any).created_at)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu id={p.id}
                        onEdit={() => router.push(`/dashboard/content/practicals/${p.id}`)}
                        onDelete={() => setDeleteTarget(p)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0]">
            <p className="text-xs text-slate-500">{pagination.total} practicals — page {page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page === 1}
                className="h-8 px-3 rounded-lg border border-[#e2e8f0] text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage((n) => Math.min(pagination.pages, n + 1))} disabled={page === pagination.pages}
                className="h-8 px-3 rounded-lg border border-[#e2e8f0] text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.title}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
