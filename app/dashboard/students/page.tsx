'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserCog, ShieldCheck, Gift, Users, GraduationCap, BookUser } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, UserProfile } from '@/lib/types/api';

const PLAN_BADGE: Record<string, string> = {
  premium: 'bg-purple-100 text-purple-700',
  basic: 'bg-blue-100 text-blue-700',
  free: 'bg-gray-100 text-gray-600',
};

const ROLE_BADGE: Record<string, string> = {
  student: 'bg-green-100 text-green-700',
  mentor: 'bg-orange-100 text-orange-700',
  admin: 'bg-red-100 text-red-700',
};

const ROLE_TABS = [
  { value: '', label: 'All Users', icon: <Users size={14} /> },
  { value: 'student', label: 'Students', icon: <GraduationCap size={14} /> },
  { value: 'mentor', label: 'Mentors', icon: <BookUser size={14} /> },
];

function extractUsers(raw: unknown): UserProfile[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  // Handle all possible response shapes from the API
  const list = r['users'] ?? r['profiles'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as UserProfile[];
  if (Array.isArray(raw)) return raw as UserProfile[];
  return [];
}

function extractPagination(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const p = r['pagination'] as Record<string, number> | undefined;
  if (p) return p;
  // flat shape: { total, page, pages, limit }
  if ('total' in r) return r as unknown as { total: number; page: number; pages: number; limit: number };
  return null;
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [grantModal, setGrantModal] = useState(false);
  const [grantPlan, setGrantPlan] = useState<'basic' | 'premium'>('basic');
  const [grantDays, setGrantDays] = useState(30);

  const { data: raw, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', { search, role, plan, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (plan) params.set('plan', plan);
      const res = await api.get<ApiResponse<unknown>>(`/admin/users?${params}`);
      return res.data.data;
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      await api.patch(`/admin/users/${userId}/activate`, { isActive });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User updated'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('Role updated'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await api.post(`/admin/users/${selected.id}/grant-subscription`, { plan: grantPlan, days: grantDays });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Subscription granted');
      setGrantModal(false);
      setSelected(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const users = extractUsers(raw);
  const pagination = extractPagination(raw);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Users</h1>
          {pagination && (
            <p className="text-sm text-[#64748b] mt-0.5">{pagination.total ?? users.length} total users</p>
          )}
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-1 p-1 bg-[#f1f5f9] rounded-xl w-fit">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setRole(tab.value); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              role === tab.value
                ? 'bg-white text-[#0f172a] shadow-sm'
                : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Plan Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white"
          value={plan}
          onChange={(e) => { setPlan(e.target.value); setPage(1); }}
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load users: {getErrorMessage(error)}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafb]">
                {['User', 'Role', 'Plan', 'Level / School', 'Active', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Users size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-[#64748b] text-sm">
                      {search ? `No users matching "${search}"` : `No ${role || 'users'} found`}
                    </p>
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafb] transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-[#0f172a]">{u.display_name || u.full_name || '—'}</p>
                      <p className="text-xs text-[#64748b]">{u.email ?? u.phone_number ?? ''}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE[u.subscription_plan] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.subscription_plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#64748b] text-xs">
                    <div>{u.exam_level ?? '—'}</div>
                    {u.school_name && <div className="text-[#94a3b8] truncate max-w-[120px]">{u.school_name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => activateMutation.mutate({ userId: u.id, isActive: !u.is_active })}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${u.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                      title={u.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${u.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[#64748b] whitespace-nowrap text-xs">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => roleMutation.mutate({ userId: u.id, newRole: u.role === 'student' ? 'mentor' : 'student' })}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[#64748b] hover:text-[#2d6a4f] transition-colors"
                        title={`Switch to ${u.role === 'student' ? 'mentor' : 'student'}`}
                      >
                        <UserCog size={15} />
                      </button>
                      <button
                        onClick={() => { setSelected(u); setGrantModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[#64748b] hover:text-[#2d6a4f] transition-colors"
                        title="Grant subscription"
                      >
                        <Gift size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && Number(pagination.pages) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0]">
            <p className="text-xs text-[#64748b]">
              {pagination.total} users — page {page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="h-8 px-3 rounded-lg border border-[#e2e8f0] text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage((p) => Math.min(Number(pagination.pages), p + 1))} disabled={page === Number(pagination.pages)}
                className="h-8 px-3 rounded-lg border border-[#e2e8f0] text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Grant Subscription Modal */}
      {grantModal && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#2d6a4f]" />
              <h3 className="font-semibold text-[#0f172a]">Grant Subscription</h3>
            </div>
            <div className="text-sm text-[#64748b]">
              <p>For: <strong className="text-[#0f172a]">{selected.display_name}</strong></p>
              {selected.email && <p className="text-xs mt-0.5">{selected.email}</p>}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1">Plan</label>
                <select value={grantPlan} onChange={(e) => setGrantPlan(e.target.value as 'basic' | 'premium')}
                  className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white">
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1">Duration (days)</label>
                <input type="number" min={1} value={grantDays} onChange={(e) => setGrantDays(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setGrantModal(false); setSelected(null); }}
                className="flex-1 h-10 rounded-lg border border-[#e2e8f0] text-sm text-[#64748b] hover:bg-gray-50">Cancel</button>
              <button onClick={() => grantMutation.mutate()} disabled={grantMutation.isPending}
                className="flex-1 h-10 rounded-lg bg-[#2d6a4f] text-white text-sm font-medium hover:bg-[#1b4332] disabled:opacity-60">
                {grantMutation.isPending ? 'Granting…' : 'Grant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
