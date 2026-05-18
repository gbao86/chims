// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { App, Card, Input, Table, Tag, Typography } from 'antd';
import api from '@/lib/api';

type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  type: string;
  total_spent: number;
  order_count: number;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();
  const { Title, Paragraph, Text } = Typography;

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/customers', { params: { limit: 100, ...(search ? { search } : {}) } });
      setCustomers(res.data.customers || []);
    } catch {
      message.error('Không tải được khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [search]);
  const totalSpent = useMemo(() => customers.reduce((s, c) => s + c.total_spent, 0), [customers]);

  return (
    <div>
      <Title level={2}>Customers</Title>
      <Paragraph type="secondary">Danh sách khách hàng được tự động tổng hợp từ các đơn bán hàng.</Paragraph>
      <Input.Search allowClear placeholder="Tìm tên, điện thoại, email, mã..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 360, marginBottom: 16 }} />
      <Card style={{ marginBottom: 16 }}>
        <Text strong>Tổng chi tiêu khách hàng: </Text>
        <Text>{totalSpent.toLocaleString('vi-VN')} ₫</Text>
      </Card>
      <Table
        loading={loading}
        rowKey="id"
        dataSource={customers}
        columns={[
          { title: 'Mã', dataIndex: 'code', render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{v}</span> },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'SĐT', dataIndex: 'phone' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Loại', dataIndex: 'type', render: (v: string) => <Tag color={v === 'business' ? 'blue' : 'default'}>{v}</Tag> },
          { title: 'Đơn', dataIndex: 'order_count', align: 'center' as const },
          { title: 'Đã chi', dataIndex: 'total_spent', align: 'right' as const, render: (v: number) => <span style={{ fontWeight: 600, color: v > 0 ? '#22c55e' : undefined }}>{v.toLocaleString('vi-VN')} ₫</span> },
        ]}
      />
    </div>
  );
}
