// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useMemo, useState } from 'react';
import { Layout, Typography } from 'antd';
import {
  DashboardOutlined,
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

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
}

interface NavGroup {
  label: string;
  children: NavItem[];
}

const sidebarStyles = `
  .chims-sidebar * {
    box-sizing: border-box;
  }

  /* Force Ant Design's inner wrapper to be a flex column so flex:1 works on children */
  .chims-sidebar .ant-layout-sider-children {
    display: flex !important;
    flex-direction: column !important;
    height: 100% !important;
    overflow: hidden !important;
  }

  .chims-nav-scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px 0;
    min-height: 0; /* critical for flex children to scroll */
  }

  .chims-nav-scroll::-webkit-scrollbar {
    width: 3px;
  }

  .chims-nav-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .chims-nav-scroll::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.3);
    border-radius: 99px;
  }

  .chims-nav-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.6);
  }

  .chims-group-label {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.45);
    padding: 16px 20px 6px;
    transition: opacity 0.2s;
    white-space: nowrap;
    overflow: hidden;
  }

  .chims-nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    margin: 1px 8px;
    height: 40px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.18s ease;
    color: rgba(148, 163, 184, 0.75);
    overflow: hidden;
    text-decoration: none;
  }

  .chims-nav-item::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    background: rgba(99, 102, 241, 0);
    transition: background 0.18s ease;
    pointer-events: none;
  }

  .chims-nav-item:hover {
    color: rgba(226, 232, 240, 0.95);
  }

  .chims-nav-item:hover::before {
    background: rgba(99, 102, 241, 0.1);
  }

  .chims-nav-item.active {
    color: #fff;
    background: rgba(99, 102, 241, 0.18);
    box-shadow:
      0 0 0 1px rgba(99, 102, 241, 0.25) inset,
      0 4px 16px rgba(99, 102, 241, 0.15);
  }

  .chims-nav-item.active::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 60%;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, #818cf8, #6366f1);
    box-shadow: 0 0 8px rgba(99, 102, 241, 0.7);
  }

  .chims-nav-icon {
    font-size: 15px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    transition: transform 0.18s ease;
  }

  .chims-nav-item:hover .chims-nav-icon {
    transform: scale(1.08);
  }

  .chims-nav-item.active .chims-nav-icon {
    color: #818cf8;
    filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.5));
  }

  .chims-nav-label {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    letter-spacing: 0.01em;
    transition: opacity 0.2s, transform 0.2s;
  }

  .chims-nav-item.active .chims-nav-label {
    font-weight: 600;
    color: #e2e8f0;
  }

  .chims-collapse-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: rgba(99, 102, 241, 0.8);
    transition: all 0.18s ease;
  }

  .chims-collapse-btn:hover {
    background: rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.4);
    color: #818cf8;
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
  }

  .chims-logo-wrap {
    height: 68px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.18s;
    position: relative;
    overflow: hidden;
  }

  .chims-logo-wrap::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.4), transparent);
  }

  .chims-logo-wrap:hover {
    background: rgba(99, 102, 241, 0.04);
  }

  .chims-logo-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow:
      0 4px 16px rgba(99, 102, 241, 0.35),
      0 0 0 1px rgba(99, 102, 241, 0.2) inset;
    position: relative;
  }

  .chims-logo-icon::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 11px;
    background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
  }

  .chims-footer {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    position: relative;
  }

  .chims-footer::before {
    content: '';
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent);
  }
`;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const groups: NavGroup[] = useMemo(
    () => [
      {
        label: 'Tổng quan',
        children: [
          { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        ],
      },
      {
        label: 'Kho & Catalog',
        children: [
          { key: '/inventory', icon: <InboxOutlined />, label: 'Kho linh kiện' },
          { key: '/serial-units', icon: <BarcodeOutlined />, label: 'Serial Units' },
          { key: '/catalog', icon: <ShopOutlined />, label: 'Catalog SKU' },
          { key: '/warehouse', icon: <HomeOutlined />, label: 'Quản lý Kho' },
        ],
      },
      {
        label: 'Vận hành',
        children: [
          { key: '/build-pc', icon: <BuildOutlined />, label: 'Build PC' },
          { key: '/sales', icon: <ReconciliationOutlined />, label: 'Bán hàng' },
          { key: '/purchase', icon: <ShoppingCartOutlined />, label: 'Nhập hàng' },
          { key: '/customers', icon: <TeamOutlined />, label: 'Khách hàng' },
          ...(isAdmin
            ? [{ key: '/staff', icon: <UsergroupAddOutlined />, label: 'Quản lý Nhân sự' }]
            : []),
        ],
      },
      {
        label: 'Dịch vụ',
        children: [
          { key: '/maintenance', icon: <ToolOutlined />, label: 'Bảo trì' },
          { key: '/warranty', icon: <FileTextOutlined />, label: 'Bảo hành' },
          { key: '/rma', icon: <SafetyOutlined />, label: 'RMA' },
          { key: '/reports', icon: <ExperimentOutlined />, label: 'Báo cáo' },
        ],
      },
      {
        label: 'Hệ thống',
        children: [
          { key: '/audit', icon: <AuditOutlined />, label: 'Kiểm kê Kho' },
          { key: '/settings', icon: <SettingOutlined />, label: 'Cài đặt' },
        ],
      },
    ],
    [isAdmin]
  );

  return (
    <>
      <style>{sidebarStyles}</style>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={256}
        collapsedWidth={72}
        className="chims-sidebar"
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          background: isDark
            ? 'linear-gradient(180deg, #0a0d18 0%, #0c0f1e 100%)'
            : 'linear-gradient(180deg, #0d1117 0%, #0f172a 100%)',
          borderRight: '1px solid rgba(99, 102, 241, 0.1)',
          zIndex: 100,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
      >
        {/* ── Logo ── */}
        <div
          className="chims-logo-wrap"
          style={{
            padding: collapsed ? '0' : '0 16px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 12,
          }}
          onClick={() => router.push('/dashboard')}
        >
          <div className="chims-logo-icon">
            <DesktopOutlined style={{ color: '#fff', fontSize: 17 }} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <Text
                strong
                style={{
                  color: '#f1f5f9',
                  fontSize: 17,
                  display: 'block',
                  lineHeight: 1.25,
                  letterSpacing: '0.04em',
                }}
              >
                CHIMS
              </Text>
              <Text
                style={{
                  color: 'rgba(99,102,241,0.65)',
                  fontSize: 10,
                  display: 'block',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Hardware Manager
              </Text>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <div className="chims-nav-scroll">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div className="chims-group-label">{group.label}</div>
              )}
              {collapsed && <div style={{ height: 12 }} />}
              {group.children.map((item) => {
                const isActive = pathname === item.key;
                return (
                  <div
                    key={item.key}
                    className={`chims-nav-item${isActive ? ' active' : ''}`}
                    onClick={() => router.push(item.key)}
                    title={collapsed ? item.label : undefined}
                    style={
                      collapsed
                        ? { justifyContent: 'center', padding: '0 10px', margin: '1px 6px' }
                        : {}
                    }
                  >
                    <span className="chims-nav-icon">{item.icon}</span>
                    {!collapsed && (
                      <span className="chims-nav-label">{item.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* bottom padding inside scroll */}
          <div style={{ height: 12 }} />
        </div>

        {/* ── Footer / Collapse toggle ── */}
        <div className="chims-footer">
          <div
            className="chims-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed ? (
              <MenuUnfoldOutlined style={{ fontSize: 13 }} />
            ) : (
              <MenuFoldOutlined style={{ fontSize: 13 }} />
            )}
          </div>
        </div>
      </Sider>
    </>
  );
}