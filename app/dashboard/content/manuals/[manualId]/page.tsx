'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight, Camera, FileText, GripVertical, Pencil, Upload, Trash2,
  Plus, X, CheckCircle, Save, Clock, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, Manual } from '@/lib/types/api';

/* ─── types ──────────────────────────────────────────── */
interface Topic {
  id: string;
  title: string;
  description?: string;
  content?: string;
  content_type?: string;
  difficulty?: string;
  estimated_time?: number;
  order_index?: number;
  is_premium?: boolean;
  individual_price?: number;
  media_url?: string;
  pdf_url?: string;
}

/* ─── helpers ─────────────────────────────────────────── */
function extractManual(raw: unknown): Manual | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r['manual']) return r['manual'] as Manual;
  if (r['id']) return raw as Manual;
  return null;
}
function extractTopics(raw: unknown): Topic[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['topics'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as Topic[];
  if (Array.isArray(raw)) return raw as Topic[];
  return [];
}

/* ─── pill selector ──────────────────────────────────── */
function PillSelect({ options, value, onChange }: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${
            value === o.value ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-[#e2e8f0] text-gray-600 hover:border-gray-400'
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
        className="flex-1 min-w-[100px] text-sm outline-none bg-transparent"
        placeholder={tags.length === 0 ? 'Add tags…' : ''}
      />
    </div>
  );
}

/* ─── topic form (inline expandable) ─────────────────── */
function TopicForm({ topic, onSave, onCancel, saving }: {
  topic?: Topic;
  onSave: (data: Partial<Topic>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    title: topic?.title ?? '',
    description: topic?.description ?? '',
    content: topic?.content ?? '',
    content_type: topic?.content_type ?? 'text',
    difficulty: topic?.difficulty ?? 'Beginner',
    estimated_time: topic?.estimated_time ?? 15,
    order_index: topic?.order_index ?? 0,
    is_premium: topic?.is_premium ?? false,
    individual_price: topic?.individual_price ?? 500,
  });

  return (
    <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g. Chapter 1 — Quadratic Equations" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Short description of what this topic covers" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Content Body</label>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6}
            className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
            placeholder="Write the lesson content here…" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Content Type</label>
          <PillSelect
            options={[{ label: 'Text', value: 'text' }, { label: 'PDF', value: 'pdf' }, { label: 'Mixed', value: 'mixed' }]}
            value={form.content_type}
            onChange={(v) => setForm({ ...form, content_type: v })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Difficulty</label>
          <PillSelect
            options={[{ label: 'Beginner', value: 'Beginner' }, { label: 'Intermediate', value: 'Intermediate' }, { label: 'Advanced', value: 'Advanced' }]}
            value={form.difficulty}
            onChange={(v) => setForm({ ...form, difficulty: v })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Estimated Time (min)</label>
          <input type="number" min={1} value={form.estimated_time} onChange={(e) => setForm({ ...form, estimated_time: Number(e.target.value) })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Order Position</label>
          <input type="number" min={0} value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="sm:col-span-2 flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-[#e2e8f0]">
          <span className="text-sm text-slate-700">Premium Topic</span>
          <button type="button" onClick={() => setForm({ ...form, is_premium: !form.is_premium })}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.is_premium ? 'bg-purple-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_premium ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {form.is_premium && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Individual Price (XAF)</label>
            <input type="number" min={0} value={form.individual_price} onChange={(e) => setForm({ ...form, individual_price: Number(e.target.value) })}
              className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="h-9 px-4 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
        <button type="button" onClick={() => form.title && onSave(form)} disabled={saving || !form.title}
          className="h-9 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save Topic →'}
        </button>
      </div>
    </div>
  );
}

/* ─── topic media upload ──────────────────────────────── */
function TopicMediaRow({ topic, manualId }: { topic: Topic; manualId: string }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('media', file);
      await api.post(`/admin/manuals/${manualId}/topics/${topic.id}/media`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['admin', 'manuals', manualId, 'topics'] });
      toast.success('Media uploaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pl-8 pb-3">
      <input ref={ref} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) upload(e.target.files[0]); }} />
      {topic.media_url ? (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <FileText size={13} className="text-purple-500" />
          <a href={topic.media_url} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[200px]">View uploaded media</a>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50">
          <Upload size={12} /> {uploading ? 'Uploading…' : '📎 Upload Media'}
        </button>
      )}
    </div>
  );
}

/* ─── topic card ─────────────────────────────────────── */
function TopicCard({ topic, idx, manualId, dragIdx, onDragStart, onDragOver, onDrop, onEdit, onDelete }: {
  topic: Topic; idx: number; manualId: string;
  dragIdx: number | null;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (i: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const diffColor: Record<string, string> = {
    Beginner: 'bg-green-100 text-green-700',
    Intermediate: 'bg-yellow-100 text-yellow-700',
    Advanced: 'bg-red-100 text-red-700',
  };

  return (
    <div draggable onDragStart={() => onDragStart(idx)} onDragOver={onDragOver} onDrop={() => onDrop(idx)}
      className={`bg-white border border-[#e2e8f0] rounded-xl transition-opacity ${dragIdx === idx ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="cursor-grab text-gray-300 hover:text-gray-500 shrink-0"><GripVertical size={16} /></div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{topic.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {topic.content_type && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <FileText size={11} /> {topic.content_type.toUpperCase()}
              </span>
            )}
            {topic.estimated_time && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock size={11} /> {topic.estimated_time} min
              </span>
            )}
            {topic.difficulty && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diffColor[topic.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                {topic.difficulty}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${topic.is_premium ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
              {topic.is_premium ? 'Premium' : 'Free'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Edit"><Pencil size={14} /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>
      <TopicMediaRow topic={topic} manualId={manualId} />
    </div>
  );
}

/* ─── settings panel (right column) ─────────────────── */
function SettingsPanel({ manual, manualId, onPublishToggle, publishLoading }: {
  manual: Manual; manualId: string; onPublishToggle: () => void; publishLoading: boolean;
}) {
  const qc = useQueryClient();
  const router = useRouter();

  const [form, setForm] = useState({
    title: manual.title,
    subject: manual.subject ?? '',
    level: manual.level ?? 'OL',
    language: manual.language ?? 'English',
    is_premium: manual.is_premium ?? false,
  });
  const [tags, setTags] = useState<string[]>(manual.tags ?? []);
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const coverRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: 'cover' | 'pdf', setUploading: (v: boolean) => void) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append(type, file);
      await api.post(`/admin/manuals/${manualId}/${type}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['admin', 'manuals', manualId] });
      toast.success(`${type === 'cover' ? 'Cover' : 'PDF'} uploaded`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      await api.patch(`/admin/manuals/${manualId}`, { ...form, tags });
      qc.invalidateQueries({ queryKey: ['admin', 'manuals', manualId] });
      toast.success('Details saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingDetails(false);
    }
  };

  const deleteManual = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/manuals/${manualId}`);
      toast.success('Manual deleted');
      router.push('/dashboard/content/manuals');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Publish / Unpublish */}
      <button onClick={onPublishToggle} disabled={publishLoading}
        className={`w-full h-11 rounded-xl font-semibold text-sm transition-colors ${
          manual.is_published
            ? 'border-2 border-red-300 text-red-600 hover:bg-red-50'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}>
        {publishLoading ? '…' : manual.is_published ? 'Unpublish' : '🚀 Publish Manual'}
      </button>

      {/* Cover */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Cover Image</p>
        <div className="w-full aspect-video rounded-lg bg-[#f8fafc] border border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
          {manual.cover_url
            ? <img src={manual.cover_url} alt="" className="w-full h-full object-cover" />
            : <Camera size={28} className="text-gray-300" />}
        </div>
        <input ref={coverRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'cover', setUploadingCover)} />
        <button onClick={() => coverRef.current?.click()} disabled={uploadingCover}
          className="w-full h-9 rounded-lg border border-[#e2e8f0] text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          {uploadingCover ? 'Uploading…' : 'Upload Cover Image'}
        </button>
      </div>

      {/* PDF */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Full PDF</p>
        <div className="w-full h-16 rounded-lg bg-[#f8fafc] border border-dashed border-gray-300 flex items-center justify-center">
          {manual.file_url
            ? <a href={manual.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm text-purple-600 hover:underline">
                <FileText size={16} /> View uploaded PDF
              </a>
            : <span className="flex items-center gap-2 text-sm text-gray-400"><FileText size={16} /> No PDF uploaded</span>}
        </div>
        <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'pdf', setUploadingPdf)} />
        <button onClick={() => pdfRef.current?.click()} disabled={uploadingPdf}
          className="w-full h-9 rounded-lg border border-[#e2e8f0] text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          {uploadingPdf ? 'Uploading…' : 'Upload Full PDF'}
        </button>
        <p className="text-xs text-slate-400">Optional — students can download the complete manual</p>
      </div>

      {/* Details */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Details</p>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full h-9 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Level</label>
          <PillSelect
            options={[{ label: 'O-Level', value: 'OL' }, { label: 'A-Level', value: 'AL' }, { label: 'Both', value: 'both' }]}
            value={form.level} onChange={(v) => setForm({ ...form, level: v })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Language</label>
          <PillSelect
            options={[{ label: 'EN', value: 'English' }, { label: 'FR', value: 'French' }, { label: 'Bilingual', value: 'Bilingual' }]}
            value={form.language} onChange={(v) => setForm({ ...form, language: v })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
          <span className="text-sm text-slate-700">Premium</span>
          <button type="button" onClick={() => setForm({ ...form, is_premium: !form.is_premium })}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.is_premium ? 'bg-purple-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_premium ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <button onClick={saveDetails} disabled={savingDetails}
          className="w-full h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5">
          <Save size={14} /> {savingDetails ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="border-2 border-red-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><AlertTriangle size={14} /> Danger Zone</p>
        <p className="text-xs text-red-600/80">Permanently delete this manual and all its topics. This cannot be undone.</p>
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)}
            className="w-full h-9 rounded-lg border-2 border-red-300 text-red-600 text-sm font-medium hover:bg-red-50">
            Delete Manual
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-red-700 font-medium">Are you sure?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 h-9 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
              <button onClick={deleteManual} disabled={deleting} className="flex-1 h-9 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-60">
                {deleting ? '…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────── */
export default function ManualDetailPage() {
  const { manualId } = useParams<{ manualId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: manualRaw, isLoading: manualLoading } = useQuery({
    queryKey: ['admin', 'manuals', manualId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>(`/admin/manuals/${manualId}`);
      return res.data.data;
    },
    enabled: !!manualId,
  });

  const { data: topicsRaw, isLoading: topicsLoading } = useQuery({
    queryKey: ['admin', 'manuals', manualId, 'topics'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>(`/admin/manuals/${manualId}/topics`);
      return res.data.data;
    },
    enabled: !!manualId,
  });

  const manual = extractManual(manualRaw);
  const apiTopics = extractTopics(topicsRaw);

  // Local copy for drag-reorder (synced from API)
  const [localTopics, setLocalTopics] = useState<Topic[]>([]);
  const displayTopics = localTopics.length ? localTopics : apiTopics;

  // Keep local copy in sync when API data arrives
  if (apiTopics.length && !localTopics.length) {
    setLocalTopics(apiTopics);
  }

  const [addOpen, setAddOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [savingTopic, setSavingTopic] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);

  const createTopic = async (data: Partial<Topic>) => {
    setSavingTopic(true);
    try {
      await api.post(`/admin/manuals/${manualId}/topics`, data);
      qc.invalidateQueries({ queryKey: ['admin', 'manuals', manualId, 'topics'] });
      setLocalTopics([]);
      setAddOpen(false);
      toast.success('Topic created');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingTopic(false);
    }
  };

  const updateTopic = async (data: Partial<Topic>) => {
    if (!editingTopic) return;
    setSavingTopic(true);
    try {
      await api.patch(`/admin/manuals/${manualId}/topics/${editingTopic.id}`, data);
      qc.invalidateQueries({ queryKey: ['admin', 'manuals', manualId, 'topics'] });
      setLocalTopics([]);
      setEditingTopic(null);
      toast.success('Topic updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingTopic(false);
    }
  };

  const deleteTopic = async (topicId: string) => {
    setDeletingTopic(topicId);
    try {
      await api.delete(`/admin/manuals/${manualId}/topics/${topicId}`);
      qc.invalidateQueries({ queryKey: ['admin', 'manuals', manualId, 'topics'] });
      setLocalTopics([]);
      toast.success('Topic deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingTopic(null);
    }
  };

  const handleDrop = async (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return; }
    const next = [...displayTopics];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dropIdx, 0, moved);
    setLocalTopics(next);
    setDragIdx(null);
    try {
      await api.patch(`/admin/manuals/${manualId}/topics/${moved.id}`, { order_index: dropIdx });
    } catch {
      toast.error('Failed to save new order');
    }
  };

  const togglePublish = async () => {
    if (!manual) return;
    setPublishLoading(true);
    try {
      await api.patch(`/admin/manuals/${manualId}/publish`);
      qc.invalidateQueries({ queryKey: ['admin', 'manuals', manualId] });
      toast.success(manual.is_published ? 'Unpublished' : 'Published');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPublishLoading(false);
    }
  };

  if (manualLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-56 bg-gray-100 rounded" />
        <div className="flex gap-6">
          <div className="flex-1 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
          </div>
          <div className="w-80 space-y-3">
            <div className="h-11 bg-gray-100 rounded-xl" />
            <div className="h-40 bg-gray-100 rounded-xl" />
            <div className="h-60 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!manual) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-600 text-sm">Manual not found.</p>
        <button onClick={() => router.back()} className="mt-2 text-sm text-purple-600 hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <button onClick={() => router.push('/dashboard/content/manuals')} className="hover:text-purple-600 transition-colors">Manuals</button>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium truncate max-w-[260px]">{manual.title}</span>
        {manual.is_published && (
          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={11} /> Published
          </span>
        )}
      </nav>

      {/* Two-column */}
      <div className="flex gap-6 items-start">
        {/* LEFT — Topics (65%) */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg text-slate-800">
              Topics ({topicsLoading ? '…' : displayTopics.length})
            </h2>
            <button onClick={() => { setAddOpen((o) => !o); setEditingTopic(null); }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors">
              <Plus size={14} /> Add Topic
            </button>
          </div>

          {addOpen && (
            <TopicForm onSave={createTopic} onCancel={() => setAddOpen(false)} saving={savingTopic} />
          )}

          <div className="space-y-2">
            {topicsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
            ) : displayTopics.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-slate-500 text-sm">No topics yet</p>
                <button onClick={() => setAddOpen(true)} className="mt-1 text-sm text-purple-600 hover:underline">Add the first topic</button>
              </div>
            ) : displayTopics.map((t, i) => (
              <div key={t.id}>
                {editingTopic?.id === t.id ? (
                  <TopicForm topic={t} onSave={updateTopic} onCancel={() => setEditingTopic(null)} saving={savingTopic} />
                ) : (
                  <TopicCard
                    topic={t} idx={i} manualId={manualId}
                    dragIdx={dragIdx}
                    onDragStart={setDragIdx}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onEdit={() => { setEditingTopic(t); setAddOpen(false); }}
                    onDelete={() => deleteTopic(t.id)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Settings (35%) */}
        <div className="w-[320px] shrink-0 sticky top-4">
          <SettingsPanel
            manual={manual}
            manualId={manualId}
            onPublishToggle={togglePublish}
            publishLoading={publishLoading}
          />
        </div>
      </div>
    </div>
  );
}
