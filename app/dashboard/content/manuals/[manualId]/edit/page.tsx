'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, Manual } from '@/lib/types/api';

export default function EditManualPage() {
  const { manualId } = useParams<{ manualId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: manual, isLoading } = useQuery({
    queryKey: ['admin', 'manual', manualId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ manual: Manual }>>(`/admin/manuals/${manualId}`);
      return res.data.data.manual;
    },
  });

  const [form, setForm] = useState({ title: '', subject: '', level: '', language: '', description: '', is_premium: false });

  useEffect(() => {
    if (manual) {
      setForm({
        title: manual.title,
        subject: manual.subject,
        level: manual.level,
        language: manual.language,
        description: manual.description ?? '',
        is_premium: manual.is_premium,
      });
    }
  }, [manual]);

  const mutation = useMutation({
    mutationFn: async () => api.patch(`/admin/manuals/${manualId}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'manual', manualId] });
      qc.invalidateQueries({ queryKey: ['admin', 'manuals'] });
      toast.success('Manual updated');
      router.push(`/dashboard/content/manuals/${manualId}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <div className="p-8 text-center text-[#64748b]">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-[#64748b]"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-bold text-[#0f172a]">Edit Manual</h1>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#0f172a] mb-1">Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1">Subject</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1">Level</label>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]">
              <option value="OL">O-Level</option>
              <option value="AL">A-Level</option>
              <option value="Probatoire">Probatoire</option>
              <option value="BAC">BAC</option>
              <option value="Technician">Technician</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0f172a] mb-1">Language</label>
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]">
            <option value="English">English</option>
            <option value="French">French</option>
            <option value="Bilingual">Bilingual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0f172a] mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4}
            className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] resize-none" />
        </div>
        <label className="flex items-center gap-2 text-sm text-[#0f172a] cursor-pointer">
          <input type="checkbox" checked={form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })}
            className="w-4 h-4 rounded accent-[#2d6a4f]" />
          Premium manual
        </label>
        <div className="flex gap-3 pt-2">
          <button onClick={() => router.back()} className="h-10 px-4 rounded-lg border border-[#e2e8f0] text-sm text-[#64748b] hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="h-10 px-6 rounded-lg bg-[#2d6a4f] text-white text-sm font-medium hover:bg-[#1b4332] disabled:opacity-60">
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
