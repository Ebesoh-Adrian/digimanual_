'use client';

import { useState } from 'react';
import { Bell, Send, Users, GraduationCap, UserCheck } from 'lucide-react';
import api from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

const AUDIENCES = [
  { value: 'all', label: 'All Users', icon: <Users size={16} />, desc: 'Every registered user on the platform' },
  { value: 'students', label: 'Students Only', icon: <GraduationCap size={16} />, desc: 'All student accounts' },
  { value: 'mentors', label: 'Mentors Only', icon: <UserCheck size={16} />, desc: 'Approved mentor accounts' },
];

export default function NotificationsPage() {
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; title: string } | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const send = async () => {
    if (!form.title || !form.body) { toast.error('Title and message are required'); return; }
    setLoading(true);
    try {
      const res = await api.post<{ data: { sent: number } }>('/admin/notifications/broadcast', form);
      const sent = res.data?.data?.sent ?? 0;
      setLastResult({ sent, title: form.title });
      toast.success(`Broadcast sent to ${sent} users`);
      setForm((p) => ({ ...p, title: '', body: '' }));
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const selectedAudience = AUDIENCES.find((a) => a.value === form.audience);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500 mt-0.5">Broadcast push notifications to platform users</p>
      </div>

      {lastResult && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <Bell size={16} className="text-green-600 shrink-0" />
          <span>"<strong>{lastResult.title}</strong>" sent to <strong>{lastResult.sent} users</strong> successfully.</span>
          <button onClick={() => setLastResult(null)} className="ml-auto text-green-500 hover:text-green-700 text-lg leading-none">×</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 space-y-5">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Bell size={16} className="text-purple-600" /> New Broadcast
        </h2>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Target Audience</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AUDIENCES.map((a) => (
              <button key={a.value} onClick={() => set('audience', a.value)}
                className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${form.audience === a.value ? 'border-purple-500 bg-purple-50' : 'border-[#e2e8f0] hover:bg-gray-50'}`}>
                <span className={`flex items-center gap-1.5 text-sm font-medium ${form.audience === a.value ? 'text-purple-700' : 'text-slate-700'}`}>
                  {a.icon} {a.label}
                </span>
                <span className="text-xs text-slate-400">{a.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notification Title *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. New GCE Chemistry Manual Available" maxLength={100}
            className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <p className="text-xs text-slate-400 mt-1">{form.title.length}/100</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Message *</label>
          <textarea value={form.body} onChange={(e) => set('body', e.target.value)}
            rows={4} placeholder="Type the notification body…" maxLength={500}
            className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          <p className="text-xs text-slate-400 mt-1">{form.body.length}/500</p>
        </div>

        {(form.title || form.body) && (
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Preview</p>
            <div className="bg-white rounded-lg border border-[#e2e8f0] p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
                <Bell size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{form.title || 'Notification Title'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{form.body || 'Message body…'}</p>
              </div>
            </div>
          </div>
        )}

        <button onClick={send} disabled={loading || !form.title || !form.body}
          className="flex items-center gap-2 h-11 px-6 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60 transition-colors">
          <Send size={16} />
          {loading ? 'Sending…' : `Send to ${selectedAudience?.label ?? 'All Users'}`}
        </button>
      </div>

      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase">Tips</p>
        <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
          <li>Keep titles under 60 characters for best mobile display</li>
          <li>Use for new content releases, exam reminders, or leaderboard results</li>
          <li>Avoid more than 2–3 broadcasts per week to prevent unsubscribes</li>
        </ul>
      </div>
    </div>
  );
}
