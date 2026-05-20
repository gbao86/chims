// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App, Button, Card, Col, Form, Input, Modal, Popconfirm,
  Row, Select, Space, Statistic, Table, Tag, Typography,
} from 'antd';
import {
  DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, TeamOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';

type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  type: 'individual' | 'business';
  total_spent: number;
  order_count: number;
};

const { Title, Text } = Typography;

const typeLabel: Record<string, string> = { individual: 'Cá nhân', business: 'Doanh nghiệp' };
const typeColor: Record<string, string> = { individual: 'default', business: 'blue' };

export default function CustomersPage() {
  const { isDark } = useTheme();
  const { message } = App.useApp();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form] = Form.useForm();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const res = await api.get('/api/customers', { params });
      setCustomers(res.data.customers || []);
    } catch {
      message.error('Không tải được danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    if (modalOpen) {
      if (editCustomer) form.setFieldsValue(editCustomer);
      else form.resetFields();
    }
  }, [modalOpen, editCustomer, form]);

  const totalSpent = useMemo(() => customers.reduce((s, c) => s + c.total_spent, 0), [customers]);
  const businessCount = useMemo(() => customers.filter(c => c.type === 'business').length, [customers]);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editCustomer) {
        await api.put(`/api/customers/${editCustomer.id}`, values);
        message.success('Cập nhật khách hàng thành công');
      } else {
        await api.post('/api/customers', values);
        message.success('Thêm khách hàng thành công');
      }
      setModalOpen(false);
      setEditCustomer(null);
      fetchCustomers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Lỗi lưu khách hàng');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/customers/${id}`);
      message.success('Đã xóa khách hàng');
      fetchCustomers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Lỗi xóa khách hàng');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            <TeamOutlined style={{ marginRight: 8 }} />Quản lý Khách hàng
          </Title>
          <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>
            Danh sách khách hàng được tổng hợp từ đơn bán hàng và đăng ký thủ công
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCustomers} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditCustomer(null); setModalOpen(true); }}
            style={{ borderRadius: 12, fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}
          >
            Thêm khách hàng
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, background: isDark ? 'rgba(99,102,241,0.08)' : 'linear-gradient(135deg, #f0f0ff, #e8e8ff)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <Statistic
              title="Tổng khách hàng"
              value={customers.length}
              suffix="khách"
              styles={{ content: { color: '#6366f1', fontWeight: 800 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, background: isDark ? 'rgba(34,197,94,0.08)' : 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <Statistic
              title="Tổng chi tiêu"
              value={totalSpent}
              suffix="₫"
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
              styles={{ content: { color: '#22c55e', fontWeight: 800 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, background: isDark ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <Statistic
              title="Khách doanh nghiệp"
              value={businessCount}
              suffix="doanh nghiệp"
              styles={{ content: { color: '#f59e0b', fontWeight: 800 } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Search & Filter */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          allowClear
          placeholder="Tìm tên, điện thoại, email, mã KH..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 320 }}
        />
        <Select
          allowClear
          placeholder="Lọc loại khách hàng"
          value={typeFilter || undefined}
          onChange={(v) => setTypeFilter(v || '')}
          options={[
            { value: 'individual', label: 'Cá nhân' },
            { value: 'business', label: 'Doanh nghiệp' },
          ]}
          style={{ width: 200 }}
        />
      </Space>

      {/* Table */}
      <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`, background: isDark ? 'rgba(30,41,59,0.8)' : '#fff' }}>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={customers}
          pagination={{ pageSize: 20, showTotal: (t) => `Tổng ${t} khách hàng` }}
          columns={[
            {
              title: 'Mã KH',
              dataIndex: 'code',
              width: 110,
              render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{v}</span>,
            },
            {
              title: 'Tên khách hàng',
              dataIndex: 'name',
              render: (v: string, r: Customer) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{v}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{r.phone}</Text>
                </div>
              ),
            },
            { title: 'Email', dataIndex: 'email', render: (v: string) => v || <Text type="secondary">—</Text> },
            {
              title: 'Loại',
              dataIndex: 'type',
              width: 140,
              render: (v: string) => <Tag color={typeColor[v]}>{typeLabel[v] || v}</Tag>,
            },
            {
              title: 'Số đơn',
              dataIndex: 'order_count',
              width: 90,
              align: 'center' as const,
              render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span>,
            },
            {
              title: 'Tổng chi tiêu',
              dataIndex: 'total_spent',
              width: 160,
              align: 'right' as const,
              render: (v: number) => (
                <span style={{ fontWeight: 600, color: v > 0 ? '#22c55e' : '#94a3b8' }}>
                  {v.toLocaleString('vi-VN')} ₫
                </span>
              ),
            },
            {
              title: 'Hành động',
              width: 120,
              align: 'center' as const,
              render: (_: unknown, r: Customer) => (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => { setEditCustomer(r); setModalOpen(true); }}
                  />
                  <Popconfirm
                    title="Xóa khách hàng này?"
                    description="Thao tác này không thể hoàn tác."
                    onConfirm={() => handleDelete(r.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditCustomer(null); }}
        onOk={handleSave}
        title={editCustomer ? '✏️ Sửa thông tin khách hàng' : '➕ Thêm khách hàng mới'}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ type: 'individual' }}>
          <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}>
            <Input placeholder="Nhập họ và tên khách hàng" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="Nhập email (không bắt buộc)" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Nhập địa chỉ" />
          </Form.Item>
          <Form.Item name="type" label="Loại khách hàng">
            <Select
              options={[
                { value: 'individual', label: 'Cá nhân' },
                { value: 'business', label: 'Doanh nghiệp' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
