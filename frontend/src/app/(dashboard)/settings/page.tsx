// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import { useEffect, useState } from 'react';
import { Typography, Avatar, Tag, Switch, Form, Input, Button, App, Space } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  BgColorsOutlined,
  SafetyOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import { User } from '@/types';
import { useTheme } from '@/components/ThemeProvider';
import { APP_VERSION, APP_DESCRIPTION, APP_NAME } from '@/lib/appInfo';

const { Title, Text } = Typography;

const roleLabels: Record<string, string> = {
  admin: 'Quản trị viên',
  technician: 'Kỹ thuật viên',
  sales: 'Nhân viên bán hàng',
};

const roleColors: Record<string, string> = {
  admin: '#ef4444',
  technician: '#3b82f6',
  sales: '#22c55e',
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const { isDark, toggleTheme } = useTheme();
  const { message } = App.useApp();
  const currentYear = new Date().getFullYear();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('chims_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleUpdateProfile = async () => {
    if (user?.username === 'demo') {
      message.error('Tài khoản demo không được phép sửa đổi thông tin!');
      return;
    }
    if (!newName.trim()) {
      message.warning('Tên không được để trống');
      return;
    }
    if (newName === user?.full_name) {
      setEditingName(false);
      return;
    }
    setUpdating(true);
    try {
      const res = await api.put<User>('/api/auth/profile', { full_name: newName });
      setUser(res.data);
      localStorage.setItem('chims_user', JSON.stringify(res.data));
      message.success('Cập nhật tên thành công!');
      window.dispatchEvent(new Event('chims_user_updated'));
      setEditingName(false);
    } catch {
      message.error('Lỗi khi cập nhật tên!');
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = () => {
    if (user?.username === 'demo') {
      message.error('Tài khoản demo không được phép đổi mật khẩu!');
      return;
    }
    message.info('Tính năng đổi mật khẩu sẽ được cập nhật trong phiên bản tới.');
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
          Cài đặt
        </Title>
        <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14, marginTop: 4 }}>
          Quản lý tài khoản và tùy chỉnh hệ thống
        </Text>
      </div>

      {/* Profile Card */}
      <div
        style={{
          background: isDark ? 'rgba(30,41,59,0.8)' : '#fff',
          borderRadius: 20,
          padding: '32px',
          marginBottom: 20,
          border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Avatar
            size={80}
            icon={<UserOutlined />}
            style={{
              background: `linear-gradient(135deg, ${user?.role ? roleColors[user.role] : '#6366f1'}, #8b5cf6)`,
              fontSize: 36,
              boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
            }}
          />
          <div style={{ flex: 1 }}>
            {editingName ? (
              <Space style={{ marginBottom: 4 }}>
                <Input 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  onPressEnter={handleUpdateProfile}
                  disabled={updating}
                  style={{ width: 250 }}
                  placeholder="Nhập họ và tên..."
                />
                <Button type="primary" icon={<SaveOutlined />} loading={updating} onClick={handleUpdateProfile}>Lưu</Button>
                <Button icon={<CloseOutlined />} disabled={updating} onClick={() => setEditingName(false)} />
              </Space>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <Title level={4} style={{ margin: 0, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  {user?.full_name || 'User'}
                </Title>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setNewName(user?.full_name || ''); setEditingName(true); }} />
              </div>
            )}
            <Text type="secondary" style={{ display: 'block' }}>@{user?.username}</Text>
            <div style={{ marginTop: 8 }}>
              <Tag
                color={user?.role ? roleColors[user.role] : 'default'}
                style={{ borderRadius: 8, padding: '2px 12px', fontWeight: 600, border: 'none' }}
              >
                {user?.role ? roleLabels[user.role] : ''}
              </Tag>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div
        style={{
          background: isDark ? 'rgba(30,41,59,0.8)' : '#fff',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 20,
          border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <BgColorsOutlined style={{ fontSize: 20, color: '#6366f1' }} />
          <Title level={5} style={{ margin: 0 }}>Giao diện</Title>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: isDark ? 'rgba(51,65,85,0.3)' : '#f8fafc',
          borderRadius: 12,
        }}>
          <div>
            <Text strong>Chế độ tối</Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
              Chuyển đổi giữa giao diện sáng và tối
            </Text>
          </div>
          <Switch
            checked={isDark}
            onChange={toggleTheme}
            checkedChildren="🌙"
            unCheckedChildren="☀️"
          />
        </div>
      </div>

      {/* Change Password */}
      <div
        style={{
          background: isDark ? 'rgba(30,41,59,0.8)' : '#fff',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 20,
          border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <SafetyOutlined style={{ fontSize: 20, color: '#6366f1' }} />
          <Title level={5} style={{ margin: 0 }}>Bảo mật</Title>
        </div>

        <Form layout="vertical" onFinish={handlePasswordChange}>
          <Form.Item name="current_password" label="Mật khẩu hiện tại">
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="new_password" label="Mật khẩu mới">
              <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" />
            </Form.Item>
            <Form.Item name="confirm_password" label="Xác nhận mật khẩu">
              <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" />
            </Form.Item>
          </div>
          <Button
            type="primary"
            htmlType="submit"
            style={{
              borderRadius: 10,
              height: 42,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
            }}
          >
            Đổi mật khẩu
          </Button>
        </Form>
      </div>

      {/* System Info */}
      <div
        style={{
          background: isDark ? 'rgba(30,41,59,0.8)' : '#fff',
          borderRadius: 20,
          padding: '24px 32px',
          border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          {APP_NAME} v{APP_VERSION} • {APP_DESCRIPTION}
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          FastAPI + Next.js + MongoDB • © {currentYear} CHIMS
        </Text>
      </div>
    </div>
  );
}

