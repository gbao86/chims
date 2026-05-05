// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React from 'react';
import { useTheme } from '@/components/ThemeProvider';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  suffix?: string;
  delay?: number;
}

export default function StatCard({ title, value, icon, gradient, suffix, delay = 0 }: StatCardProps) {
  const { isDark } = useTheme();

  return (
    <div
      className="animate-fadeInUp"
      style={{
        animationDelay: `${delay}s`,
        opacity: 0,
        background: isDark
          ? 'rgba(30, 41, 59, 0.8)'
          : 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: '28px 24px',
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.2)'
          : '0 4px 24px rgba(0,0,0,0.06)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = isDark
          ? '0 12px 40px rgba(0,0,0,0.3)'
          : '0 12px 40px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = isDark
          ? '0 4px 24px rgba(0,0,0,0.2)'
          : '0 4px 24px rgba(0,0,0,0.06)';
      }}
    >
      {/* Background gradient accent */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: gradient,
        opacity: 0.15,
        filter: 'blur(20px)',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 500,
            color: isDark ? '#94a3b8' : '#64748b',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {title}
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 800,
            color: isDark ? '#f1f5f9' : '#0f172a',
            lineHeight: 1,
          }}>
            {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
            {suffix && (
              <span style={{ fontSize: 14, fontWeight: 500, color: isDark ? '#94a3b8' : '#64748b', marginLeft: 4 }}>
                {suffix}
              </span>
            )}
          </div>
        </div>

        <div style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          color: '#fff',
          boxShadow: `0 8px 24px ${gradient.includes('#ef4444') ? 'rgba(239,68,68,0.3)' : gradient.includes('#22c55e') ? 'rgba(34,197,94,0.3)' : gradient.includes('#f59e0b') ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}`,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

