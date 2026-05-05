// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/components/ThemeProvider';

interface TicketChartProps {
  data: { date: string; count: number }[];
}

export default function TicketChart({ data }: TicketChartProps) {
  const { isDark } = useTheme();

  const chartData = data.length > 0
    ? data
    : Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return {
          date: d.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 5) + 1,
        };
      });

  return (
    <div
      className="animate-fadeInUp animate-delay-400"
      style={{
        opacity: 0,
        background: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: '24px',
        border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 20,
        color: isDark ? '#f1f5f9' : '#0f172a',
      }}>
        📊 Phiếu bảo trì theo thời gian
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? 'rgba(51,65,85,0.4)' : 'rgba(226,232,240,0.8)'}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 12 }}
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1e293b' : '#fff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              color: isDark ? '#f1f5f9' : '#0f172a',
            }}
            labelFormatter={(label) => {
              const d = new Date(label);
              return d.toLocaleDateString('vi-VN');
            }}
            formatter={(value: any) => [`${value} phiếu`, 'Số lượng']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCount)"
            dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#6366f1' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

