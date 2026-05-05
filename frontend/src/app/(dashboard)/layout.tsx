'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from 'antd';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthProvider } from '@/lib/auth';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('chims_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  if (!authChecked) {
    return null;
  }

  return (
    <AuthProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar />
        <Layout style={{ marginLeft: 260, transition: 'margin-left 0.3s ease' }}>
          <Header />
          <Content style={{ padding: '28px 32px', minHeight: 'calc(100vh - 72px)' }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </AuthProvider>
  );
}
