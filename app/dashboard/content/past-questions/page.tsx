'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, FileText, Upload, Search, CheckCircle, XCircle,
  MoreVertical, Trash2, BookOpen, Download,
} from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, PastQuestion } from '@/lib/types/api';

function extract(raw: unknown): PastQuestion[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['pastQuestions'] ?? r['past_questions'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as PastQuestion[];
  if (Array.isArray(raw)) return raw as PastQuestion[];
  return [];
}
function extractPag(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return (r['pagination'] ?? null) as { total: number; pages: number; page: number } | null;
}

function ActionMenu({ onUploadSolution, onVerify, onDelete, hasVerified }: {
  onUploadSolution: () => void; onVerify: () => void; onDelete: () => void; hasVerified: boolean;
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
            <button onClick={() => { onUploadSolution(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Upload size={13} /> Upload Solution
            </button>
            <button onClick={() => { onVerify(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <CheckCircle size={13} /> {hasVerified ? 'Unverify' : 'Verify'}
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

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ exam_title: '', subject: '', level: 'O-Level', exam_year: new Date().getFullYear() });
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const paperRef = useRef<HTMLInputElement>(null);
  const solutionRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.exam_title || !form.subject || !paperFile) {
      toast.error('Title, subject and PDF are required');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('exam_title', form.exam_title);
      fd.append('subject', form.subject);
      fd.append('level', form.level);
      fd.append('exam_year', String(form.exam_year));
      fd.append('file', paperFile);
      if (solutionFile) fd.append('solution', solutionFile);
      await api.post('/admin/past-questions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Past paper uploaded');
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
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
          <h2 className="font-semibold text-slate-900">Upload Past Paper</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Exam Title *</label>
            <input value={form.exam_title} onChange={(e) => set('exam_title', e.target.value)}
              placeholder="e.g. GCE O-Level Chemistry 2023"
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject *</label>
              <input value={form.subject} onChange={(e) => set('subject', e.target.value)}
                placeholder="e.g. Chemistry"
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Exam Year *</label>
              <input type="number" value={form.exam_year} onChange={(e) => set('exam_year', Number(e.target.value))}
                min={1990} max={2030}
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Level *</label>
            <div className="flex gap-2">
              {['O-Level', 'A-Level'].map((l) => (
                <button key={l} onClick={() => set('level', l)}
                  className={`px-4 h-9 rounded-lg text-sm font-medium border transition-colors ${form.level === l ? 'bg-purple-600 text-white border-purple-600' : 'border-[#e2e8f0] text-slate-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Exam Paper PDF *</label>
            <div onClick={() => paperRef.current?.click()}
              className="border-2 border-dashed border-[#e2e8f0] rounded-lg p-4 text-center cursor-pointer hover:border-purple-400 transition-colors">
              {paperFile
                ? <p className="text-sm text-purple-700 font-medium">{paperFile.name}</p>
                : <><Upload size={20} className="mx-auto text-gray-400 mb-1" /><p className="text-sm text-gray-500">Click to upload exam PDF</p></>}
            </div>
            <input ref={paperRef} type="file" accept=".pdf" className="hidden"
              onChange={(e) => setPaperFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Solution PDF (optional)</label>
            <div onClick={() => solutionRef.current?.click()}
              className="border-2 border-dashed border-[#e2e8f0] rounded-lg p-4 text-center cursor-pointer hover:border-purple-400 transition-colors">
              {solutionFile
                ? <p className="text-sm text-purple-700 font-medium">{solutionFile.name}</p>
                : <><Upload size={20} className="mx-auto text-gray-400 mb-1" /><p className="text-sm text-gray-500">Click to upload solution PDF</p></>}
            </div>
            <input ref={solutionRef} type="file" accept=".pdf" className="hidden"
              onChange={(e) => setSolutionFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#e2e8f0] flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="h-10 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {loading ? 'Uploading…' : 'Upload Paper'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SolutionModal({ paper, onClose, onDone }: { paper: PastQuestion; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/admin/past-questions/${paper.id}/solution`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Solution uploaded');
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
        <h3 className="font-semibold text-slate-900">Upload Solution</h3>
        <p className="text-sm text-slate-500 truncate">For: {paper.exam_title}</p>
        <div onClick={() => ref.current?.click()}
          className="border-2 border-dashed border-[#e2e8f0] rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition-colors">
          {file
            ? <p className="text-sm text-purple-700 font-medium">{file.name}</p>
            : <><Upload size={24} className="mx-auto text-gray-400 mb-2" /><p className="text-sm text-gray-500">Click to choose PDF</p></>}
        </div>
        <input ref={ref} type="file" accept=".pdf" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={!file || loading}
            className="flex-1 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {loading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PastQuestionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [solutionTarget, setSolutionTarget] = useState<PastQuestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PastQuestion | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'past-questions', { search, level, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (level) params.set('level', level);
      const res = await api.get<ApiResponse<unknown>>(`/admin/past-questions?${params}`);
      return res.data.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/past-questions/${id}/verify`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'past-questions'] }); toast.success('Verification updated'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/past-questions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'past-questions'] }); toast.success('Paper deleted'); setDeleteTarget(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const papers = extract(raw);
  const pagination = extractPag(raw);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'past-questions'] });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Past Papers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Upload and manage GCE examination papers</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shrink-0 transition-colors">
          <Plus size={16} /> Upload Paper
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Papers', value: pagination?.total ?? papers.length, icon: <FileText size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
          { label: 'Verified', value: papers.filter((p) => p.is_verified).length, icon: <CheckCircle size={18} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'With Solutions', value: papers.filter((p) => p.has_solution).length, icon: <BookOpen size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Downloads', value: papers.reduce((a, p) => a + (p.downloads ?? 0), 0), icon: <Download size={18} className="text-indigo-600" />, bg: 'bg-indigo-50' },
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Search by title or subject…" />
        </div>
        <div className="flex gap-2">
          {['', 'O-Level', 'A-Level'].map((l) => (
            <button key={l} onClick={() => { setLevel(l); setPage(1); }}
              className={`h-10 px-4 rounded-lg text-sm font-medium border transition-colors ${level === l ? 'bg-purple-600 text-white border-purple-600' : 'border-[#e2e8f0] text-slate-600 hover:bg-gray-50'}`}>
              {l || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                {['Exam Title', 'Subject', 'Level', 'Year', 'Verified', 'Solution', 'Downloads', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9]">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : papers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <FileText size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-slate-600">No past papers yet</p>
                    <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-purple-600 hover:underline">Upload the first paper</button>
                  </td>
                </tr>
              ) : papers.map((p) => (
                <tr key={p.id} className="border-b border-[#f1f5f9] hover:bg-purple-50/20 transition-colors">
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="font-medium text-slate-900 truncate">{p.exam_title}</p>
                    <p className="text-xs text-slate-400">{formatDate(p.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.level === 'O-Level' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {p.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{p.exam_year}</td>
                  <td className="px-4 py-3">
                    {p.is_verified
                      ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle size={11} /> Verified</span>
                      : <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Unverified</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.has_solution
                      ? <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Has solution</span>
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.downloads ?? 0}</td>
                  <td className="px-4 py-3">
                    <ActionMenu
                      hasVerified={p.is_verified}
                      onUploadSolution={() => setSolutionTarget(p)}
                      onVerify={() => verifyMutation.mutate(p.id)}
                      onDelete={() => setDeleteTarget(p)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0]">
            <p className="text-xs text-slate-500">{pagination.total} papers — page {page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page === 1}
                className="h-8 px-3 rounded-lg border border-[#e2e8f0] text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage((n) => Math.min(pagination.pages, n + 1))} disabled={page === pagination.pages}
                className="h-8 px-3 rounded-lg border border-[#e2e8f0] text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
      {solutionTarget && <SolutionModal paper={solutionTarget} onClose={() => setSolutionTarget(null)} onDone={refresh} />}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="font-semibold text-slate-900">Delete Past Paper</h3>
            <p className="text-sm text-slate-600">Delete <strong>"{deleteTarget.exam_title}"</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-10 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60">
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
