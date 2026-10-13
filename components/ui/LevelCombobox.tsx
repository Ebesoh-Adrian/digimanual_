'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import type { ApiResponse, Level } from '@/lib/types/api';

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

function extractLevels(raw: unknown): Level[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  const list = r['levels'] ?? r['data'] ?? r['items'];
  if (Array.isArray(list)) return list as Level[];
  if (Array.isArray(raw)) return raw as Level[];
  return [];
}

export function LevelCombobox({ value, onChange, className = '' }: Props) {
  const [custom, setCustom] = useState(false);

  const { data: raw } = useQuery({
    queryKey: ['public', 'levels'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<unknown>>('/public/levels');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const levels = extractLevels(raw);

  const base = `h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${className}`;

  if (custom) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a level code (e.g. CAP)"
          className={`flex-1 ${base}`}
        />
        <button
          type="button"
          onClick={() => { setCustom(false); onChange(''); }}
          className="h-10 px-3 rounded-lg border border-[#e2e8f0] text-sm text-slate-500 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === '__custom__') { setCustom(true); onChange(''); }
        else onChange(e.target.value);
      }}
      className={`w-full ${base}`}
    >
      <option value="">Select level…</option>
      {levels.length > 0
        ? levels.filter((l) => l.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))
        : (
          <>
            <option value="OL">O-Level</option>
            <option value="AL">A-Level</option>
            <option value="Probatoire">Probatoire</option>
            <option value="BAC">BAC</option>
            <option value="Technician">Technician</option>
          </>
        )}
      <option value="__custom__">Other / type a level…</option>
    </select>
  );
}
