'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronRight, FlaskConical, Atom, Leaf, Code2, FileText, ChevronDown } from 'lucide-react';
import api from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, Manual } from '@/lib/types/api';

/* ─── types ──────────────────────────────────────────── */
interface Chapter {
  id: string;
  title: string;
  order_index?: number;
}

/* ─── GCE Cameroon subjects ──────────────────────────── */
const GCE_SUBJECTS = [
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Further Mathematics',
  'Computer Science',
  'Agricultural Science',
  'English Language',
  'Literature in English',
  'French',
  'History',
  'Geography',
  'Religious Studies (CRK)',
  'Religious Studies (IRK)',
  'Civic Education',
  'Economics',
  'Commerce',
  'Accounting',
  'Technical Drawing',
  'Food & Nutrition',
  'Home Economics',
  'Art & Craft',
  'Music',
  'Physical Education',
];

/* ─── Exam levels ────────────────────────────────────── */
const EXAM_LEVELS = [
  { value: 'OL',          label: 'O-Level (Ordinary Level)' },
  { value: 'AL',          label: 'A-Level (Advanced Level)' },
  { value: 'Probatoire',  label: 'Probatoire' },
  { value: 'BAC',         label: 'Baccalauréat (BAC)' },
  { value: 'BAC_TECH',    label: 'BAC Technique' },
  { value: 'BTS',         label: 'BTS (Brevet de Technicien Supérieur)' },
  { value: 'CAP',         label: 'CAP (Certificat d\'Aptitude Professionnelle)' },
  { value: 'BEPC',        label: 'BEPC / Brevet' },
  { value: 'CEP',         label: 'CEP (Certificat d\'Études Primaires)' },
  { value: 'Other',       label: 'Other / Not applicable' },
];

/* ─── scaffold templates ─────────────────────────────── */
const TEMPLATES = [
  { value: 'chemistry_al',    label: 'Chemistry A-Level', icon: <FlaskConical size={24} />, desc: '14 sections', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { value: 'physics_al',      label: 'Physics A-Level',   icon: <Atom size={24} />,         desc: '14 sections', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'biology',         label: 'Biology',           icon: <Leaf size={24} />,         desc: '9 sections',  color: 'border-lime-400 bg-lime-50 text-lime-700' },
  { value: 'computer_science',label: 'Computer Science',  icon: <Code2 size={24} />,        desc: '9 sections',  color: 'border-indigo-400 bg-indigo-50 text-indigo-700' },
  { value: 'generic',         label: 'Generic',           icon: <FileText size={24} />,     desc: '4 sections',  color: 'border-gray-400 bg-gray-50 text-gray-700' },
];

/* ─── helpers ────────────────────────────────────────── */
function extractList<T>(raw: unknown, key: string): T[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r[key] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as T[];
  if (Array.isArray(raw)) return raw as T[];
  return [];
}

/* ─── main page ──────────────────────────────────────── */
export default function NewPracticalPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    subject: '',
    subjectCustom: '',
    examLevel: '',
    title: '',
    subjectTemplate: 'generic',
    manualId: '',
    chapterId: '',
    estimatedTime: 60,
    difficulty: 'intermediate',
    isPremium: false,
    priceXaf: 500,
  });
  const [saving, setSaving] = useState(false);

  const isOther = form.subject === '__other__';
  const resolvedSubject = isOther ? form.subjectCustom : form.subject;

  // Auto-select best scaffold template when subject changes
  useEffect(() => {
    if (!form.subject || form.subject === '__other__') return;
    const lower = form.subject.toLowerCase();
    if (lower.includes('chemistry'))      setForm((f) => ({ ...f, subjectTemplate: 'chemistry_al' }));
    else if (lower.includes('physics'))   setForm((f) => ({ ...f, subjectTemplate: 'physics_al' }));
    else if (lower.includes('biology'))   setForm((f) => ({ ...f, subjectTemplate: 'biology' }));
    else if (lower.includes('computer'))  setForm((f) => ({ ...f, subjectTemplate: 'computer_science' }));
    else                                  setForm((f) => ({ ...f, subjectTemplate: 'generic' }));
  }, [form.subject]);

  // Manuals list
  const { data: manualsRaw } = useQuery({
    queryKey: ['admin', 'manuals', 'all'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>('/admin/manuals?limit=100');
      return res.data.data;
    },
  });
  const manuals = extractList<Manual>(manualsRaw, 'manuals');

  // Chapters — reload when manualId changes
  const { data: chaptersRaw } = useQuery({
    queryKey: ['admin', 'chapters', form.manualId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>(`/admin/manuals/${form.manualId}/chapters`);
      return res.data.data;
    },
    enabled: !!form.manualId,
  });
  const chapters = extractList<Chapter>(chaptersRaw, 'chapters');

  // Reset chapterId when manual changes
  useEffect(() => {
    setForm((f) => ({ ...f, chapterId: '' }));
  }, [form.manualId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedSubject.trim()) { toast.error('Select or enter a subject'); return; }
    if (!form.examLevel)         { toast.error('Select an exam level'); return; }
    if (!form.title.trim())      { toast.error('Enter a title for this practical'); return; }
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<{ practical: { id: string } }>>('/admin/practicals', {
        subject: resolvedSubject.trim(),
        examLevel: form.examLevel,
        title: form.title.trim(),
        subjectTemplate: form.subjectTemplate,
        manualId: form.manualId || undefined,
        chapterId: form.chapterId || undefined,
        estimatedTime: form.estimatedTime,
        difficulty: form.difficulty,
        isPremium: form.isPremium,
        priceXaf: form.isPremium ? form.priceXaf : undefined,
      });
      const id = res.data.data?.practical?.id ?? (res.data.data as Record<string, unknown>)?.id;
      toast.success('Practical created — scaffolding sections…');
      router.push(`/dashboard/content/practicals/${id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <button onClick={() => router.push('/dashboard/content/practicals')} className="hover:text-purple-600">Practicals</button>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">New Practical</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Practical</h1>
        <p className="text-sm text-slate-500 mt-1">Fill in the subject, level, and title — then pick a section scaffold.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Subject ────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">Subject *</label>
          <div className="relative">
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value, subjectCustom: '' })}
              className="w-full h-10 pl-3 pr-9 rounded-lg border border-[#e2e8f0] text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">— Select a subject —</option>
              {GCE_SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__other__">Other — type manually…</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          {isOther && (
            <input
              autoFocus
              value={form.subjectCustom}
              onChange={(e) => setForm({ ...form, subjectCustom: e.target.value })}
              placeholder="Type the subject name…"
              className="mt-2 w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          )}
        </div>

        {/* ── Exam Level ─────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">Exam Level *</label>
          <div className="relative">
            <select
              value={form.examLevel}
              onChange={(e) => setForm({ ...form, examLevel: e.target.value })}
              className="w-full h-10 pl-3 pr-9 rounded-lg border border-[#e2e8f0] text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">— Select exam level —</option>
              {EXAM_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* ── Title ──────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Practical Title *</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g. Titration of Hydrochloric Acid"
          />
        </div>

        {/* ── Scaffold template ───────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
            Section Scaffold *
            <span className="ml-2 text-xs font-normal text-slate-400">Pre-creates sections for this subject type</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, subjectTemplate: t.value })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  form.subjectTemplate === t.value
                    ? t.color + ' border-2'
                    : 'border-[#e2e8f0] hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className={form.subjectTemplate === t.value ? '' : 'text-gray-400'}>{t.icon}</span>
                <span className="text-sm font-medium text-center">{t.label}</span>
                <span className="text-xs opacity-70">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Manual + Chapter (optional) ─────────────────── */}
        <div>
          <p className="text-sm font-semibold text-slate-800 mb-2">
            Link to Manual <span className="text-xs font-normal text-slate-400 ml-1">(optional)</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Manual</label>
              <select
                value={form.manualId}
                onChange={(e) => setForm({ ...form, manualId: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">— None —</option>
                {manuals.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Chapter</label>
              <select
                value={form.chapterId}
                onChange={(e) => setForm({ ...form, chapterId: e.target.value })}
                disabled={!form.manualId}
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">— None —</option>
                {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Estimated time + Difficulty ─────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Estimated Time (minutes)</label>
            <input
              type="number"
              min={5}
              value={form.estimatedTime}
              onChange={(e) => setForm({ ...form, estimatedTime: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* ── Premium ─────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
            <div>
              <p className="text-sm font-medium text-slate-700">Premium Content</p>
              <p className="text-xs text-slate-500">Requires subscription to access</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isPremium: !form.isPremium })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isPremium ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isPremium ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {form.isPremium && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (XAF)</label>
              <input
                type="number"
                min={0}
                value={form.priceXaf}
                onChange={(e) => setForm({ ...form, priceXaf: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}
        </div>

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 h-11 rounded-lg border border-slate-300 text-sm font-medium text-gray-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !resolvedSubject.trim() || !form.examLevel || !form.title.trim()}
            className="flex-1 h-11 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60 transition-colors"
          >
            {saving ? 'Creating…' : 'Create & Edit →'}
          </button>
        </div>
      </form>
    </div>
  );
}
