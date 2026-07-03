'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, CreditCard, TrendingUp, BookOpen, Clock, HelpCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api/client';
import { formatXAF, formatDate, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, DashboardData, PaymentStats } from '@/lib/types/api';

function StatCard({
  label,
  value,
  icon,
  color,
  alert,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-5 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-[#64748b]">{label}</p>
        <p className={`text-2xl font-bold ${alert ? 'text-red-500' : 'text-[#0f172a]'}`}>{value}</p>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
        <div className="h-6 bg-gray-100 rounded animate-pulse w-16" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const {
    data: dashData,
    isLoading: dashLoading,
    error: dashError,
  } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardData>>('/admin/dashboard');
      return res.data.data;
    },
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'payments', 'stats'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaymentStats>>('/admin/payments/stats');
      return res.data.data;
    },
  });

  if (dashError) {
    toast.error(getErrorMessage(dashError));
  }

  const stats = dashData?.stats;
  const chartData = statsData?.revenueByMonth ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0f172a]">Dashboard Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashLoading ? (
          Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Students" value={(stats?.totalStudents ?? 0).toLocaleString()} icon={<Users size={22} />} color="#3b82f6" />
            <StatCard label="Active Subscriptions" value={(stats?.activeSubscriptions ?? 0).toLocaleString()} icon={<CreditCard size={22} />} color="#22c55e" />
            <StatCard label="Revenue (30 days)" value={formatXAF(stats?.revenue30Days ?? 0)} icon={<TrendingUp size={22} />} color="#f59e0b" />
            <StatCard label="Total Manuals" value={(stats?.totalManuals ?? 0).toLocaleString()} icon={<BookOpen size={22} />} color="#a855f7" />
            <StatCard
              label="Pending Mentors"
              value={stats?.pendingMentors ?? 0}
              icon={<Clock size={22} />}
              color={stats?.pendingMentors ? '#ef4444' : '#f59e0b'}
              alert={!!stats?.pendingMentors}
            />
            <StatCard label="Total Questions" value={(stats?.totalQuestions ?? 0).toLocaleString()} icon={<HelpCircle size={22} />} color="#14b8a6" />
          </>
        )}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
        <h2 className="text-base font-semibold text-[#0f172a] mb-4">Monthly Revenue</h2>
        {statsLoading ? (
          <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatXAF(value), 'Revenue']}
                labelStyle={{ color: '#0f172a' }}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#2d6a4f" strokeWidth={2} dot={false} name="Total Revenue" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-[#64748b] text-sm">No revenue data yet</div>
        )}
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Payments */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
          <h2 className="text-base font-semibold text-[#0f172a] mb-4">Recent Payments</h2>
          {dashLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#64748b] border-b border-[#e2e8f0]">
                    <th className="text-left pb-2 font-medium">Transaction</th>
                    <th className="text-left pb-2 font-medium">Amount</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashData?.recentPayments ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-[#f1f5f9] last:border-0">
                      <td className="py-2.5 text-[#0f172a] font-mono text-xs">{p.transaction_id.slice(0, 12)}…</td>
                      <td className="py-2.5 text-[#0f172a] font-medium">{formatXAF(p.amount)}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium
                          ${p.status === 'completed' ? 'bg-green-100 text-green-700' :
                            p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!dashData?.recentPayments?.length && (
                    <tr><td colSpan={3} className="py-8 text-center text-[#64748b]">No payments yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
          <h2 className="text-base font-semibold text-[#0f172a] mb-4">Recent Registrations</h2>
          {dashLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#64748b] border-b border-[#e2e8f0]">
                    <th className="text-left pb-2 font-medium">Name</th>
                    <th className="text-left pb-2 font-medium">Plan</th>
                    <th className="text-left pb-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashData?.recentUsers ?? []).map((u) => (
                    <tr key={u.id} className="border-b border-[#f1f5f9] last:border-0">
                      <td className="py-2.5 text-[#0f172a] font-medium">{u.display_name}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium
                          ${u.subscription_plan === 'premium' ? 'bg-purple-100 text-purple-700' :
                            u.subscription_plan === 'basic' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'}`}>
                          {u.subscription_plan}
                        </span>
                      </td>
                      <td className="py-2.5 text-[#64748b]">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                  {!dashData?.recentUsers?.length && (
                    <tr><td colSpan={3} className="py-8 text-center text-[#64748b]">No users yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
