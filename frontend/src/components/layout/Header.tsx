'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Dropdown, Badge, Typography, Breadcrumb, Button, Input } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useTheme } from '@/components/ThemeProvider';
import { User } from '@/types';
import type { MenuProps } from 'antd';
import { usePathname, useRouter } from 'next/navigation';

const { Text } = Typography;

const breadcrumbsMap: Record<string, string[]> = {
  '/dashboard': ['Tổng quan', 'Dashboard'],
  '/catalog': ['Kho & Catalog', 'Catalog SKU'],
  '/inventory': ['Kho & Catalog', 'Kho linh kiện'],
  '/sales': ['Vận hành', 'Bán hàng'],
  '/purchase': ['Vận hành', 'Nhập hàng'],
  '/customers': ['Vận hành', 'Khách hàng'],
  '/maintenance': ['Dịch vụ', 'Bảo trì'],
  '/warranty': ['Dịch vụ', 'Bảo hành'],
  '/reports': ['Dịch vụ', 'Báo cáo'],
  '/settings': ['Hệ thống', 'Cài đặt'],
};

export default function Header() {
  const { isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('chims_user');
    if (!saved) return;
    try {
      setUser(JSON.parse(saved));
    } catch {
      setUser(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('chims_token');
    localStorage.removeItem('chims_user');
    window.location.href = '/login';
  };

  const roleColors: Record<string, string> = {
    admin: '#ef4444',
    technician: '#3b82f6',
    sales: '#22c55e',
  };

  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    technician: 'Kỹ thuật viên',
    sales: 'Nhân viên bán hàng',
  };

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: (
        <div style={{ padding: '4px 0' }}>
          <Text strong style={{ display: 'block' }}>{user?.full_name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {user?.role ? roleLabels[user.role] : ''}
          </Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const crumbs = breadcrumbsMap[pathname] || ['CHIMS', 'Workspace'];

  const executeSearch = () => {
    const q = search.trim();
    if (!q) return;
    router.push(`/catalog?search=${encodeURIComponent(q)}`);
  };

  return (
    <div
      style={{
        minHeight: 72,
        padding: '12px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.86)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <Breadcrumb items={crumbs.map((label) => ({ title: label }))} style={{ fontSize: 12 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm SKU, linh kiện, khách hàng..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={executeSearch}
            style={{ width: 340, maxWidth: '100%', borderRadius: 12 }}
          />
          <Button onClick={toggleTheme} icon={isDark ? <MoonOutlined /> : <SunOutlined />}>
            {isDark ? 'Dark' : 'Light'}
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
        <Badge count={3} size="small" offset={[-2, 2]}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: isDark ? 'rgba(51,65,85,0.4)' : 'rgba(241,245,249,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <BellOutlined style={{ fontSize: 18, color: isDark ? '#94a3b8' : '#64748b' }} />
          </div>
        </Badge>

        <Dropdown menu={{ items: dropdownItems }} trigger={['click']} placement="bottomRight">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 12,
              transition: 'background 0.2s',
            }}
          >
            <Avatar
              size={38}
              icon={<UserOutlined />}
              style={{
                background: `linear-gradient(135deg, ${user?.role ? roleColors[user.role] : '#6366f1'}, #8b5cf6)`,
              }}
            />
            <div style={{ lineHeight: 1.3 }}>
              <Text strong style={{ display: 'block', fontSize: 14 }}>
                {user?.full_name || 'User'}
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>
                {user?.role ? roleLabels[user.role] : ''}
              </Text>
            </div>
          </div>
        </Dropdown>
      </div>
    </div>
  );
}
