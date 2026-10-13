'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, ListOrdered, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, Level } from '@/lib/types/api';

function extractLevels(raw: unknown): Level[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['levels'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as Level[];
  if (Array.isArray(raw)) return raw as Level[];
  return [];
}

function LevelModal({ level, onClose, onSaved }: {
  level?: Level; onClose: () => void; onSaved: () => void;
}) {
  const [label, setLabel] = useState(level?.label ?? '');
  const [code, setCode] = useState(level?.code ?? '');
  const [sortOrder, setSortOrder] = useState(String(level?.sortOrder ?? ''));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!label.trim()) { toast.error('Label is required'); return; }
    setSaving(true);
    try {
      if (level) {
        await api.patch(`/admin/levels/${level.code}`, {
          label: label.trim(),
          sortOrder: sortOrder ? Number(sortOrder) : undefined,
        });
        toast.success('Level updated');
      } else {
        await api.post('/admin/levels', {
          label: label.trim(),
          ...(code.trim() ? { code: code.trim().toUpperCase() } : {}),
          ...(sortOrder ? { sortOrder: Number(sortOrder) } : {}),
        });
        toast.success('Level created');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
          <h2 className="font-semibold text-slate-900">{level ? 'Edit Level' : 'New Level'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Label *</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. O-Level"
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          {!level && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code (optional — auto-derived if blank)</label>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. OL"
                maxLength={20}
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order (optional)</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#e2e8f0] flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="h-10 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {saving ? 'Saving…' : level ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LevelsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | Level | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'levels'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>('/admin/levels');
      return res.data.data;
    },
  });

  const levels = extractLevels(raw).sort((a, b) => a.sortOrder - b.sortOrder);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'levels'] });
    qc.invalidateQueries({ queryKey: ['public', 'levels'] });
  };

  const toggleMutation = useMutation({
    mutationFn: (level: Level) =>
      api.patch(`/admin/levels/${level.code}`, { isActive: !level.isActive }),
    onSuccess: () => { refresh(); toast.success('Level updated'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exam Levels</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage the levels available across manuals, past papers, and registrations</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shrink-0 transition-colors">
          <Plus size={16} /> New Level
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              {['Code', 'Label', 'Sort Order', 'Active', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f1f5f9]">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : levels.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <ListOrdered size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-slate-500 text-sm">No levels yet</p>
                </td>
              </tr>
            ) : levels.map((l) => (
              <tr key={l.code} className="border-b border-[#f1f5f9] hover:bg-purple-50/20 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{l.code}</span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{l.label}</td>
                <td className="px-4 py-3 text-slate-500">{l.sortOrder}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleMutation.mutate(l)} disabled={toggleMutation.isPending}
                    className={`transition-colors ${l.isActive ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>
                    {l.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setModal(l)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'create' && <LevelModal onClose={() => setModal(null)} onSaved={refresh} />}
      {modal && modal !== 'create' && (
        <LevelModal level={modal as Level} onClose={() => setModal(null)} onSaved={refresh} />
      )}
    </div>
  );
}
