'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink,
  ZoomIn, ChevronRight, User, Mail, Phone, School, Calendar,
} from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, MentorDetail, VerificationStep } from '@/lib/types/api';

/* ─── helpers ──────────────────────────────────────────── */
function extractDetail(raw: unknown): MentorDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r['mentor'] && r['steps']) return raw as unknown as MentorDetail;
  if (r['data'] && typeof r['data'] === 'object') {
    const d = r['data'] as Record<string, unknown>;
    if (d['mentor'] && d['steps']) return d as unknown as MentorDetail;
  }
  return null;
}

const STEP_STATUS_COLOR: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-500',
  submitted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  changes_requested: 'bg-orange-100 text-orange-700',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
  changes_requested: 'bg-orange-100 text-orange-700',
};

/* ─── section helpers ───────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="py-2 border-b border-[#f1f5f9] last:border-0">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  if (!data || (typeof data === 'object' && Object.keys(data as object).length === 0)) return null;
  if (typeof data !== 'object') return <p className="text-sm text-slate-800">{String(data)}</p>;
  return (
    <div className="space-y-1">
      {Object.entries(data as Record<string, unknown>).map(([k, v]) => (
        <div key={k} className="flex gap-2 py-1 border-b border-[#f1f5f9] last:border-0">
          <span className="text-xs text-slate-400 min-w-[140px] shrink-0 capitalize">{k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</span>
          <span className="text-sm text-slate-800 break-words">
            {Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v ?? '')}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── tabs ─────────────────────────────────────────────── */
const TABS = ['Overview', 'Contact', 'Academic', 'Teaching', 'Experience', 'Tutoring & Digital', 'Payment', 'Documents', 'Verification', 'History'] as const;
type Tab = typeof TABS[number];

/* ─── decision modals ────────────────────────────────────── */
function ApproveModal({ mentorId, blocking, onClose, onDone }: {
  mentorId: string; blocking: string[]; onClose: () => void; onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [force, setForce] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (force && note.trim().length < 10) { toast.error('Note must be at least 10 characters when force-approving'); return; }
    setSaving(true);
    try {
      await api.post(`/admin/mentors/${mentorId}/approve`, force ? { force: true, note } : { note: note || undefined });
      toast.success('Mentor approved');
      onDone();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { code?: string; blocking?: string[] } }; message?: string };
      if (err?.response?.data?.code === 'VERIFICATION_INCOMPLETE' && !force) {
        toast.error('Some required steps are not verified. Use force-approve with a note to override.');
        setForce(true);
      } else {
        toast.error(getErrorMessage(e));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">Approve Mentor</h3>
        {blocking.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">Blocking steps not verified:</p>
            <ul className="text-xs text-red-600 list-disc list-inside">
              {blocking.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
        )}
        {force && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
            Force-approving. Provide a note (≥10 chars) explaining the override.
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Note {force ? '*(required)' : '(optional)'}</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className={`h-10 px-5 rounded-lg text-white text-sm font-medium disabled:opacity-60 ${force ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>
            {saving ? 'Approving…' : force ? 'Force Approve' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReasonModal({ title, placeholder, required = true, onClose, onConfirm }: {
  title: string; placeholder: string; required?: boolean;
  onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (required && !text.trim()) { toast.error('This field is required'); return; }
    setSaving(true);
    try { await onConfirm(text); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500" />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="h-10 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-60">
            {saving ? 'Sending…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestChangesModal({ mentorId, steps, onClose, onDone }: {
  mentorId: string; steps: VerificationStep[]; onClose: () => void; onDone: () => void;
}) {
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) =>
    setSelected((s) => s.includes(key) ? s.filter((x) => x !== key) : [...s, key]);

  const submit = async () => {
    if (!message.trim()) { toast.error('Message is required'); return; }
    setSaving(true);
    try {
      await api.post(`/admin/mentors/${mentorId}/request-changes`, {
        message,
        ...(selected.length ? { sections: selected } : {}),
      });
      toast.success('Changes requested');
      onDone();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const manual = steps.filter((s) => !s.automatic);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">Request Changes</h3>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Message to mentor *</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
            placeholder="Explain what needs to be fixed…"
            className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Flag specific steps (optional)</p>
          <div className="flex flex-wrap gap-2">
            {manual.map((s) => (
              <button key={s.key} onClick={() => toggle(s.key)}
                className={`px-3 h-7 rounded-full text-xs font-medium border transition-colors ${selected.includes(s.key) ? 'bg-purple-600 text-white border-purple-600' : 'border-[#e2e8f0] text-slate-600 hover:bg-gray-50'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-sm text-gray-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="h-10 px-5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium disabled:opacity-60">
            {saving ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── document viewer ────────────────────────────────────── */
function DocViewer({ url, previewUrl, onClose }: { url: string; previewUrl?: string; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl">×</button>
        <div className={`relative overflow-hidden rounded-xl bg-black ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          onClick={() => setZoomed((z) => !z)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl || url}
            alt="Document"
            className={`w-full transition-transform duration-200 ${zoomed ? 'scale-150 origin-center' : 'scale-100'}`}
          />
          <button className="absolute top-2 right-2 bg-black/40 text-white rounded-lg p-1.5">
            <ZoomIn size={16} />
          </button>
        </div>
        <div className="mt-3 flex gap-3 justify-center">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors">
            <ExternalLink size={14} /> Open full file
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── verification checklist ────────────────────────────── */
function VerificationTab({ mentorId, steps, onRefresh }: {
  mentorId: string; steps: VerificationStep[]; onRefresh: () => void;
}) {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const setStep = async (stepKey: string, status: VerificationStep['status'], stepNote?: string) => {
    if ((status === 'rejected' || status === 'changes_requested') && !stepNote?.trim()) {
      toast.error('A note is required when rejecting or requesting changes');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/admin/mentors/${mentorId}/steps/${stepKey}`, {
        status,
        ...(stepNote?.trim() ? { note: stepNote } : {}),
      });
      toast.success('Step updated');
      setActiveStep(null);
      setNote('');
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.key} className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-slate-900 text-sm">{step.label}</p>
                {step.required && (
                  <span className="text-xs text-slate-400">(required)</span>
                )}
                {step.automatic && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Auto</span>
                )}
              </div>
              <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STEP_STATUS_COLOR[step.status]}`}>
                {step.status.replace(/_/g, ' ')}
              </span>
              {step.note && (
                <p className="text-xs text-slate-500 mt-1 italic">"{step.note}"</p>
              )}
              {step.reviewedBy && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Reviewed by {step.reviewedBy}{step.reviewedAt ? ` · ${formatDate(step.reviewedAt)}` : ''}
                </p>
              )}
            </div>
            {!step.automatic && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setStep(step.key, 'verified')} disabled={saving || step.status === 'verified'}
                  title="Verify"
                  className="h-8 px-2.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40 transition-colors">
                  <CheckCircle size={13} className="inline mr-1" />Verify
                </button>
                <button
                  onClick={() => setActiveStep(activeStep === step.key + '_reject' ? null : step.key + '_reject')}
                  disabled={saving}
                  title="Reject"
                  className="h-8 px-2.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors">
                  <XCircle size={13} className="inline mr-1" />Reject
                </button>
                <button
                  onClick={() => setActiveStep(activeStep === step.key + '_changes' ? null : step.key + '_changes')}
                  disabled={saving}
                  title="Request changes"
                  className="h-8 px-2.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-40 transition-colors">
                  <Clock size={13} className="inline mr-1" />Changes
                </button>
              </div>
            )}
          </div>

          {(activeStep === step.key + '_reject' || activeStep === step.key + '_changes') && (
            <div className="mt-3 pt-3 border-t border-[#f1f5f9] space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={activeStep.endsWith('_reject') ? 'Reason for rejection (required)…' : 'What needs to change (required)…'}
                className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setActiveStep(null); setNote(''); }}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={() => setStep(step.key, activeStep.endsWith('_reject') ? 'rejected' : 'changes_requested', note)}
                  disabled={saving || !note.trim()}
                  className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-medium disabled:opacity-60 hover:bg-red-700">
                  {saving ? '…' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────── */
export default function MentorDetailPage() {
  const { mentorId } = useParams<{ mentorId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('Overview');
  const [viewDoc, setViewDoc] = useState<{ url: string; previewUrl?: string } | null>(null);
  const [decisionModal, setDecisionModal] = useState<'approve' | 'reject' | 'suspend' | 'changes' | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'mentor', mentorId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>(`/admin/mentors/${mentorId}`);
      return res.data.data ?? res.data;
    },
    enabled: !!mentorId,
  });

  const detail = extractDetail(raw);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'mentor', mentorId] });

  const suspendMutation = useMutation({
    mutationFn: (reason: string) =>
      api.post(`/admin/mentors/${mentorId}/suspend`, { reason: reason || undefined }),
    onSuccess: () => { refresh(); toast.success('Mentor suspended'); setDecisionModal(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      api.post(`/admin/mentors/${mentorId}/reject`, { reason }),
    onSuccess: () => { refresh(); toast.success('Application rejected'); setDecisionModal(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-32 bg-gray-100 rounded" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-96 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Mentor not found</p>
        <button onClick={() => router.back()} className="mt-2 text-sm text-purple-600 hover:underline">Go back</button>
      </div>
    );
  }

  const { mentor, account, completeness, steps, blocking, overdue, events } = detail;
  const m = mentor as Record<string, unknown>;
  const verificationStatus = String(m['verification_status'] ?? 'pending');
  const displayName = (account.email?.split('@')[0] ?? '') || String((m['users'] as Record<string, unknown>)?.['display_name'] ?? 'Mentor');
  const profilePic = String((m['users'] as Record<string, unknown>)?.['profile_picture'] ?? '');
  const title = String(m['title'] ?? '');

  const renderTab = () => {
    switch (tab) {
      case 'Overview':
        return (
          <div className="space-y-4">
            {blocking.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
                  <AlertTriangle size={16} /> Blocking steps ({blocking.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {blocking.map((b) => (
                    <span key={b} className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">{b}</span>
                  ))}
                </div>
              </div>
            )}
            <Section title="Profile">
              <Field label="Title" value={title} />
              <Field label="Bio" value={String(m['bio'] ?? '')} />
              <Field label="Statement" value={String(m['statement'] ?? (m['about'] ?? ''))} />
              <Field label="Hourly Rate" value={m['hourly_rate_xaf'] ? `${m['hourly_rate_xaf']} XAF` : undefined} />
              <Field label="Subjects" value={(m['subjects'] as string[] | undefined)?.join(', ')} />
            </Section>
          </div>
        );
      case 'Contact':
        return (
          <Section title="Contact & Location">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 py-2 border-b border-[#f1f5f9]">
                <Mail size={15} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-sm text-slate-800">{account.email}</p>
                </div>
              </div>
              {account.phone && (
                <div className="flex items-center gap-3 py-2 border-b border-[#f1f5f9]">
                  <Phone size={15} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-sm text-slate-800">{account.phone}</p>
                  </div>
                </div>
              )}
              {account.school && (
                <div className="flex items-center gap-3 py-2 border-b border-[#f1f5f9]">
                  <School size={15} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">School</p>
                    <p className="text-sm text-slate-800">{account.school}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 py-2">
                <Calendar size={15} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Joined</p>
                  <p className="text-sm text-slate-800">{formatDate(account.joinedAt)}</p>
                </div>
              </div>
            </div>
            {!!m['contact'] && (
              <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Contact Details</p>
                <JsonBlock data={m['contact']} />
              </div>
            )}
            {!!m['location'] && (
              <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Location</p>
                <JsonBlock data={m['location']} />
              </div>
            )}
          </Section>
        );
      case 'Academic': {
        const academic = m['academic'] as Record<string, unknown> | undefined;
        const quals = academic?.['qualifications'];
        const docs = (m['verification'] as Record<string, unknown>)?.['documents'] as Array<Record<string, unknown>> | undefined;
        return (
          <Section title="Academic Qualifications">
            {Array.isArray(quals) ? (
              <div className="space-y-4">
                {(quals as Record<string, unknown>[]).map((q, i) => (
                  <div key={i} className="border-b border-[#f1f5f9] pb-4 last:border-0 last:pb-0">
                    <JsonBlock data={q} />
                    {docs && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {docs.filter((d) => String(d['category'] ?? '').toLowerCase().includes('certificate') || String(d['label'] ?? '').toLowerCase().includes(String(q['institution'] ?? ''))).map((d, j) => (
                          <button key={j} onClick={() => setViewDoc({ url: String(d['fileUrl'] ?? ''), previewUrl: String(d['previewUrl'] ?? '') })}
                            className="text-xs text-purple-600 underline hover:text-purple-800">
                            View cert {j + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <JsonBlock data={academic} />
            )}
          </Section>
        );
      }
      case 'Teaching':
        return (
          <div className="space-y-4">
            <Section title="Teaching Profile">
              <JsonBlock data={m['teaching']} />
            </Section>
            <Section title="Expertise">
              <JsonBlock data={m['expertise']} />
            </Section>
            {(m['mediaLinks'] as unknown[])?.length && (
              <Section title="Media Links">
                <div className="space-y-2">
                  {(m['mediaLinks'] as string[]).map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-purple-600 hover:underline">
                      <ExternalLink size={13} /> {link}
                    </a>
                  ))}
                </div>
              </Section>
            )}
          </div>
        );
      case 'Experience': {
        const exp = m['experience'] as Record<string, unknown> | undefined;
        const refs = (m['verification'] as Record<string, unknown>)?.['references'];
        return (
          <div className="space-y-4">
            <Section title="Experience">
              <JsonBlock data={exp} />
            </Section>
            {!!refs && (
              <Section title="References">
                <JsonBlock data={refs} />
              </Section>
            )}
          </div>
        );
      }
      case 'Tutoring & Digital':
        return (
          <div className="space-y-4">
            <Section title="Tutoring Methods"><JsonBlock data={m['tutoring_methods']} /></Section>
            <Section title="Digital Setup"><JsonBlock data={m['digital']} /></Section>
            <Section title="Availability"><JsonBlock data={m['availability']} /></Section>
          </div>
        );
      case 'Payment':
        return (
          <div className="space-y-4">
            <Section title="Payment Terms">
              <Field label="Hourly Rate" value={m['hourly_rate_xaf'] ? `${m['hourly_rate_xaf']} XAF / hr` : undefined} />
              <JsonBlock data={m['payment_terms']} />
            </Section>
            <Section title="Payout Account">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mb-3">
                Compare the account name below with the ID document in the Documents tab.
              </div>
              <JsonBlock data={m['payout']} />
            </Section>
          </div>
        );
      case 'Documents': {
        const docs = (m['verification'] as Record<string, unknown>)?.['documents'] as Array<Record<string, unknown>> | undefined;
        return (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              Every time you open this tab, the document view is logged for audit purposes.
            </div>
            {!docs || docs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No documents uploaded</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {docs.map((doc, i) => (
                  <button key={i} onClick={() => setViewDoc({ url: String(doc['fileUrl'] ?? ''), previewUrl: String(doc['previewUrl'] ?? '') })}
                    className="group rounded-xl border border-[#e2e8f0] overflow-hidden bg-white hover:border-purple-300 transition-colors text-left">
                    <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                      {doc['previewUrl'] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={String(doc['previewUrl'])} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">No preview</div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-xs font-medium text-slate-700 truncate">{String(doc['label'] ?? `Document ${i + 1}`)}</p>
                      <p className="text-xs text-slate-400 capitalize">{String(doc['category'] ?? '')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }
      case 'Verification':
        return <VerificationTab mentorId={mentorId} steps={steps} onRefresh={refresh} />;
      case 'History':
        return (
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No history yet</p>
            ) : events.map((ev) => (
              <div key={ev.id} className="bg-white rounded-xl border border-[#e2e8f0] px-4 py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-medium">{ev.action.replace(/_/g, ' ')}</p>
                  {ev.note && <p className="text-xs text-slate-500 mt-0.5 italic">"{ev.note}"</p>}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ev.performedBy} · {formatDate(ev.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <button onClick={() => router.push('/dashboard/mentors')} className="hover:text-purple-600 transition-colors">Mentors</button>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium truncate">{displayName}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shrink-0 overflow-hidden">
            {profilePic
              ? <img src={profilePic} alt="" className="w-full h-full object-cover" />
              : <User size={28} className="text-white" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{displayName}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLOR[verificationStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                {verificationStatus.replace(/_/g, ' ')}
              </span>
              {overdue && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  Overdue
                </span>
              )}
            </div>
            {title && <p className="text-sm text-slate-500 mt-0.5">{title}</p>}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 max-w-[200px] bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${completeness}%` }} />
              </div>
              <span className="text-xs text-slate-500 shrink-0">{completeness}% complete</span>
            </div>
          </div>

          {/* Decision bar */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {(verificationStatus === 'pending' || verificationStatus === 'changes_requested' || verificationStatus === 'rejected') && (
              <button onClick={() => setDecisionModal('approve')}
                className="h-9 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
                Approve
              </button>
            )}
            {(verificationStatus === 'pending' || verificationStatus === 'changes_requested') && (
              <button onClick={() => setDecisionModal('changes')}
                className="h-9 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors">
                Request Changes
              </button>
            )}
            {verificationStatus !== 'rejected' && verificationStatus !== 'suspended' && (
              <button onClick={() => setDecisionModal('reject')}
                className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
                Reject
              </button>
            )}
            {verificationStatus === 'approved' && (
              <button onClick={() => setDecisionModal('suspend')}
                className="h-9 px-4 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium transition-colors">
                Suspend
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-0.5 bg-[#f8fafc] rounded-lg p-1 border border-[#e2e8f0] w-fit min-w-full">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>{renderTab()}</div>

      {/* Modals */}
      {decisionModal === 'approve' && (
        <ApproveModal mentorId={mentorId} blocking={blocking}
          onClose={() => setDecisionModal(null)} onDone={refresh} />
      )}
      {decisionModal === 'reject' && (
        <ReasonModal title="Reject Application" placeholder="Reason (shown to mentor)…"
          onClose={() => setDecisionModal(null)}
          onConfirm={async (reason) => { await rejectMutation.mutateAsync(reason); }} />
      )}
      {decisionModal === 'suspend' && (
        <ReasonModal title="Suspend Mentor" placeholder="Reason (optional)…" required={false}
          onClose={() => setDecisionModal(null)}
          onConfirm={async (reason) => { await suspendMutation.mutateAsync(reason); }} />
      )}
      {decisionModal === 'changes' && (
        <RequestChangesModal mentorId={mentorId} steps={steps}
          onClose={() => setDecisionModal(null)} onDone={refresh} />
      )}
      {viewDoc && (
        <DocViewer url={viewDoc.url} previewUrl={viewDoc.previewUrl} onClose={() => setViewDoc(null)} />
      )}
    </div>
  );
}
