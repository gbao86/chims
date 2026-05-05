'use client';

import React, { useState } from 'react';
import { Form, Input, Button, App, Typography } from 'antd';
import { UserOutlined, LockOutlined, DesktopOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LoginResponse } from '@/types';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { message } = App.useApp();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', values);
      const { access_token, user } = response.data;
      localStorage.setItem('chims_token', access_token);
      localStorage.setItem('chims_user', JSON.stringify(user));
      message.success(`Chào mừng, ${user.full_name}!`);
      router.push('/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      message.error(err?.response?.data?.detail || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top, rgba(99,102,241,0.18), transparent 35%), linear-gradient(135deg, #081120 0%, #101a33 55%, #0b1220 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: 24,
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 92%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 560,
        height: 560,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 68%)',
        top: '-180px',
        right: '-120px',
      }} />
      <div style={{
        position: 'absolute',
        width: 420,
        height: 420,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 68%)',
        bottom: '-120px',
        left: '-80px',
      }} />

      <div style={{
        width: '100%',
        maxWidth: 460,
        padding: '40px 36px',
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderRadius: 24,
        border: '1px solid rgba(148, 163, 184, 0.16)',
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.38)',
        animation: 'fadeInUp 0.6s ease-out',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 76,
            height: 76,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 14px 32px rgba(99, 102, 241, 0.28)',
          }}>
            <DesktopOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={3} style={{ color: '#f8fafc', margin: 0, fontWeight: 800, letterSpacing: 0.2 }}>
            CHIMS
          </Title>
          <Text style={{ color: '#94a3b8', fontSize: 14 }}>
            Quản lý linh kiện máy tính theo phong cách hiện đại, rõ ràng và hiệu quả.
          </Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Tên đăng nhập"
              style={{
                height: 48,
                borderRadius: 12,
                background: 'rgba(30, 41, 59, 0.75)',
                border: '1px solid rgba(71, 85, 105, 0.65)',
                color: '#f8fafc',
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Mật khẩu"
              style={{
                height: 48,
                borderRadius: 12,
                background: 'rgba(30, 41, 59, 0.75)',
                border: '1px solid rgba(71, 85, 105, 0.65)',
                color: '#f8fafc',
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 48,
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 16,
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                border: 'none',
                boxShadow: '0 10px 24px rgba(79, 70, 229, 0.3)',
              }}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            Demo: admin / admin123
          </Text>
        </div>
      </div>
    </div>
  );
}
