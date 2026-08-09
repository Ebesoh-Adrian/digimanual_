'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, GripVertical, Pencil, Trash2, Eye, EyeOff, Monitor } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, CarouselSlide } from '@/lib/types/api';

function extractSlides(raw: unknown): CarouselSlide[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['slides'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as CarouselSlide[];
  if (Array.isArray(raw)) return raw as CarouselSlide[];
  return [];
}

const TYPE_OPTIONS = [
  { value: 'custom', label: 'Custom' },
  { value: 'exam_countdown', label: 'Exam Countdown' },
  { value: 'new_content', label: 'New Content' },
];

const TYPE_BADGE: Record<string, string> = {
  custom: 'bg-purple-100 text-purple-700',
  exam_countdown: 'bg-orange-100 text-orange-700',
  new_content: 'bg-blue-100 text-blue-700',
};

interface SlideForm {
  type: 'exam_countdown' | 'new_content' | 'custom';
  title: string;
  subtitle: string;
  label: string;
  ctaText: string;
  ctaRoute: string;
  gradientStart: string;
  gradientEnd: string;
  emoji: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const EMPTY_FORM: SlideForm = {
  type: 'custom',
  title: '',
  subtitle: '',
  label: '',
  ctaText: '',
  ctaRoute: '',
  gradientStart: '#7C3AED',
  gradientEnd: '#4F46E5',
  emoji: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

function SlidePreview({ form }: { form: SlideForm }) {
  return (
    <div
      className="rounded-xl p-4 text-white text-center relative overflow-hidden min-h-[100px] flex flex-col justify-center"
      style={{ background: `linear-gradient(135deg, ${form.gradientStart}, ${form.gradientEnd})` }}
    >
      {form.emoji && <div className="text-3xl mb-1">{form.emoji}</div>}
      {form.label && <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">{form.label}</p>}
      <p className="font-bold text-lg leading-tight">{form.title || 'Slide Title'}</p>
      {form.subtitle && <p className="text-sm opacity-80 mt-1">{form.subtitle}</p>}
      {form.ctaText && (
        <div className="mt-3">
          <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-xs font-semibold">{form.ctaText}</span>
        </div>
      )}
    </div>
  );
}

function SlideModal({
  slide,
  onClose,
  onSaved,
}: {
  slide?: CarouselSlide;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SlideForm>(
    slide
      ? {
          type: slide.type,
          title: slide.title ?? '',
          subtitle: slide.subtitle ?? '',
          label: slide.label ?? '',
          ctaText: slide.ctaText ?? '',
          ctaRoute: slide.ctaRoute ?? '',
          gradientStart: slide.gradientStart ?? '#7C3AED',
          gradientEnd: slide.gradientEnd ?? '#4F46E5',
          emoji: slide.emoji ?? '',
          startsAt: slide.startsAt ? slide.startsAt.substring(0, 10) : '',
          endsAt: slide.endsAt ? slide.endsAt.substring(0, 10) : '',
          isActive: slide.isActive ?? true,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof SlideForm, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        title: form.title,
        isActive: form.isActive,
      };
      if (form.subtitle) payload.subtitle = form.subtitle;
      if (form.label) payload.label = form.label;
      if (form.ctaText) payload.ctaText = form.ctaText;
      if (form.ctaRoute) payload.ctaRoute = form.ctaRoute;
      if (form.gradientStart) payload.gradientStart = form.gradientStart;
      if (form.gradientEnd) payload.gradientEnd = form.gradientEnd;
      if (form.emoji) payload.emoji = form.emoji;
      if (form.startsAt) payload.startsAt = form.startsAt;
      if (form.endsAt) payload.endsAt = form.endsAt;

      if (slide) {
        await api.patch(`/admin/carousel-slides/${slide.id}`, payload);
        toast.success('Slide updated');
      } else {
        await api.post('/admin/carousel-slides', payload);
        toast.success('Slide created');
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
          <h2 className="font-semibold text-slate-900">{slide ? 'Edit Slide' : 'New Slide'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          <SlidePreview form={form} />

          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((t) => (
              <button key={t.value} onClick={() => set('type', t.value)}
                className={`h-9 rounded-lg text-xs font-medium border transition-colors ${form.type === t.value ? 'bg-purple-600 text-white border-purple-600' : 'border-[#e2e8f0] text-slate-600 hover:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Emoji</label>
              <input value={form.emoji} onChange={(e) => set('emoji', e.target.value)}
                placeholder="🎓" maxLength={4}
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Label (eyebrow text)</label>
              <input value={form.label} onChange={(e) => set('label', e.target.value)}
                placeholder="NEW THIS WEEK"
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="Main headline text"
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subtitle</label>
            <input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)}
              placeholder="Supporting text under the title"
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">CTA Button Text</label>
              <input value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)}
                placeholder="Start Learning"
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">CTA Route</label>
              <input value={form.ctaRoute} onChange={(e) => set('ctaRoute', e.target.value)}
                placeholder="/learn"
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gradient Start</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.gradientStart} onChange={(e) => set('gradientStart', e.target.value)}
                  className="w-9 h-10 rounded cursor-pointer border border-[#e2e8f0] p-0.5" />
                <input value={form.gradientStart} onChange={(e) => set('gradientStart', e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gradient End</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.gradientEnd} onChange={(e) => set('gradientEnd', e.target.value)}
                  className="w-9 h-10 rounded cursor-pointer border border-[#e2e8f0] p-0.5" />
                <input value={form.gradientEnd} onChange={(e) => set('gradientEnd', e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Show From (optional)</label>
              <input type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hide After (optional)</label>
              <input type="date" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)}
              className="w-4 h-4 rounded accent-purple-600" />
            Active (visible to students)
          </label>
        </div>

        <div className="px-6 py-4 border-t border-[#e2e8f0] flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="h-10 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {saving ? 'Saving…' : slide ? 'Update Slide' : 'Create Slide'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CarouselPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | CarouselSlide | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'carousel-slides'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>('/admin/carousel-slides');
      return res.data.data;
    },
  });

  const slides = extractSlides(raw).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'carousel-slides'] });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/carousel-slides/${id}/toggle`),
    onSuccess: () => { refresh(); toast.success('Slide toggled'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/carousel-slides/${id}`),
    onSuccess: () => { refresh(); toast.success('Slide deleted'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleDrop = async (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return; }
    const next = [...slides];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dropIdx, 0, moved);
    setDragIdx(null);
    try {
      await api.patch('/admin/carousel-slides/reorder', {
        order: next.map((s, i) => ({ id: s.id, orderIndex: i })),
      });
      refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carousel Slides</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage the Home screen hero banner slides</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shrink-0 transition-colors">
          <Plus size={16} /> New Slide
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-[#e2e8f0] animate-pulse" />
          ))}
        </div>
      ) : slides.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e2e8f0] py-20 text-center">
          <Monitor size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-slate-600">No slides yet</p>
          <button onClick={() => setModal('create')} className="mt-2 text-sm text-purple-600 hover:underline">
            Create the first slide
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              className={`bg-white border border-[#e2e8f0] rounded-xl flex items-center gap-4 px-4 py-3 transition-opacity ${dragIdx === i ? 'opacity-40' : ''}`}
            >
              <div className="cursor-grab text-gray-300 hover:text-gray-500 shrink-0">
                <GripVertical size={16} />
              </div>

              <div
                className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-xl"
                style={{ background: `linear-gradient(135deg, ${slide.gradientStart ?? '#7C3AED'}, ${slide.gradientEnd ?? '#4F46E5'})` }}
              >
                {slide.emoji || '🎓'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 text-sm truncate">{slide.title}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[slide.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {slide.type.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${slide.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {slide.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                  {slide.subtitle && <span className="truncate max-w-[200px]">{slide.subtitle}</span>}
                  {slide.startsAt && <span>From {formatDate(slide.startsAt)}</span>}
                  {slide.endsAt && <span>Until {formatDate(slide.endsAt)}</span>}
                  <span>#{i + 1}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleMutation.mutate(slide.id)}
                  disabled={toggleMutation.isPending}
                  title={slide.isActive ? 'Deactivate' : 'Activate'}
                  className={`p-1.5 rounded-lg transition-colors ${slide.isActive ? 'hover:bg-yellow-50 text-green-600 hover:text-yellow-600' : 'hover:bg-green-50 text-gray-400 hover:text-green-600'}`}
                >
                  {slide.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => setModal(slide)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this slide?')) deleteMutation.mutate(slide.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'create' && (
        <SlideModal onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal && modal !== 'create' && (
        <SlideModal slide={modal as CarouselSlide} onClose={() => setModal(null)} onSaved={refresh} />
      )}
    </div>
  );
}
