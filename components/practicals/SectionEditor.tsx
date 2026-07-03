'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Trash2, Upload, ImageIcon } from 'lucide-react';
import api from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

/* ─── types ──────────────────────────────────────────── */
export interface PracticalSection {
  id: string;
  type: string;
  label: string;
  order_index: number;
  content: Record<string, unknown>;
  is_student_fillable: boolean;
  is_premium: boolean;
  max_marks: number;
  questions: Question[];
}

export interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'short_answer';
  options?: string[];
  correct_answer: string;
  marks: number;
  order_index: number;
}

/* ─── auto-save hook ─────────────────────────────────── */
export function useDebouncedSave(sectionId: string, delay = 800) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const save = useCallback((patch: Record<string, unknown>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await api.patch(`/admin/sections/${sectionId}`, patch);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      } catch (err) {
        toast.error(getErrorMessage(err));
        setStatus('idle');
      }
    }, delay);
  }, [sectionId, delay]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return { save, status };
}

/* ─── save indicator ─────────────────────────────────── */
export function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' }) {
  if (status === 'idle') return null;
  return (
    <span className={`text-xs font-medium ${status === 'saving' ? 'text-gray-400' : 'text-green-600'}`}>
      {status === 'saving' ? 'Saving…' : '✓ Saved'}
    </span>
  );
}

/* ─── section header ─────────────────────────────────── */
export function SectionHeader({ section, onDelete }: {
  section: PracticalSection;
  onDelete: () => void;
}) {
  const { save, status } = useDebouncedSave(section.id);
  const [label, setLabel] = useState(section.label);
  const [maxMarks, setMaxMarks] = useState(section.max_marks);
  const [isStudentFillable, setIsStudentFillable] = useState(section.is_student_fillable);
  const [isPremium, setIsPremium] = useState(section.is_premium);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
      <input value={label} onChange={(e) => { setLabel(e.target.value); save({ label: e.target.value }); }}
        className="flex-1 min-w-[160px] h-8 px-2 rounded-lg border border-[#e2e8f0] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />

      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
        <button type="button" onClick={() => { const v = !isStudentFillable; setIsStudentFillable(v); save({ isStudentFillable: v }); }}
          className={`relative w-9 h-5 rounded-full transition-colors ${isStudentFillable ? 'bg-purple-600' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isStudentFillable ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
        Student fills
      </label>

      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
        <button type="button" onClick={() => { const v = !isPremium; setIsPremium(v); save({ isPremium: v }); }}
          className={`relative w-9 h-5 rounded-full transition-colors ${isPremium ? 'bg-purple-600' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPremium ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
        Premium
      </label>

      <div className="flex items-center gap-1.5">
        <input type="number" min={0} value={maxMarks}
          onChange={(e) => { const v = Number(e.target.value); setMaxMarks(v); save({ maxMarks: v }); }}
          className="w-16 h-8 px-2 rounded-lg border border-[#e2e8f0] text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
        <span className="text-xs text-slate-500">marks</span>
      </div>

      <SaveIndicator status={status} />

      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
          <Trash2 size={14} />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600">Delete section?</span>
          <button onClick={onDelete} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:underline">No</button>
        </div>
      )}
    </div>
  );
}

/* ─── 5a: rich_text ─────────────────────────────────── */
export function RichTextEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const [html, setHtml] = useState((section.content?.html as string) ?? '');

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">Type: Rich Text</span>
        <SaveIndicator status={status} />
      </div>
      <textarea
        value={html}
        onChange={(e) => { setHtml(e.target.value); save({ content: { html: e.target.value } }); }}
        rows={10}
        className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
        placeholder="Enter content (HTML or plain text)…"
      />
      <p className="text-xs text-slate-400">Supports HTML: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;h3&gt;</p>
    </div>
  );
}

/* ─── 5b: checklist ─────────────────────────────────── */
export function ChecklistEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const [items, setItems] = useState<string[]>((section.content?.items as string[]) ?? ['']);

  const update = (newItems: string[]) => {
    setItems(newItems);
    save({ content: { items: newItems.filter((i) => i.trim()) } });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Type: Checklist</span>
        <SaveIndicator status={status} />
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-slate-400 text-xs w-5 text-right">{i + 1}.</span>
            <input value={item} onChange={(e) => { const n = [...items]; n[i] = e.target.value; update(n); }}
              className="flex-1 h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={`Item ${i + 1}`} />
            <button onClick={() => update(items.filter((_, j) => j !== i))}
              className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <button onClick={() => update([...items, ''])}
        className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800">
        <Plus size={14} /> Add item
      </button>
    </div>
  );
}

/* ─── 5c: table ──────────────────────────────────────── */
export function TableEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const [columns, setColumns] = useState<string[]>((section.content?.columns as string[]) ?? ['Column 1']);
  const [rows, setRows] = useState<number>((section.content?.rows as number) ?? 5);

  const update = (cols: string[], r: number) => {
    setColumns(cols); setRows(r);
    save({ content: { columns: cols, rows: r } });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Type: Table Builder</span>
        <SaveIndicator status={status} />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-700">Column Headers</p>
        {columns.map((col, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-slate-400 text-xs w-5 text-right">{i + 1}.</span>
            <input value={col} onChange={(e) => { const n = [...columns]; n[i] = e.target.value; update(n, rows); }}
              className="flex-1 h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Column header" />
            <button onClick={() => update(columns.filter((_, j) => j !== i), rows)}
              className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
          </div>
        ))}
        <button onClick={() => update([...columns, `Column ${columns.length + 1}`], rows)}
          className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800">
          <Plus size={14} /> Add column
        </button>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-slate-700 whitespace-nowrap">Initial rows:</label>
        <input type="number" min={1} max={50} value={rows}
          onChange={(e) => update(columns, Number(e.target.value))}
          className="w-20 h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>
      {/* Preview */}
      <div className="border border-[#e2e8f0] rounded-lg overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr className="bg-[#f8fafc]">
              {columns.map((c, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-[#e2e8f0] whitespace-nowrap">{c || `Col ${i+1}`}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.min(rows, 5) }).map((_, r) => (
              <tr key={r} className="border-b border-[#f1f5f9] last:border-0">
                {columns.map((_, c) => <td key={c} className="px-3 py-2 text-slate-300">—</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {rows > 5 && <p className="text-center text-xs text-slate-400 py-2">… {rows - 5} more rows</p>}
      </div>
    </div>
  );
}

/* ─── 5d: graph ──────────────────────────────────────── */
export function GraphEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const c = section.content as any;
  const [form, setForm] = useState({
    xLabel: c?.xAxis?.label ?? '',
    xUnit: c?.xAxis?.unit ?? '',
    yLabel: c?.yAxis?.label ?? '',
    yUnit: c?.yAxis?.unit ?? '',
    scale: c?.xAxis?.scale ?? 'linear',
    gridSize: c?.gridSize ?? 10,
    trendNote: c?.trendNote ?? '',
  });

  const update = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    save({ content: {
      xAxis: { label: next.xLabel, unit: next.xUnit, scale: next.scale },
      yAxis: { label: next.yLabel, unit: next.yUnit, scale: next.scale },
      gridSize: next.gridSize,
      trendNote: next.trendNote,
    }});
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Type: Graph Builder</span>
        <SaveIndicator status={status} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">X-axis Label</label>
          <input value={form.xLabel} onChange={(e) => update({ xLabel: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Time" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">X Unit</label>
          <input value={form.xUnit} onChange={(e) => update({ xUnit: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="s" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Y-axis Label</label>
          <input value={form.yLabel} onChange={(e) => update({ yLabel: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Extension" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Y Unit</label>
          <input value={form.yUnit} onChange={(e) => update({ yUnit: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="cm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Scale</label>
          <select value={form.scale} onChange={(e) => update({ scale: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="linear">Linear</option>
            <option value="log">Logarithmic</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Grid Size (cells)</label>
          <input type="number" min={5} max={50} value={form.gridSize} onChange={(e) => update({ gridSize: Number(e.target.value) })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Expected Trend (optional)</label>
        <input value={form.trendNote} onChange={(e) => update({ trendNote: e.target.value })}
          className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Expected: linear through origin" />
      </div>
    </div>
  );
}

/* ─── 5e: calculation ────────────────────────────────── */
export function CalculationEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const c = section.content as any;
  const [form, setForm] = useState({
    formula: c?.formula ?? '',
    description: c?.description ?? '',
    stepsHint: c?.stepsHint ?? 3,
  });

  const update = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    save({ content: next });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Type: Calculation</span>
        <SaveIndicator status={status} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Formula</label>
        <input value={form.formula} onChange={(e) => update({ formula: e.target.value })}
          className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="n = CV / 1000" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={3}
          className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          placeholder="Describe what the student should calculate…" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Working Steps Hint</label>
        <input type="number" min={1} value={form.stepsHint} onChange={(e) => update({ stepsHint: Number(e.target.value) })}
          className="w-24 h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>
    </div>
  );
}

/* ─── 5f: equation ───────────────────────────────────── */
export function EquationEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const c = section.content as any;
  const [equations, setEquations] = useState<string[]>(c?.equations ?? ['']);
  const [studentMustWrite, setStudentMustWrite] = useState<boolean>(c?.studentMustWrite ?? true);

  const update = (eqs: string[], smw: boolean) => {
    setEquations(eqs); setStudentMustWrite(smw);
    save({ content: { equations: eqs.filter((e) => e.trim()), studentMustWrite: smw } });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Type: Equation</span>
        <SaveIndicator status={status} />
      </div>
      <div className="space-y-2">
        {equations.map((eq, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={eq} onChange={(e) => { const n = [...equations]; n[i] = e.target.value; update(n, studentMustWrite); }}
              className="flex-1 h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="HCl + NaOH → NaCl + H_2O" />
            <button onClick={() => update(equations.filter((_, j) => j !== i), studentMustWrite)}
              className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
          </div>
        ))}
        <button onClick={() => update([...equations, ''], studentMustWrite)}
          className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800">
          <Plus size={14} /> Add equation
        </button>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={studentMustWrite} onChange={(e) => update(equations, e.target.checked)}
          className="w-4 h-4 accent-purple-600" />
        <span className="text-sm text-slate-700">Student must write the equation themselves</span>
      </label>
    </div>
  );
}

/* ─── 5g: image ──────────────────────────────────────── */
export function ImageEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const [url, setUrl] = useState((section.content?.url as string) ?? '');
  const [caption, setCaption] = useState((section.content?.caption as string) ?? '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/admin/sections/${section.id}/media`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newUrl = (res.data as any)?.url ?? (res.data as any)?.data?.url ?? '';
      setUrl(newUrl);
      save({ content: { url: newUrl, caption } });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Type: Image / Diagram</span>
        <SaveIndicator status={status} />
      </div>
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <div
        onClick={() => fileRef.current?.click()}
        className="w-full h-48 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer flex items-center justify-center overflow-hidden">
        {url
          ? <img src={url} alt="preview" className="w-full h-full object-contain" />
          : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <ImageIcon size={32} />
              <span className="text-sm">{uploading ? 'Uploading…' : 'Click to upload image or PDF'}</span>
            </div>
          )}
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Caption</label>
        <input value={caption} onChange={(e) => { setCaption(e.target.value); save({ content: { url, caption: e.target.value } }); }}
          className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="e.g. Specimen of Spirogyra" />
      </div>
    </div>
  );
}

/* ─── 5h: drawing ────────────────────────────────────── */
export function DrawingEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const c = section.content as any;
  const [instructions, setInstructions] = useState(c?.instructions ?? '');
  const [referenceUrl, setReferenceUrl] = useState(c?.referenceUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/admin/sections/${section.id}/media`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newUrl = (res.data as any)?.url ?? (res.data as any)?.data?.url ?? '';
      setReferenceUrl(newUrl);
      save({ content: { instructions, referenceUrl: newUrl } });
      toast.success('Reference image uploaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Type: Drawing Instructions</span>
        <SaveIndicator status={status} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Instructions for student</label>
        <textarea value={instructions} onChange={(e) => { setInstructions(e.target.value); save({ content: { instructions: e.target.value, referenceUrl } }); }}
          rows={4} className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          placeholder="Draw and label a transverse section…" />
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <div>
        <p className="text-xs font-medium text-slate-700 mb-1">Reference image (optional)</p>
        {referenceUrl
          ? <div className="relative w-40"><img src={referenceUrl} alt="" className="w-full rounded-lg border border-[#e2e8f0]" />
              <button onClick={() => { setReferenceUrl(''); save({ content: { instructions, referenceUrl: null } }); }}
                className="absolute top-1 right-1 p-0.5 bg-white rounded-full shadow"><Trash2 size={12} className="text-red-500" /></button>
            </div>
          : <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-purple-400">
              <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload reference'}
            </button>}
      </div>
    </div>
  );
}

/* ─── 5i/5j: questions panel ─────────────────────────── */
export function QuestionsPanel({ section }: { section: PracticalSection }) {
  const [questions, setQuestions] = useState<Question[]>(section.questions ?? []);
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState({ questionText: '', questionType: 'short_answer' as 'mcq' | 'short_answer', options: ['', '', '', ''], correctAnswer: '', marks: 2 });
  const [saving, setSaving] = useState(false);

  const addQuestion = async () => {
    if (!newQ.questionText.trim()) return;
    setSaving(true);
    try {
      const body: any = {
        questionText: newQ.questionText,
        questionType: newQ.questionType,
        correctAnswer: newQ.correctAnswer,
        marks: newQ.marks,
        orderIndex: questions.length,
      };
      if (newQ.questionType === 'mcq') body.options = newQ.options.filter((o) => o.trim());
      const res = await api.post(`/admin/sections/${section.id}/questions`, body);
      const created = (res.data as any)?.data?.question ?? (res.data as any)?.question ?? body;
      setQuestions([...questions, created]);
      setNewQ({ questionText: '', questionType: 'short_answer', options: ['', '', '', ''], correctAnswer: '', marks: 2 });
      setAdding(false);
      toast.success('Question added');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      await api.delete(`/admin/questions/${id}`);
      setQuestions(questions.filter((q) => q.id !== id));
      toast.success('Question deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">Questions ({questions.length})</span>
        <button onClick={() => setAdding(!adding)} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800">
          <Plus size={13} /> Add Question
        </button>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-slate-800 font-medium">{i + 1}. {q.question_text}</p>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-slate-500">{q.marks}m</span>
              <button onClick={() => deleteQuestion(q.id)} className="p-0.5 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
            </div>
          </div>
          {q.question_type === 'mcq' && q.options && (
            <div className="grid grid-cols-2 gap-1">
              {q.options.map((o, j) => (
                <span key={j} className={`text-xs px-2 py-0.5 rounded ${o === q.correct_answer ? 'bg-green-100 text-green-700 font-medium' : 'text-slate-600'}`}>
                  {String.fromCharCode(65 + j)}. {o}
                </span>
              ))}
            </div>
          )}
          {q.question_type === 'short_answer' && q.correct_answer && (
            <p className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">Model: {q.correct_answer}</p>
          )}
        </div>
      ))}

      {adding && (
        <div className="p-3 border border-purple-200 bg-purple-50/30 rounded-xl space-y-3">
          <div className="flex gap-2">
            <select value={newQ.questionType} onChange={(e) => setNewQ({ ...newQ, questionType: e.target.value as any })}
              className="h-8 px-2 rounded-lg border border-[#e2e8f0] text-xs bg-white">
              <option value="short_answer">Short Answer</option>
              <option value="mcq">MCQ</option>
            </select>
            <input type="number" min={1} value={newQ.marks} onChange={(e) => setNewQ({ ...newQ, marks: Number(e.target.value) })}
              className="w-16 h-8 px-2 rounded-lg border border-[#e2e8f0] text-xs text-center" placeholder="Marks" />
          </div>
          <textarea value={newQ.questionText} onChange={(e) => setNewQ({ ...newQ, questionText: e.target.value })} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            placeholder="Question text…" />
          {newQ.questionType === 'mcq' ? (
            <div className="space-y-1.5">
              {newQ.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="correctMCQ" value={o} checked={newQ.correctAnswer === o}
                    onChange={() => setNewQ({ ...newQ, correctAnswer: o })} className="accent-purple-600" />
                  <input value={o} onChange={(e) => { const opts = [...newQ.options]; opts[i] = e.target.value; setNewQ({ ...newQ, options: opts }); }}
                    className="flex-1 h-8 px-2 rounded-lg border border-[#e2e8f0] text-sm"
                    placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
          ) : (
            <textarea value={newQ.correctAnswer} onChange={(e) => setNewQ({ ...newQ, correctAnswer: e.target.value })} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Model answer (for AI grader)…" />
          )}
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 h-8 rounded-lg border border-slate-300 text-xs text-gray-700 hover:bg-slate-50">Cancel</button>
            <button onClick={addQuestion} disabled={saving || !newQ.questionText.trim()}
              className="flex-1 h-8 rounded-lg bg-purple-600 text-white text-xs font-medium disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Question'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 5k: long_answer ────────────────────────────────── */
export function LongAnswerEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const c = section.content as any;
  const [form, setForm] = useState({ prompt: c?.prompt ?? '', minWords: c?.minWords ?? 80 });

  const update = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch }; setForm(next); save({ content: next });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Type: Long Answer</span>
        <SaveIndicator status={status} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Prompt / Instructions</label>
        <textarea value={form.prompt} onChange={(e) => update({ prompt: e.target.value })} rows={4}
          className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          placeholder="Write a conclusion for this experiment…" />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-700 whitespace-nowrap">Min words:</label>
        <input type="number" min={0} value={form.minWords} onChange={(e) => update({ minWords: Number(e.target.value) })}
          className="w-20 h-8 px-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>
    </div>
  );
}

/* ─── 5l: code ───────────────────────────────────────── */
export function CodeEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const c = section.content as any;
  const [form, setForm] = useState({
    language: c?.language ?? 'python',
    starterCode: c?.starterCode ?? '',
    instructions: c?.instructions ?? '',
  });

  const update = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch }; setForm(next); save({ content: next });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Type: Code Editor</span>
        <SaveIndicator status={status} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Language</label>
        <select value={form.language} onChange={(e) => update({ language: e.target.value })}
          className="h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
          {['python', 'java', 'pascal', 'c', 'pseudocode'].map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Starter Code</label>
        <textarea value={form.starterCode} onChange={(e) => update({ starterCode: e.target.value })} rows={8}
          className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
          placeholder={`# Write starter code here…`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Instructions</label>
        <textarea value={form.instructions} onChange={(e) => update({ instructions: e.target.value })} rows={3}
          className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          placeholder="Describe what the student should implement…" />
      </div>
    </div>
  );
}

/* ─── 5m: flowchart ──────────────────────────────────── */
export function FlowchartEditor({ section }: { section: PracticalSection }) {
  const { save, status } = useDebouncedSave(section.id);
  const c = section.content as any;
  const [form, setForm] = useState({ instructions: c?.instructions ?? '', nodeCount: c?.nodeCount ?? 8 });

  const update = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch }; setForm(next); save({ content: next });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Type: Flowchart</span>
        <SaveIndicator status={status} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Instructions for student</label>
        <textarea value={form.instructions} onChange={(e) => update({ instructions: e.target.value })} rows={4}
          className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          placeholder="Draw a flowchart for a program that…" />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-700 whitespace-nowrap">Expected nodes:</label>
        <input type="number" min={3} value={form.nodeCount} onChange={(e) => update({ nodeCount: Number(e.target.value) })}
          className="w-20 h-8 px-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>
    </div>
  );
}

/* ─── dispatcher: pick editor by type ────────────────── */
export function SectionContentEditor({ section }: { section: PracticalSection }) {
  switch (section.type) {
    case 'rich_text':     return <RichTextEditor section={section} />;
    case 'checklist':     return <ChecklistEditor section={section} />;
    case 'table':         return <TableEditor section={section} />;
    case 'graph':         return <GraphEditor section={section} />;
    case 'calculation':   return <CalculationEditor section={section} />;
    case 'equation':      return <EquationEditor section={section} />;
    case 'image':         return <ImageEditor section={section} />;
    case 'drawing':       return <DrawingEditor section={section} />;
    case 'mcq':           return <QuestionsPanel section={section} />;
    case 'short_answer':  return <QuestionsPanel section={section} />;
    case 'long_answer':   return <LongAnswerEditor section={section} />;
    case 'code':          return <CodeEditor section={section} />;
    case 'flowchart':     return <FlowchartEditor section={section} />;
    default:              return (
      <div className="p-4">
        <p className="text-xs text-slate-400">Unknown section type: <code>{section.type}</code></p>
        <RichTextEditor section={section} />
      </div>
    );
  }
}
