// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import { useEffect, useState } from 'react';
import { Typography, Spin, Row, Col, Progress, Tag, Avatar } from 'antd';
import {
  AppstoreOutlined, WarningOutlined, ToolOutlined, DollarOutlined,
  ShoppingOutlined, TeamOutlined, SafetyCertificateOutlined, BarcodeOutlined,
  ShopOutlined, InboxOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '@/lib/api';
import { DashboardStats } from '@/types';
import StatCard from '@/components/dashboard/StatCard';
import { useTheme } from '@/components/ThemeProvider';

const { Title, Text } = Typography;

// ── Color Palettes ──
const CATEGORY_COLORS: Record<string, string> = {
  CPU: '#6366f1', GPU: '#ec4899', RAM: '#3b82f6', Storage: '#f59e0b',
  Mainboard: '#22c55e', PSU: '#f97316', Cooling: '#0ea5e9', Other: '#64748b',
  Case: '#14b8a6', Monitor: '#8b5cf6', Keyboard: '#a855f7', Mouse: '#ef4444', Headset: '#06b6d4',
};
const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7'];

const TICKET_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý', diagnosing: 'Đang kiểm tra',
  waiting_parts: 'Chờ linh kiện', completed: 'Hoàn thành',
};
const WARRANTY_STATUS_LABELS: Record<string, string> = {
  active: 'Đang BH', claimed: 'Đã yêu cầu', expired: 'Hết hạn',
};
const SERIAL_STATUS_LABELS: Record<string, string> = {
  available: 'Có sẵn', sold: 'Đã bán', rma: 'Đang BH', reserved: 'Đã giữ', in_build: 'Trong Build',
};

const fmtVND = (v: number) => `${v.toLocaleString('vi-VN')} ₫`;
const fmtM = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v.toLocaleString('vi-VN');

// ── Reusable Chart Card ──
function ChartCard({ title, children, isDark, extra }: { title: string; children: React.ReactNode; isDark: boolean; extra?: React.ReactNode }) {
  return (
    <div style={{
      background: isDark ? 'rgba(30,41,59,0.85)' : '#fff',
      borderRadius: 20,
      padding: '24px',
      border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
      height: '100%',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>{title}</span>
        {extra}
      </div>
      {children}
    </div>
  );
}

// ── Custom Tooltip ──
function CustomTooltip({ active, payload, label, isDark, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: isDark ? '#1e293b' : '#fff',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 12, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: isDark ? '#94a3b8' : '#64748b' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || (isDark ? '#f1f5f9' : '#0f172a'), fontWeight: 600 }}>
          {formatter ? formatter(p.name, p.value) : `${p.name}: ${p.value}`}
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    api.get<DashboardStats>('/api/dashboard/stats')
      .then(r => setStats(r.data))
      .catch((err) => {
        console.error(err);
        setError('Không thể tải dữ liệu Dashboard. Vui lòng kiểm tra kết nối Backend.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" /></div>;
  }

  if (error || !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: 16 }}>
        <WarningOutlined style={{ fontSize: 48, color: '#f59e0b' }} />
        <Title level={4} style={{ margin: 0, color: isDark ? '#f1f5f9' : '#0f172a' }}>Lỗi tải Dashboard</Title>
        <Text style={{ color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', maxWidth: 400 }}>
          {error || 'Không nhận được dữ liệu từ server. Vui lòng thử lại.'}
        </Text>
      </div>
    );
  }

  const s = stats;
  const stockHealth = s.total_parts > 0 ? Math.round((s.in_stock_count / s.total_parts) * 100) : 0;

  // Prepare monthly revenue chart (fill in empty months)
  const monthlyData = s.monthly_revenue || [];

  // Prepare ticket status pie
  const ticketPieData = (s.ticket_status_dist || []).map(d => ({
    name: TICKET_STATUS_LABELS[d.status] || d.status,
    value: d.count,
  }));

  // Prepare warranty pie
  const warrantyPieData = (s.warranty_status_dist || []).map(d => ({
    name: WARRANTY_STATUS_LABELS[d.status] || d.status,
    value: d.count,
  }));

  // Prepare serial unit pie
  const serialPieData = (s.serial_status_dist || []).map(d => ({
    name: SERIAL_STATUS_LABELS[d.status] || d.status,
    value: d.count,
  }));

  // Category bar data (top 8)
  const catBarData = (s.category_distribution || []).slice(0, 8).map(d => ({
    name: d.category,
    'Số SKU': d.count,
    'Tồn kho': d.total_stock,
  }));

  // Top SKU by value
  const topValueData = (s.top_by_value || []).map(d => ({
    name: d.name.length > 22 ? d.name.slice(0, 22) + '…' : d.name,
    fullName: d.name,
    'Giá trị (₫)': d.stock_value,
    category: d.category,
  }));

  // Top selling
  const topSellingData = (s.top_selling || []).map(d => ({
    name: d.name.length > 22 ? d.name.slice(0, 22) + '…' : d.name,
    fullName: d.name,
    'SL bán': d.total_qty,
    'Doanh thu': d.total_revenue,
  }));

  const axisStyle = { fill: isDark ? '#64748b' : '#94a3b8', fontSize: 11 };
  const gridColor = isDark ? 'rgba(51,65,85,0.4)' : 'rgba(226,232,240,0.8)';
  const tooltipStyle = {
    background: isDark ? '#1e293b' : '#fff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 12,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Dashboard</Title>
        <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 14 }}>
          Tổng quan toàn bộ dữ liệu hệ thống CHIMS
        </Text>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} xl={4}><StatCard title="Tổng SKU" value={s.total_parts} icon={<AppstoreOutlined />} gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" /></Col>
        <Col xs={12} sm={8} xl={4}><StatCard title="Sắp hết hàng" value={s.low_stock_count} icon={<WarningOutlined />} gradient="linear-gradient(135deg,#f59e0b,#f97316)" /></Col>
        <Col xs={12} sm={8} xl={4}><StatCard title="Đang xử lý" value={s.pending_tickets} icon={<ToolOutlined />} gradient="linear-gradient(135deg,#ef4444,#f43f5e)" /></Col>
        <Col xs={12} sm={8} xl={4}><StatCard title="Serial Units" value={s.total_serial_units} icon={<BarcodeOutlined />} gradient="linear-gradient(135deg,#0ea5e9,#3b82f6)" /></Col>
        <Col xs={12} sm={8} xl={4}><StatCard title="Khách hàng" value={s.total_customers} icon={<TeamOutlined />} gradient="linear-gradient(135deg,#22c55e,#10b981)" /></Col>
        <Col xs={12} sm={8} xl={4}><StatCard title="Bảo hành" value={s.active_warranties} icon={<SafetyCertificateOutlined />} gradient="linear-gradient(135deg,#14b8a6,#06b6d4)" /></Col>
      </Row>

      {/* ── Row 2: Revenue KPIs ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}><StatCard title="Doanh thu tháng này" value={s.sales_this_month} icon={<DollarOutlined />} gradient="linear-gradient(135deg,#22c55e,#10b981)" suffix="₫" /></Col>
        <Col xs={24} sm={8}><StatCard title="Nhập hàng tháng này" value={s.purchases_this_month} icon={<ShoppingOutlined />} gradient="linear-gradient(135deg,#a855f7,#ec4899)" suffix="₫" /></Col>
        <Col xs={24} sm={8}><StatCard title="Nhà cung cấp" value={s.total_suppliers} icon={<ShopOutlined />} gradient="linear-gradient(135deg,#f97316,#fbbf24)" /></Col>
      </Row>

      {/* ── Row 3: Stock Health + Monthly Revenue ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={8}>
          <ChartCard title="Sức khỏe kho hàng" isDark={isDark}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: stockHealth > 70 ? '#22c55e' : stockHealth > 40 ? '#f59e0b' : '#ef4444' }}>
                {stockHealth}%
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>SKU còn hàng</Text>
            </div>
            <Progress
              percent={stockHealth}
              strokeColor={stockHealth > 70 ? { from: '#22c55e', to: '#10b981' } : stockHealth > 40 ? { from: '#f59e0b', to: '#f97316' } : { from: '#ef4444', to: '#f43f5e' }}
              railColor={isDark ? 'rgba(51,65,85,0.4)' : '#f1f5f9'}
              showInfo={false}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 20 }}>
              {[
                { label: 'Còn hàng', value: s.in_stock_count, color: '#22c55e' },
                { label: 'Sắp hết', value: s.low_stock_count - s.out_of_stock_count, color: '#f59e0b' },
                { label: 'Hết hàng', value: s.out_of_stock_count, color: '#ef4444' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center', padding: '10px 4px', borderRadius: 10, background: isDark ? 'rgba(51,65,85,0.3)' : '#f8fafc' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </ChartCard>
        </Col>
        <Col xs={24} lg={16}>
          <ChartCard title="Doanh thu theo tháng" isDark={isDark}>
            {monthlyData.length === 0 ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#64748b' : '#94a3b8' }}>
                <InboxOutlined style={{ fontSize: 32, marginRight: 8 }} /> Chưa có dữ liệu doanh thu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyData} barCategoryGap="30%">
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtM} width={55} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name?: string) => [fmtVND(v), name === 'revenue' ? 'Doanh thu' : 'Đơn hàng']} labelFormatter={l => `Tháng ${l}`} />
                  <Bar dataKey="revenue" name="Doanh thu" fill="url(#revGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Col>
      </Row>

      {/* ── Row 4: Tickets Over Time + Category Distribution ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={14}>
          <ChartCard title="Phiếu bảo trì 30 ngày qua" isDark={isDark}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats?.tickets_over_time || []}>
                <defs>
                  <linearGradient id="ticketGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} phiếu`, 'Số lượng']} labelFormatter={l => new Date(l).toLocaleDateString('vi-VN')} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#ticketGrad)" dot={{ r: 3, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={10}>
          <ChartCard title="Phân bổ danh mục SKU" isDark={isDark}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={s.category_distribution || []} dataKey="count" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {(s.category_distribution || []).map((entry, i) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: string) => [`${v} SKU`, name]} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* ── Row 5: Category Bar Chart ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24}>
          <ChartCard title="Số lượng SKU & tồn kho theo danh mục" isDark={isDark}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catBarData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="Số SKU" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tồn kho" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* ── Row 6: Top SKU by Value + Top Selling ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <ChartCard title="Top SKU theo giá trị tồn kho" isDark={isDark}>
            {topValueData.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#64748b' : '#94a3b8' }}>
                <InboxOutlined style={{ fontSize: 28, marginRight: 8 }} /> Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topValueData} layout="vertical" barCategoryGap="20%">
                  <defs>
                    <linearGradient id="valueGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtM} />
                  <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtVND(v), 'Giá trị tồn']} />
                  <Bar dataKey="Giá trị (₫)" fill="url(#valueGrad)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard title="Top sản phẩm bán chạy" isDark={isDark}>
            {topSellingData.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#64748b' : '#94a3b8' }}>
                <InboxOutlined style={{ fontSize: 28, marginRight: 8 }} /> Chưa có đơn hàng
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSellingData} layout="vertical" barCategoryGap="20%">
                  <defs>
                    <linearGradient id="sellGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: string) => [name === 'SL bán' ? `${v} cái` : fmtVND(v), name]} />
                  <Bar dataKey="SL bán" fill="url(#sellGrad)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Col>
      </Row>

      {/* ── Row 7: Status Pies (Ticket / Warranty / Serial) ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Trạng thái phiếu bảo trì', data: ticketPieData },
          { title: 'Trạng thái bảo hành', data: warrantyPieData },
          { title: 'Trạng thái Serial Unit', data: serialPieData },
        ].map(({ title, data }) => (
          <Col xs={24} sm={8} key={title}>
            <ChartCard title={title} isDark={isDark}>
              {data.length === 0 ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#64748b' : '#94a3b8', fontSize: 13 }}>
                  <InboxOutlined style={{ marginRight: 6 }} /> Chưa có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: string) => [`${v}`, name]} />
                    <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Col>
        ))}
      </Row>

      {/* ── Row 8: Top Customers ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24}>
          <ChartCard title="Khách hàng chi tiêu nhiều nhất" isDark={isDark}>
            {(s.top_customers || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: isDark ? '#64748b' : '#94a3b8' }}>
                <TeamOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <div>Chưa có dữ liệu khách hàng</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {s.top_customers.map((c, i) => {
                  const max = s.top_customers[0].total_spent || 1;
                  const pct = Math.round((c.total_spent / max) * 100);
                  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899'];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar size={36} style={{ background: colors[i], fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {c.name.charAt(0)}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text strong style={{ color: isDark ? '#f1f5f9' : '#0f172a', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.name}
                          </Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                            <Tag color={c.type === 'business' ? 'blue' : 'green'} style={{ fontSize: 10, margin: 0 }}>
                              {c.type === 'business' ? 'Doanh nghiệp' : 'Cá nhân'}
                            </Tag>
                            <Text style={{ fontSize: 12, fontWeight: 700, color: colors[i] }}>{fmtVND(c.total_spent)}</Text>
                          </div>
                        </div>
                        <Progress
                          percent={pct}
                          showInfo={false}
                          strokeColor={colors[i]}
                          railColor={isDark ? 'rgba(51,65,85,0.4)' : '#f1f5f9'}
                          size="small"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
}
