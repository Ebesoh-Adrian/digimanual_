'use client';

import { Menu as MenuIcon } from 'lucide-react';
import { useSidebarStore } from '@/lib/stores/sidebarStore';

export function Topbar() {
  const { toggle } = useSidebarStore();

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 bg-white border-b border-[#e2e8f0] md:hidden">
      <button
        onClick={toggle}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-[#64748b]"
      >
        <MenuIcon size={20} />
      </button>
      <span className="font-bold text-[#2d6a4f] text-lg">DigiManual</span>
    </header>
  );
}
