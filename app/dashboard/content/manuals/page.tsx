'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, BookOpen, Eye, CheckCircle, Lock,
  MoreVertical, Pencil, Trash2, ListTree, X, Camera, FileText,
} from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { ApiResponse, Manual } from '@/lib/types/api';

/* ─── helpers ─────────────────────────────────────── */
function extractManuals(raw: unknown): Manual[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['manuals'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as Manual[];
  if (Array.isArray(raw)) return raw as Manual[];
  return [];
}
function extractPagination(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return (r['pagination'] ?? null) as { total: number; pages: number; page: number } | null;
}

const LEVEL_STYLES: Record<string, string> = {
  OL: 'bg-blue-100 text-blue-800',
  'O-Level': 'bg-blue-100 text-blue-800',
  AL: 'bg-indigo-100 text-indigo-800',
  'A-Level': 'bg-indigo-100 text-indigo-800',
  both: 'bg-gray-100 text-gray-700',
  Both: 'bg-gray-100 text-gray-700',
  Probatoire: 'bg-orange-100 text-orange-800',
  BAC: 'bg-pink-100 text-pink-800',
};

/* ─── three-dot menu ────────────────────────────────── */
function ActionMenu({ manual, onEdit, onTopics, onTogglePublish, onDelete }: {
  manual: Manual;
  onEdit: () => void;
  onTopics: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
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
          <div className="absolute right-0 top-8 z-20 bg-white border border-[#e2e8f0] rounded-xl shadow-lg w-44 py-1">
            <button onClick={() => { onEdit(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Pencil size={14} /> Edit Manual
            </button>
            <button onClick={() => { onTopics(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <ListTree size={14} /> View Topics
            </button>
            <button onClick={() => { onTogglePublish(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Eye size={14} /> {manual.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <div className="border-t border-[#f1f5f9] my-1" />
            <button onClick={() => { onDelete(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── pill selector ──────────────────────────────────── */
function PillSelect<T extends string>({ options, value, onChange, colorMap }: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  colorMap?: Record<string, string>;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
            value === o.value
              ? (colorMap?.[o.value] ?? 'border-purple-600 bg-purple-50 text-purple-700')
              : 'border-[#e2e8f0] text-gray-600 hover:border-gray-400'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─── tag chip input ─────────────────────────────────── */
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = (raw: string) => {
    const newTags = raw.split(',').map((t) => t.trim()).filter((t) => t && !tags.includes(t));
    if (newTags.length) onChange([...tags, ...newTags]);
    setInput('');
  };
  return (
    <div className="min-h-10 px-3 py-2 rounded-lg border border-[#e2e8f0] flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-purple-500">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
          {t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:text-purple-900">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); } }}
        onBlur={() => { if (input.trim()) add(input); }}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
        placeholder={tags.length === 0 ? 'algebra, equations, gce (comma separated)' : ''}
      />
    </div>
  );
}

/* ─── create modal ───────────────────────────────────── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '', subject: '', level: 'OL' as string, language: 'English' as string,
    description: '', isPremium: false,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const handleCoverChange = (file: File | null) => {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('subject', form.subject);
      fd.append('level', form.level);
      fd.append('language', form.language);
      fd.append('description', form.description);
      fd.append('isPremium', String(form.isPremium));
      tags.forEach((t) => fd.append('tags[]', t));
      if (coverFile) fd.append('cover', coverFile);
      if (pdfFile) fd.append('pdf', pdfFile);
      await api.post('/admin/manuals', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Manual created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-[#e2e8f0]">
          <h2 className="text-lg font-bold text-slate-900">Create New Manual</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. Mathematics Complete Guide" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject *</label>
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. Mathematics, Physics, Literature" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Level *</label>
            <PillSelect
              options={[
                { label: 'O-Level', value: 'OL' },
                { label: 'A-Level', value: 'AL' },
                { label: 'Both', value: 'both' },
              ]}
              value={form.level}
              onChange={(v) => setForm({ ...form, level: v })}
              colorMap={{ OL: 'border-purple-600 bg-purple-50 text-purple-700', AL: 'border-indigo-600 bg-indigo-50 text-indigo-700', both: 'border-gray-500 bg-gray-50 text-gray-700' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Language *</label>
            <PillSelect
              options={[
                { label: 'English', value: 'English' },
                { label: 'French', value: 'French' },
                { label: 'Bilingual', value: 'Bilingual' },
              ]}
              value={form.language}
              onChange={(v) => setForm({ ...form, language: v })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Brief description of what this manual covers..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cover Image</label>
              <input ref={coverRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => coverRef.current?.click()}
                className="w-full aspect-video rounded-lg bg-[#f8fafc] border border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-purple-400 transition-colors">
                {coverPreview
                  ? <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                  : <Camera size={22} className="text-gray-300" />}
              </button>
              <p className="text-xs text-slate-400 mt-1">JPG/PNG, max 5MB</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full PDF</label>
              <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => pdfRef.current?.click()}
                className="w-full aspect-video rounded-lg bg-[#f8fafc] border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-purple-400 transition-colors px-2">
                <FileText size={20} className={pdfFile ? 'text-purple-600' : 'text-gray-300'} />
                {pdfFile && <span className="text-xs text-slate-600 truncate max-w-full">{pdfFile.name}</span>}
              </button>
              <p className="text-xs text-slate-400 mt-1">Optional — PDF, max 50MB</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
            <div>
              <p className="text-sm font-medium text-slate-700">Premium Content</p>
              <p className="text-xs text-slate-500">Require subscription to access</p>
            </div>
            <button type="button" onClick={() => setForm({ ...form, isPremium: !form.isPremium })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isPremium ? 'bg-purple-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isPremium ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-slate-300 text-sm font-medium text-gray-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 h-11 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60 transition-colors">
              {saving ? 'Creating…' : 'Create Manual →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── delete confirm ─────────────────────────────────── */
function DeleteConfirm({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">Delete Manual</h3>
        <p className="text-sm text-slate-600">Delete <strong>"{name}"</strong>? This will also delete all topics and questions inside it. This cannot be undone.</p>
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
export default function ManualsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');
  const [published, setPublished] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Manual | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'manuals', { search, level, language, published, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (level) params.set('level', level);
      if (language) params.set('language', language);
      if (published) params.set('published', published);
      if (search) params.set('search', search);
      const res = await api.get<ApiResponse<unknown>>(`/admin/manuals?${params}`);
      return res.data.data;
    },
  });

  // Lightweight stats queries (limit=1 just to get total from pagination)
  const { data: statsAll } = useQuery({
    queryKey: ['admin', 'manuals', 'stats', 'all'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>('/admin/manuals?limit=1');
      return extractPagination(res.data.data)?.total ?? 0;
    },
    staleTime: 30_000,
  });
  const { data: statsPublished } = useQuery({
    queryKey: ['admin', 'manuals', 'stats', 'published'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>('/admin/manuals?limit=1&published=true');
      return extractPagination(res.data.data)?.total ?? 0;
    },
    staleTime: 30_000,
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/admin/manuals/${id}/publish`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'manuals'] }); toast.success('Publish status updated'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/manuals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'manuals'] }); toast.success('Manual deleted'); setDeleteTarget(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const manuals = extractManuals(raw);
  const pagination = extractPagination(raw);
  const totalViews = manuals.reduce((s, m) => s + (m.views ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Study Manuals</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage all GCE study guides</p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors shrink-0">
          <Plus size={16} /> Create Manual
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <BookOpen size={20} className="text-purple-600" />, label: 'Total Manuals', value: statsAll ?? pagination?.total ?? manuals.length, bg: 'bg-purple-50' },
          { icon: <CheckCircle size={20} className="text-green-600" />, label: 'Published', value: statsPublished ?? manuals.filter((m) => m.is_published).length, bg: 'bg-green-50' },
          { icon: <Lock size={20} className="text-purple-600" />, label: 'Premium', value: manuals.filter((m) => m.is_premium).length, bg: 'bg-purple-50' },
          { icon: <Eye size={20} className="text-orange-600" />, label: 'Total Views', value: totalViews.toLocaleString(), bg: 'bg-orange-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Search by title or subject..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Levels</option>
          <option value="OL">O-Level</option>
          <option value="AL">A-Level</option>
          <option value="both">Both</option>
        </select>
        <select value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">All Languages</option>
          <option value="English">English</option>
          <option value="French">French</option>
          <option value="Bilingual">Bilingual</option>
        </select>
        <div className="flex gap-1 p-1 bg-[#f1f5f9] rounded-lg">
          {[{ v: '', l: 'All' }, { v: 'true', l: 'Published' }, { v: 'false', l: 'Draft' }].map((o) => (
            <button key={o.v} onClick={() => { setPublished(o.v); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${published === o.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                {['Cover', 'Title', 'Level', 'Language', 'Topics', 'Views', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9]">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : manuals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-slate-600">No manuals yet</p>
                    <button onClick={() => setCreateOpen(true)} className="mt-2 text-sm text-purple-600 hover:underline">
                      Create your first manual
                    </button>
                  </td>
                </tr>
              ) : manuals.map((m) => (
                <tr key={m.id}
                  className="border-b border-[#f1f5f9] hover:bg-purple-50/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/content/manuals/${m.id}`)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {m.cover_url
                      ? <img src={m.cover_url} alt="" className="w-12 h-16 object-cover rounded-lg border border-[#e2e8f0]" />
                      : <div className="w-12 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300"><BookOpen size={16} /></div>
                    }
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="font-semibold text-slate-900 truncate">{m.title}</p>
                    <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{m.subject}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_STYLES[m.level] ?? 'bg-gray-100 text-gray-700'}`}>
                      {m.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 uppercase">
                      {m.language === 'English' ? 'EN' : m.language === 'French' ? 'FR' : 'BILINGUAL'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    — topics
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="flex items-center gap-1"><Eye size={12} /> {(m.views ?? 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${m.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {m.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{formatDate(m.created_at)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      manual={m}
                      onEdit={() => router.push(`/dashboard/content/manuals/${m.id}/edit`)}
                      onTopics={() => router.push(`/dashboard/content/manuals/${m.id}`)}
                      onTogglePublish={() => publishMutation.mutate(m.id)}
                      onDelete={() => setDeleteTarget(m)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0]">
            <p className="text-xs text-slate-500">{pagination.total} manuals — page {page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="h-8 px-3 rounded-lg border border-[#e2e8f0] text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                className="h-8 px-3 rounded-lg border border-[#e2e8f0] text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['admin', 'manuals'] })} />}
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
