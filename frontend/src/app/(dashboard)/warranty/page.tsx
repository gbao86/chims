'use client';

import { useEffect, useMemo, useState } from 'react';
import { App, Card, Input, Table, Tag, Typography } from 'antd';
import api from '@/lib/api';

type Warranty = {
  id: string;
  warranty_code: string;
  customer_name: string;
  product_name: string;
  serial_number: string;
  expiry_date: string;
  status: string;
};

export default function WarrantyPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();
  const { Title, Paragraph, Text } = Typography;

  const fetchWarranties = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/warranty', { params: { limit: 100, ...(search ? { search } : {}) } });
      setWarranties(res.data.warranties || []);
    } catch {
      message.error('Không tải được bảo hành');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWarranties(); }, [search]);
  const activeCount = useMemo(() => warranties.filter((w) => w.status === 'active').length, [warranties]);

  return (
    <div>
      <Title level={2}>Warranty</Title>
      <Paragraph type="secondary">Quản lý bảo hành từ backend.</Paragraph>
      <Input.Search allowClear placeholder="Tìm mã, serial, sản phẩm..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 360, marginBottom: 16 }} />
      <Card style={{ marginBottom: 16 }}><Text strong>Bảo hành đang hoạt động: </Text><Text>{activeCount}</Text></Card>
      <Table
        loading={loading}
        rowKey="id"
        dataSource={warranties}
        columns={[
          { title: 'Mã BH', dataIndex: 'warranty_code' },
          { title: 'Khách hàng', dataIndex: 'customer_name' },
          { title: 'Sản phẩm', dataIndex: 'product_name' },
          { title: 'Serial', dataIndex: 'serial_number' },
          { title: 'Hết hạn', dataIndex: 'expiry_date' },
          { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag color={v === 'active' ? 'green' : 'red'}>{v}</Tag> },
        ]}
      />
    </div>
  );
}
