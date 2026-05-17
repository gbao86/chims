// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useMemo, useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  ToolOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  FileTextOutlined,
  ReconciliationOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DesktopOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  ExperimentOutlined,
  BarcodeOutlined,
  BuildOutlined,
  HomeOutlined,
  SafetyOutlined,
  UsergroupAddOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/lib/auth';

const { Sider } = Layout;
const { Text } = Typography;


export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const items = useMemo(
    () => [
      {
        type: 'group' as const,
        label: collapsed ? null : 'Tổng quan',
        children: [{ key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' }],
      },
      {
        type: 'group' as const,
        label: collapsed ? null : 'Kho & Catalog',
        children: [
          { key: '/inventory', icon: <InboxOutlined />, label: 'Kho linh kiện' },
          { key: '/serial-units', icon: <BarcodeOutlined />, label: 'Serial Units' },
          { key: '/catalog', icon: <ShopOutlined />, label: 'Catalog SKU' },
          { key: '/warehouse', icon: <HomeOutlined />, label: 'Quản lý Kho' },
        ],
      },
      {
        type: 'group' as const,
        label: collapsed ? null : 'Vận hành',
        children: [
          { key: '/build-pc', icon: <BuildOutlined />, label: 'Build PC' },
          { key: '/sales', icon: <ReconciliationOutlined />, label: 'Bán hàng' },
          { key: '/purchase', icon: <ShoppingCartOutlined />, label: 'Nhập hàng' },
          { key: '/customers', icon: <TeamOutlined />, label: 'Khách hàng' },
          ...(isAdmin ? [{ key: '/staff', icon: <UsergroupAddOutlined />, label: 'Quản lý Nhân sự' }] : []),
        ],
      },
      {
        type: 'group' as const,
        label: collapsed ? null : 'Dịch vụ',
        children: [
          { key: '/maintenance', icon: <ToolOutlined />, label: 'Bảo trì' },
          { key: '/warranty', icon: <FileTextOutlined />, label: 'Bảo hành' },
          { key: '/rma', icon: <SafetyOutlined />, label: 'RMA' },
          { key: '/reports', icon: <ExperimentOutlined />, label: 'Báo cáo' },
        ],
      },
      {
        type: 'group' as const,
        label: collapsed ? null : 'Hệ thống',
        children: [
          { key: '/audit', icon: <AuditOutlined />, label: 'Kiểm kê Kho' },
          { key: '/settings', icon: <SettingOutlined />, label: 'Cài đặt' },
        ],
      },
    ],
    [collapsed, isAdmin]
  );

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={260}
      collapsedWidth={84}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        background: isDark ? '#0c0f1a' : '#0f172a',
        borderRight: '1px solid rgba(99, 102, 241, 0.08)',
        zIndex: 100,
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          gap: 12,
          cursor: 'pointer',
        }}
        onClick={() => router.push('/dashboard')}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <DesktopOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        {!collapsed && (
          <div>
            <Text strong style={{ color: '#f1f5f9', fontSize: 18, display: 'block', lineHeight: 1.2 }}>
              CHIMS
            </Text>
            <Text style={{ color: '#64748b', fontSize: 10, display: 'block' }}>Hardware Manager</Text>
          </div>
        )}
      </div>

      <div style={{ height: 'calc(100vh - 72px - 72px)', overflowY: 'auto', overflowX: 'hidden' }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={items}
          onClick={({ key }) => router.push(key)}
          style={{ background: 'transparent', border: 'none', padding: '12px 8px', marginTop: 8 }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(99, 102, 241, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#6366f1',
            transition: 'background 0.2s',
          }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
      </div>
    </Sider>
  );
}

