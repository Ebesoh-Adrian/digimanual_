'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  FlaskConical,
  Users,
  UserCheck,
  CreditCard,
  Tag,
  Headphones,
  Users2,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/lib/stores/sidebarStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { useState, useEffect } from 'react';
import api from '@/lib/api/client';
import type { ApiResponse, DashboardData } from '@/lib/types/api';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  section?: string;
}

const buildNavItems = (pendingMentors: number, openTickets: number): NavItem[] => [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard' },
  { label: 'Manuals', icon: <BookOpen size={18} />, path: '/dashboard/content/manuals', section: 'Content' },
  { label: 'Practicals', icon: <FlaskConical size={18} />, path: '/dashboard/content/practicals', section: 'Content' },
  { label: 'Past Papers', icon: <FileText size={18} />, path: '/dashboard/content/past-questions', section: 'Content' },
  { label: 'Users', icon: <Users size={18} />, path: '/dashboard/students', section: 'People' },
  { label: 'Mentors', icon: <UserCheck size={18} />, path: '/dashboard/mentors', section: 'People', badge: pendingMentors },
  { label: 'Payments', icon: <CreditCard size={18} />, path: '/dashboard/payments', section: 'Revenue' },
  { label: 'Discounts', icon: <Tag size={18} />, path: '/dashboard/discounts', section: 'Engagement' },
  { label: 'Support', icon: <Headphones size={18} />, path: '/dashboard/support', section: 'Engagement', badge: openTickets },
  { label: 'Study Groups', icon: <Users2 size={18} />, path: '/dashboard/groups', section: 'Engagement' },
  { label: 'Notifications', icon: <Bell size={18} />, path: '/dashboard/notifications', section: 'Platform' },
  { label: 'Settings', icon: <Settings size={18} />, path: '/dashboard/settings', section: 'Platform' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setCollapsed, isOpen, closeMobile } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [pendingMentors, setPendingMentors] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await api.get<ApiResponse<DashboardData>>('/admin/dashboard');
        setPendingMentors(res.data.data.stats.pendingMentors);
      } catch {
        // silently fail — badges are non-critical
      }
    }
    fetchBadges();
  }, []);

  const navItems = buildNavItems(pendingMentors, openTickets);

  const handleNavigate = (path: string) => {
    router.push(path);
    closeMobile();
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    logout();
    router.push('/login');
    toast.success('Logged out');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path);
  };

  const sections = Array.from(new Set(navItems.map((i) => i.section).filter(Boolean)));
  const topItems = navItems.filter((i) => !i.section);

  const renderItem = (item: NavItem) => {
    const active = isActive(item.path);
    return (
      <button
        key={item.path}
        onClick={() => handleNavigate(item.path)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
          active
            ? 'bg-[#2d6a4f] text-white'
            : 'text-[#b7e4c7] hover:bg-[#2d6a4f]/60 hover:text-white'
        )}
      >
        <span className="shrink-0">{item.icon}</span>
        {!isCollapsed && <span className="truncate">{item.label}</span>}
        {!isCollapsed && item.badge != null && item.badge > 0 && (
          <span className="ml-auto shrink-0 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
        {isCollapsed && item.badge != null && item.badge > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1b4332]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#2d6a4f] shrink-0">
        {!isCollapsed && (
          <span className="text-white font-bold text-lg">DigiManual</span>
        )}
        <button
          onClick={() => (mounted && window.innerWidth < 768 ? closeMobile() : setCollapsed(!isCollapsed))}
          className="p-1.5 rounded-lg text-[#b7e4c7] hover:bg-[#2d6a4f] transition-colors"
        >
          {mounted && window.innerWidth < 768 ? (
            <X size={18} />
          ) : isCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {topItems.map(renderItem)}

        {sections.map((section) => (
          <div key={section} className="mt-4">
            {!isCollapsed && (
              <p className="px-3 mb-1 text-xs font-semibold text-[#52b788] uppercase tracking-wider">
                {section}
              </p>
            )}
            {isCollapsed && <div className="mx-3 my-2 border-t border-[#2d6a4f]" />}
            <div className="space-y-0.5">
              {navItems.filter((i) => i.section === section).map(renderItem)}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-2 pb-3 pt-2 border-t border-[#2d6a4f] shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-[#2d6a4f] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">
                {user?.displayName?.charAt(0)?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.displayName ?? 'Admin'}</p>
              <p className="text-xs text-[#52b788] truncate">{user?.email ?? ''}</p>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 p-1.5 rounded-lg text-[#b7e4c7] hover:bg-[#2d6a4f] hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center p-2 rounded-lg text-[#b7e4c7] hover:bg-[#2d6a4f] transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 shrink-0',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mounted && (
        <>
          {isOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={closeMobile}
            />
          )}
          <aside
            className={cn(
              'fixed left-0 top-0 h-full w-64 z-50 md:hidden transition-transform duration-300',
              isOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
