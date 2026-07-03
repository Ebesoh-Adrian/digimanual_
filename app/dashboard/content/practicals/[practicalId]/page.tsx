'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, GripVertical, Plus, Trash2, Pencil, X, Download,
  CheckCircle, AlertTriangle, FlaskConical,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse } from '@/lib/types/api';
import {
  SectionHeader, SectionContentEditor, QuestionsPanel,
  type PracticalSection,
} from '@/components/practicals/SectionEditor';

/* ─── types ──────────────────────────────────────────── */
interface Practical {
  id: string;
  title: string;
  subject_template: string;
  is_published: boolean;
  is_premium: boolean;
  total_marks: number;
  estimated_time: number;
  difficulty: string;
  chapter_id?: string;
  price_xaf?: number;
}

interface Rubric {
  id: string;
  criterion: string;
  description: string;
  max_marks: number;
  order_index: number;
}

interface Attempt {
  id: string;
  status: string;
  submitted_at: string | null;
  total_marks_awarded: number | null;
  users?: { display_name: string; phone_number?: string };
  grading_data?: {
    totalMarks?: number;
    summary?: string;
    perCriterion?: { criterion: string; marks: number; maxMarks: number; comment: string }[];
  };
  pdf_url?: string;
}

/* ─── helpers ────────────────────────────────────────── */
function extractData<T>(raw: unknown, key: string): T | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return (r[key] ?? null) as T | null;
}
function extractList<T>(raw: unknown, key: string): T[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const l = r[key] ?? r['data'] ?? r['items'];
  return Array.isArray(l) ? l as T[] : [];
}

/* ─── tab type ───────────────────────────────────────── */
type Tab = 'sections' | 'rubrics' | 'submissions' | 'settings';

/* ─── sortable section pill ──────────────────────────── */
function SortablePill({ section, active, onClick }: {
  section: PracticalSection; active: boolean; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer border transition-colors ${
        active ? 'border-purple-300 bg-purple-50' : 'border-[#e2e8f0] bg-white hover:bg-gray-50'
      }`}>
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab shrink-0">
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${active ? 'text-purple-800 font-medium' : 'text-slate-700'}`}>
          {section.label}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-400 uppercase">{section.type}</span>
          {section.is_student_fillable && <span className="text-[10px] text-purple-500">student fills</span>}
          {section.max_marks > 0 && <span className="text-[10px] text-slate-500">{section.max_marks}m</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── add section modal ──────────────────────────────── */
const SECTION_TYPES = [
  { value: 'rich_text', label: 'Rich Text' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'table', label: 'Table' },
  { value: 'graph', label: 'Graph' },
  { value: 'calculation', label: 'Calculation' },
  { value: 'equation', label: 'Equation' },
  { value: 'image', label: 'Image / Diagram' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'mcq', label: 'MCQ Questions' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'long_answer', label: 'Long Answer' },
  { value: 'code', label: 'Code Editor' },
  { value: 'flowchart', label: 'Flowchart' },
];

function AddSectionModal({ practicalId, orderIndex, onAdd, onClose }: {
  practicalId: string; orderIndex: number; onAdd: (s: PracticalSection) => void; onClose: () => void;
}) {
  const [type, setType] = useState('rich_text');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!label.trim()) { toast.error('Label is required'); return; }
    setSaving(true);
    try {
      const res = await api.post(`/admin/practicals/${practicalId}/sections`, {
        type, label, orderIndex,
      });
      const section = (res.data as any)?.data?.section ?? (res.data as any)?.section ?? { id: Date.now().toString(), type, label, order_index: orderIndex, content: {}, is_student_fillable: false, is_premium: false, max_marks: 0, questions: [] };
      onAdd(section);
      toast.success('Section added');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Add Section</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X size={16} /></button>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Label *</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g. Observation Tables" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            {SECTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving || !label.trim()}
            className="flex-1 h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {saving ? 'Adding…' : 'Add Section'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── rubric card ────────────────────────────────────── */
function RubricCard({ rubric, onDelete, onUpdate }: {
  rubric: Rubric;
  onDelete: () => void;
  onUpdate: (patch: Partial<Rubric>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ criterion: rubric.criterion, description: rubric.description, max_marks: rubric.max_marks });

  const save = async () => {
    try {
      await api.patch(`/admin/rubrics/${rubric.id}`, { criterion: form.criterion, description: form.description, maxMarks: form.max_marks });
      onUpdate(form);
      setEditing(false);
      toast.success('Rubric updated');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  if (editing) {
    return (
      <div className="p-4 border border-purple-200 bg-purple-50/30 rounded-xl space-y-3">
        <input value={form.criterion} onChange={(e) => setForm({ ...form, criterion: e.target.value })}
          className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          placeholder="Criterion" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
          className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-white"
          placeholder="Description / marking guidance…" />
        <div className="flex items-center gap-2">
          <input type="number" min={0} value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: Number(e.target.value) })}
            className="w-20 h-8 px-2 rounded-lg border border-[#e2e8f0] text-sm text-center" />
          <span className="text-xs text-slate-500">max marks</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setEditing(false)} className="h-8 px-3 rounded-lg border border-slate-300 text-xs text-gray-700 hover:bg-slate-50">Cancel</button>
            <button onClick={save} className="h-8 px-3 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700">Save</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#e2e8f0]">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{rubric.criterion}</p>
        {rubric.description && <p className="text-xs text-slate-500 mt-0.5">{rubric.description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{rubric.max_marks}m</span>
        <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-purple-600"><Pencil size={13} /></button>
        <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

/* ─── submissions tab ────────────────────────────────── */
function SubmissionsTab({ practicalId }: { practicalId: string }) {
  const [status, setStatus] = useState('submitted');
  const [selected, setSelected] = useState<Attempt | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'practicals', practicalId, 'attempts', status],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>(`/admin/practicals/${practicalId}/attempts?status=${status}&limit=20`);
      return res.data.data;
    },
  });

  const attempts = extractList<Attempt>(raw, 'attempts');

  if (selected) {
    const g = selected.grading_data;
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800">
          <ChevronLeft size={14} /> Back to list
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">{selected.users?.display_name ?? 'Student'}</p>
            <p className="text-xs text-slate-500">{selected.users?.phone_number} · {selected.submitted_at ? formatDate(selected.submitted_at) : '—'}</p>
          </div>
          {selected.pdf_url && (
            <a href={selected.pdf_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm text-gray-700 hover:bg-gray-50">
              <Download size={14} /> Download PDF
            </a>
          )}
        </div>
        {g && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800">AI Grading Report</p>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">{g.totalMarks ?? selected.total_marks_awarded ?? '—'} marks</span>
            </div>
            {g.summary && <p className="text-sm text-slate-600 italic">"{g.summary}"</p>}
            {g.perCriterion && (
              <div className="space-y-2">
                {g.perCriterion.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#f8fafc]">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{c.criterion}</p>
                      {c.comment && <p className="text-xs text-slate-500 mt-0.5">{c.comment}</p>}
                    </div>
                    <span className="text-sm font-bold text-purple-700 whitespace-nowrap">{c.marks}/{c.maxMarks}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-[#f1f5f9] rounded-lg w-fit">
        {['submitted', 'graded', 'in_progress'].map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${status === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              {['Student', 'Phone', 'Status', 'Submitted', 'Score', 'Action'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f1f5f9]">
                  {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : attempts.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">No {status.replace('_', ' ')} attempts</td></tr>
            ) : attempts.map((a) => (
              <tr key={a.id} className="border-b border-[#f1f5f9] hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{a.users?.display_name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{a.users?.phone_number ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    a.status === 'graded' ? 'bg-green-100 text-green-700' : a.status === 'submitted' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>{a.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{a.submitted_at ? formatDate(a.submitted_at) : '—'}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{a.total_marks_awarded ?? '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelected(a)} className="text-xs text-purple-600 hover:underline">View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── settings tab ───────────────────────────────────── */
function SettingsTab({ practical, practicalId, onPublishToggle, publishLoading }: {
  practical: Practical; practicalId: string; onPublishToggle: () => void; publishLoading: boolean;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    title: practical.title,
    estimatedTime: practical.estimated_time,
    difficulty: practical.difficulty,
    isPremium: practical.is_premium,
    priceXaf: practical.price_xaf ?? 500,
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      await api.patch(`/admin/practicals/${practicalId}`, {
        title: form.title,
        estimatedTime: form.estimatedTime,
        difficulty: form.difficulty,
        isPremium: form.isPremium,
        priceXaf: form.isPremium ? form.priceXaf : undefined,
      });
      qc.invalidateQueries({ queryKey: ['admin', 'practicals', practicalId] });
      toast.success('Settings saved');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSavingDetails(false); }
  };

  const deletePractical = async () => {
    if (deleteText !== practical.title) { toast.error('Title does not match'); return; }
    setDeleting(true);
    try {
      await api.delete(`/admin/practicals/${practicalId}`);
      toast.success('Practical deleted');
      router.push('/dashboard/content/practicals');
    } catch (err) { toast.error(getErrorMessage(err)); setDeleting(false); }
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Publish */}
      <button onClick={onPublishToggle} disabled={publishLoading}
        className={`w-full h-11 rounded-xl font-semibold text-sm transition-colors ${
          practical.is_published ? 'border-2 border-red-300 text-red-600 hover:bg-red-50' : 'bg-green-600 hover:bg-green-700 text-white'
        }`}>
        {publishLoading ? '…' : practical.is_published ? 'Unpublish' : '🚀 Publish Practical'}
      </button>

      {/* Metadata */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Metadata</p>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estimated Time (min)</label>
            <input type="number" value={form.estimatedTime} onChange={(e) => setForm({ ...form, estimatedTime: Number(e.target.value) })}
              className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Difficulty</label>
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
          <span className="text-sm text-slate-700">Premium</span>
          <button type="button" onClick={() => setForm({ ...form, isPremium: !form.isPremium })}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.isPremium ? 'bg-purple-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isPremium ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {form.isPremium && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Price (XAF)</label>
            <input type="number" min={0} value={form.priceXaf} onChange={(e) => setForm({ ...form, priceXaf: Number(e.target.value) })}
              className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        )}
        <button onClick={saveDetails} disabled={savingDetails}
          className="w-full h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60 transition-colors">
          {savingDetails ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="border-2 border-red-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><AlertTriangle size={14} /> Danger Zone</p>
        <p className="text-xs text-red-600/80">This will permanently delete the practical and all student attempts.</p>
        <p className="text-xs text-slate-600">Type <strong>{practical.title}</strong> to confirm:</p>
        <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)}
          className="w-full h-9 px-3 rounded-lg border border-red-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="Type title to confirm" />
        <button onClick={deletePractical} disabled={deleting || deleteText !== practical.title}
          className="w-full h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-40 transition-colors">
          {deleting ? 'Deleting…' : 'Delete Practical'}
        </button>
      </div>
    </div>
  );
}

/* ─── rubrics tab ────────────────────────────────────── */
function RubricsTab({ practicalId, initialRubrics, totalMarks }: {
  practicalId: string; initialRubrics: Rubric[]; totalMarks: number;
}) {
  const [rubrics, setRubrics] = useState<Rubric[]>(initialRubrics);
  const [adding, setAdding] = useState(false);
  const [newR, setNewR] = useState({ criterion: '', description: '', maxMarks: 5 });
  const [saving, setSaving] = useState(false);

  const addRubric = async () => {
    if (!newR.criterion.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`/admin/practicals/${practicalId}/rubrics`, {
        criterion: newR.criterion,
        description: newR.description,
        maxMarks: newR.maxMarks,
        orderIndex: rubrics.length,
      });
      const created = (res.data as any)?.data?.rubric ?? (res.data as any)?.rubric;
      setRubrics([...rubrics, created ?? { ...newR, id: Date.now().toString(), max_marks: newR.maxMarks, order_index: rubrics.length }]);
      setNewR({ criterion: '', description: '', maxMarks: 5 });
      setAdding(false);
      toast.success('Criterion added');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const deleteRubric = async (id: string) => {
    try {
      await api.delete(`/admin/rubrics/${id}`);
      setRubrics(rubrics.filter((r) => r.id !== id));
      toast.success('Criterion deleted');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const totalLocal = rubrics.reduce((s, r) => s + (r.max_marks ?? 0), 0);

  return (
    <div className="space-y-4 max-w-2xl">
      {rubrics.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <AlertTriangle size={15} /> No rubrics defined — AI grader needs at least one criterion to grade submissions.
        </div>
      )}

      {rubrics.map((r) => (
        <RubricCard key={r.id} rubric={r}
          onDelete={() => deleteRubric(r.id)}
          onUpdate={(patch) => setRubrics(rubrics.map((x) => x.id === r.id ? { ...x, ...patch } : x))} />
      ))}

      <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0]">
        <p className="text-sm font-semibold text-slate-700">Total marks: <span className="text-purple-700">{totalMarks || totalLocal}</span></p>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium">
          <Plus size={14} /> Add Criterion
        </button>
      </div>

      {adding && (
        <div className="p-4 border border-purple-200 bg-purple-50/30 rounded-xl space-y-3">
          <input value={newR.criterion} onChange={(e) => setNewR({ ...newR, criterion: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Criterion (e.g. Accuracy of measurements)" />
          <textarea value={newR.description} onChange={(e) => setNewR({ ...newR, description: e.target.value })} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            placeholder="Marking guidance for AI grader…" />
          <div className="flex items-center gap-3">
            <input type="number" min={1} value={newR.maxMarks} onChange={(e) => setNewR({ ...newR, maxMarks: Number(e.target.value) })}
              className="w-20 h-9 px-2 rounded-lg border border-[#e2e8f0] text-sm text-center bg-white" />
            <span className="text-xs text-slate-500">max marks</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setAdding(false)} className="h-9 px-3 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
              <button onClick={addRubric} disabled={saving || !newR.criterion.trim()}
                className="h-9 px-3 rounded-lg bg-purple-600 text-white text-sm font-medium disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── main editor page ───────────────────────────────── */
export default function PracticalEditorPage() {
  const { practicalId } = useParams<{ practicalId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'practicals', practicalId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>(`/admin/practicals/${practicalId}`);
      return res.data.data;
    },
    enabled: !!practicalId,
  });

  const practical = extractData<Practical>(raw, 'practical');
  const [sections, setSections] = useState<PracticalSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('sections');
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  const rawSections = extractList<PracticalSection>(raw, 'sections');
  const rubrics = extractList<Rubric>(raw, 'rubrics');

  // Sync sections from API
  useEffect(() => {
    if (rawSections.length) {
      setSections([...rawSections].sort((a, b) => a.order_index - b.order_index));
    }
  }, [rawSections.length]);

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    const next = arrayMove(sections, oldIdx, newIdx).map((s, i) => ({ ...s, order_index: i }));
    setSections(next);
    try {
      await api.patch(`/admin/practicals/${practicalId}/sections/reorder`, {
        order: next.map((s) => ({ id: s.id, orderIndex: s.order_index })),
      });
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const deleteSection = async (id: string) => {
    try {
      await api.delete(`/admin/sections/${id}`);
      setSections((s) => s.filter((x) => x.id !== id));
      if (selectedSectionId === id) setSelectedSectionId(null);
      toast.success('Section deleted');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const togglePublish = async () => {
    if (!practical) return;
    if (!practical.is_published && rubrics.length === 0) {
      toast.warning('Add at least one rubric criterion before publishing — the AI grader needs it.');
      return;
    }
    setPublishLoading(true);
    try {
      await api.patch(`/admin/practicals/${practicalId}/publish`);
      qc.invalidateQueries({ queryKey: ['admin', 'practicals', practicalId] });
      toast.success(practical.is_published ? 'Unpublished' : 'Published');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setPublishLoading(false); }
  };

  if (isLoading || !practical) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 bg-gray-100 rounded-xl" />
        <div className="h-[500px] bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-0">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/dashboard/content/practicals')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">
            <ChevronLeft size={18} />
          </button>
          <h1 className="font-bold text-slate-900 text-lg truncate">{practical.title}</h1>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${practical.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-700'}`}>
            {practical.is_published ? '● Live' : 'Draft'}
          </span>
        </div>
        <button onClick={togglePublish} disabled={publishLoading}
          className={`h-9 px-4 rounded-lg text-sm font-medium shrink-0 transition-colors ${
            practical.is_published ? 'border border-red-300 text-red-600 hover:bg-red-50' : 'bg-green-600 hover:bg-green-700 text-white'
          }`}>
          {publishLoading ? '…' : practical.is_published ? 'Unpublish' : '🚀 Publish'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#e2e8f0] mb-4">
        {(['sections', 'rubrics', 'submissions', 'settings'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Sections tab: split layout */}
      {tab === 'sections' && (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left sidebar */}
          <div className="w-64 shrink-0 flex flex-col gap-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1.5 overflow-y-auto">
                  {sections.map((s) => (
                    <SortablePill key={s.id} section={s}
                      active={selectedSectionId === s.id}
                      onClick={() => setSelectedSectionId(s.id)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button onClick={() => setAddSectionOpen(true)}
              className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 text-sm text-gray-500 hover:text-purple-600 transition-colors mt-1">
              <Plus size={14} /> Add Section
            </button>
          </div>

          {/* Right panel */}
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            {selectedSection ? (
              <div className="h-full overflow-y-auto">
                <SectionHeader section={selectedSection} onDelete={() => deleteSection(selectedSection.id)} />
                <SectionContentEditor section={selectedSection} />
                {/* Show questions panel for text/drawing sections too (admin can add sub-questions) */}
                {!['mcq', 'short_answer'].includes(selectedSection.type) && selectedSection.is_student_fillable && (
                  <div className="border-t border-[#e2e8f0]">
                    <QuestionsPanel section={selectedSection} />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <FlaskConical size={40} className="text-gray-200 mb-3" />
                <p className="text-slate-500 text-sm">Select a section from the left to edit its content</p>
                {sections.length === 0 && (
                  <button onClick={() => setAddSectionOpen(true)} className="mt-3 text-sm text-purple-600 hover:underline">
                    Add your first section
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'rubrics' && (
        <RubricsTab practicalId={practicalId} initialRubrics={rubrics} totalMarks={practical.total_marks} />
      )}

      {tab === 'submissions' && (
        <SubmissionsTab practicalId={practicalId} />
      )}

      {tab === 'settings' && (
        <SettingsTab practical={practical} practicalId={practicalId} onPublishToggle={togglePublish} publishLoading={publishLoading} />
      )}

      {addSectionOpen && (
        <AddSectionModal
          practicalId={practicalId}
          orderIndex={sections.length}
          onAdd={(s) => { setSections((prev) => [...prev, s]); setSelectedSectionId(s.id); }}
          onClose={() => setAddSectionOpen(false)}
        />
      )}
    </div>
  );
}
