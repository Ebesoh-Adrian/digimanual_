'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users2, Megaphone } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, StudyGroup } from '@/lib/types/api';

function extract(raw: unknown): StudyGroup[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['groups'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as StudyGroup[];
  if (Array.isArray(raw)) return raw as StudyGroup[];
  return [];
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', subject: '', description: '', level: 'O-Level' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.subject) { toast.error('Name and subject are required'); return; }
    setLoading(true);
    try {
      await api.post('/admin/groups', form);
      toast.success('Study group created');
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
          <h2 className="font-semibold text-slate-900">Create Study Group</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Group Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Chemistry O-Level Crew"
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subject *</label>
            <input value={form.subject} onChange={(e) => set('subject', e.target.value)}
              placeholder="e.g. Chemistry"
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Level</label>
            <div className="flex gap-2">
              {['O-Level', 'A-Level', 'Both'].map((l) => (
                <button key={l} onClick={() => set('level', l)}
                  className={`px-4 h-9 rounded-lg text-sm font-medium border transition-colors ${form.level === l ? 'bg-purple-600 text-white border-purple-600' : 'border-[#e2e8f0] text-slate-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              rows={3} placeholder="What is this group for?"
              className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#e2e8f0] flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="h-10 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {loading ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AnnounceModal({ group, onClose }: { group: StudyGroup; onClose: () => void }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await api.post(`/admin/groups/${group.id}/announce`, { content });
      toast.success(`Announcement sent to ${group.name}`);
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
          <Megaphone size={18} className="text-purple-600" />
          <h3 className="font-semibold text-slate-900">Send Announcement</h3>
        </div>
        <p className="text-sm text-slate-500">To: <strong>{group.name}</strong> ({group.member_count} members)</p>
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          rows={4} placeholder="Type your announcement…"
          className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={!content.trim() || loading}
            className="flex-1 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {loading ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [announceTarget, setAnnounceTarget] = useState<StudyGroup | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'groups'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>('/admin/groups');
      return res.data.data;
    },
  });

  const groups = extract(raw);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'groups'] });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Study Groups</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage collaborative student groups</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shrink-0 transition-colors">
          <Plus size={16} /> Create Group
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Groups', value: groups.length, icon: <Users2 size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
          { label: 'Total Members', value: groups.reduce((a, g) => a + g.member_count, 0), icon: <Users2 size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Private Groups', value: groups.filter((g) => g.is_private).length, icon: <Users2 size={18} className="text-indigo-600" />, bg: 'bg-indigo-50' },
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
                {['Group Name', 'Subject', 'Level', 'Members', 'Type', 'Created', 'Actions'].map((h) => (
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
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Users2 size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-slate-600">No study groups yet</p>
                    <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-purple-600 hover:underline">Create the first group</button>
                  </td>
                </tr>
              ) : groups.map((g) => (
                <tr key={g.id} className="border-b border-[#f1f5f9] hover:bg-purple-50/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{g.name}</p>
                    {g.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{g.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{g.subject ?? '—'}</td>
                  <td className="px-4 py-3">
                    {g.exam_level
                      ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${g.exam_level === 'O-Level' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{g.exam_level}</span>
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{g.member_count}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${g.is_private ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {g.is_private ? 'Private' : 'Public'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(g.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setAnnounceTarget(g)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium transition-colors">
                      <Megaphone size={13} /> Announce
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
      {announceTarget && <AnnounceModal group={announceTarget} onClose={() => setAnnounceTarget(null)} />}
    </div>
  );
}
