// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import { useEffect, useState } from 'react';
import { Typography, Spin, Card, Row, Col, Progress, Button, Alert, Space } from 'antd';
import {
  AppstoreOutlined,
  WarningOutlined,
  ToolOutlined,
  DollarOutlined,
  ShoppingOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import { DashboardStats } from '@/types';
import StatCard from '@/components/dashboard/StatCard';
import TicketChart from '@/components/dashboard/TicketChart';
import { useTheme } from '@/components/ThemeProvider';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<DashboardStats>('/api/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" /></div>;
  }

  const stockHealth = Math.max(0, Math.min(100, Math.round(((stats?.total_parts || 0) - (stats?.low_stock_count || 0)) / Math.max(stats?.total_parts || 1, 1) * 100)));

  return (
    <div>
      <div style={{
        marginBottom: 28,
        padding: '24px 24px',
        borderRadius: 20,
        background: isDark ? 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.88))' : 'linear-gradient(135deg, #ffffff, #f8fafc)',
        border: `1px solid ${isDark ? 'rgba(51,65,85,0.75)' : 'rgba(226,232,240,0.9)'}`,
      }}>
        <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Dashboard</Title>
        <Text style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Tổng quan hệ thống quản lý kho, bán hàng, mua hàng và bảo hành</Text>
        <Space style={{ marginTop: 16 }}>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => router.push('/catalog')}>Thêm SKU</Button>
          <Button icon={<SyncOutlined />} onClick={() => router.push('/api/catalog/sync-all' as any)}>Sync catalog</Button>
        </Space>
      </div>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
        title={`Cần rà soát ${stats?.low_stock_count || 0} SKU sắp hết hàng và đồng bộ ảnh/specs cho catalog.`}
      />

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}><StatCard title="Tổng linh kiện" value={stats?.total_parts || 0} icon={<AppstoreOutlined />} gradient="linear-gradient(135deg, #6366f1, #8b5cf6)" /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard title="Sắp hết hàng" value={stats?.low_stock_count || 0} icon={<WarningOutlined />} gradient="linear-gradient(135deg, #f59e0b, #f97316)" /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard title="Đang xử lý" value={stats?.pending_tickets || 0} icon={<ToolOutlined />} gradient="linear-gradient(135deg, #ef4444, #f43f5e)" /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard title="Doanh thu" value={stats?.total_revenue || 0} icon={<DollarOutlined />} gradient="linear-gradient(135deg, #22c55e, #10b981)" suffix="VNĐ" /></Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}><StatCard title="Khách hàng" value={stats?.total_customers || 0} icon={<TeamOutlined />} gradient="linear-gradient(135deg, #0ea5e9, #3b82f6)" /></Col>
        <Col xs={24} md={8}><StatCard title="Nhà cung cấp" value={stats?.total_suppliers || 0} icon={<ShoppingOutlined />} gradient="linear-gradient(135deg, #a855f7, #ec4899)" /></Col>
        <Col xs={24} md={8}><StatCard title="Bảo hành đang hoạt động" value={stats?.active_warranties || 0} icon={<SafetyCertificateOutlined />} gradient="linear-gradient(135deg, #14b8a6, #06b6d4)" /></Col>
      </Row>

      <Card style={{ borderRadius: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text strong>Chỉ số sức khỏe kho</Text>
          <Text>{stockHealth}%</Text>
        </div>
        <Progress percent={stockHealth} strokeColor={{ from: '#6366f1', to: '#22c55e' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
          <Card size="small"><Text type="secondary">Sales tháng này</Text><div style={{ fontSize: 18, fontWeight: 700 }}>{(stats?.sales_this_month || 0).toLocaleString('vi-VN')} VNĐ</div></Card>
          <Card size="small"><Text type="secondary">Purchases tháng này</Text><div style={{ fontSize: 18, fontWeight: 700 }}>{(stats?.purchases_this_month || 0).toLocaleString('vi-VN')} VNĐ</div></Card>
          <Card size="small"><Text type="secondary">Tickets hoàn thành</Text><div style={{ fontSize: 18, fontWeight: 700 }}>{stats?.completed_this_month || 0}</div></Card>
        </div>
      </Card>

      <TicketChart data={stats?.tickets_over_time || []} />
    </div>
  );
}

