'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  const isAuthorized = !!accessToken && user?.role === 'admin';

  useEffect(() => {
    if (!isAuthorized) {
      router.replace('/login');
    }
  }, [isAuthorized, router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafb]">
        <div className="w-8 h-8 border-2 border-[#2d6a4f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
