// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App, Button, Card, Col, Form, Input, InputNumber,
  Modal, Row, Select, Space, Statistic, Table, Tag, Typography,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';

const { Title, Text } = Typography;

type Warranty = {
  id: string;
  warranty_code: string;
  customer_id: string;
  customer_name: string;
  inventory_id: string;
  product_name: string;
  serial_number: string;
  sales_order_id: string;
  warranty_months: number;
  purchase_date: string;
  expiry_date: string;
  status: string;
  claims: { date: string; issue: string; resolution: string; cost: number }[];
};

type CustomerOption = { value: string; label: string };
type ProductOption  = { value: string; label: string; sku: string };
type OrderOption    = { value: string; label: string };

const STATUS_COLOR: Record<string, string> = {
  active:  'green',
  claimed: 'orange',
  expired: 'red',
  void:    'default',
};
const STATUS_LABEL: Record<string, string> = {
  active:  'Còn hiệu lực',
  claimed: 'Đã yêu cầu BH',
  expired: 'Hết hạn',
  void:    'Vô hiệu',
};

export default function WarrantyPage() {
  const { isDark } = useTheme();
  const { message } = App.useApp();

  const [warranties, setWarranties]   = useState<Warranty[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [form] = Form.useForm();

  // Dropdown options
  const [customers, setCustomers]     = useState<CustomerOption[]>([]);
  const [products,  setProducts]      = useState<ProductOption[]>([]);
  const [orders,    setOrders]        = useState<OrderOption[]>([]);

  // ── Fetch danh sách bảo hành ───────────────────────────────────────────────
  const fetchWarranties = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (search)      params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/api/warranty', { params });
      setWarranties(res.data.warranties || []);
    } catch {
      message.error('Không tải được danh sách bảo hành');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchWarranties(); }, [fetchWarranties]);

  // ── Tải dữ liệu cho dropdown khi mở modal ─────────────────────────────────
  const loadDropdowns = async () => {
    try {
      const [custRes, invRes, saleRes] = await Promise.all([
        api.get('/api/customers', { params: { limit: 200 } }),
        api.get('/api/inventory',  { params: { limit: 200 } }),
        api.get('/api/sales',      { params: { limit: 100, status: 'confirmed' } }),
      ]);
      setCustomers(
        (custRes.data.customers || []).map((c: any) => ({
          value: c.id, label: `${c.name} — ${c.phone}`,
        }))
      );
      setProducts(
        (invRes.data.items || []).map((p: any) => ({
          value: p.id, label: `${p.name} (${p.sku_code})`, sku: p.sku_code,
        }))
      );
      setOrders(
        (saleRes.data.orders || []).map((o: any) => ({
          value: o.id, label: `${o.invoice_number} — ${o.customer_name}`,
        }))
      );
    } catch {
      message.warning('Không tải được dữ liệu dropdown');
    }
  };

  const openModal = () => {
    form.resetFields();
    form.setFieldValue('warranty_months', 24);
    loadDropdowns();
    setModalOpen(true);
  };

  // ── Submit tạo phiếu bảo hành ─────────────────────────────────────────────
  const handleSubmit = async () => {
    let values: any;
    try { values = await form.validateFields(); } catch { return; }

    // Lấy tên sản phẩm từ option đã chọn
    const selectedProduct = products.find(p => p.value === values.inventory_id);

    const payload = {
      customer_id:     values.customer_id,
      inventory_id:    values.inventory_id,
      product_name:    selectedProduct?.label.split(' (')[0] || '',
      serial_number:   values.serial_number.trim(),
      warranty_months: values.warranty_months,
      sales_order_id:  values.sales_order_id || '',
    };

    setSaving(true);
    try {
      await api.post('/api/warranty', payload);
      message.success('Tạo phiếu bảo hành thành công!');
      setModalOpen(false);
      fetchWarranties();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Lỗi tạo phiếu bảo hành');
    } finally {
      setSaving(false);
    }
  };

  // ── KPI ───────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => ({
    active:  warranties.filter(w => w.status === 'active').length,
    claimed: warranties.filter(w => w.status === 'claimed').length,
    expired: warranties.filter(w => w.status === 'expired').length,
    total:   warranties.length,
  }), [warranties]);

  // ── Format ngày ──────────────────────────────────────────────────────────
  const fmtDate = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('vi-VN');
  };

  const cardStyle = {
    borderRadius: 14,
    border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
    background: isDark ? 'rgba(30,41,59,0.8)' : '#fff',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            <SafetyCertificateOutlined style={{ marginRight: 8, color: '#22c55e' }} />
            Quản lý Bảo hành
          </Title>
          <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>
            Theo dõi hồ sơ bảo hành và yêu cầu bảo hành của khách hàng
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchWarranties}>Làm mới</Button>
          <Button
            type="primary" icon={<PlusOutlined />}
            onClick={openModal}
            style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', border: 'none', fontWeight: 600 }}
          >
            + Tạo bảo hành
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { label: 'Tổng phiếu',       value: kpi.total,   color: '#6366f1' },
          { label: 'Còn hiệu lực',     value: kpi.active,  color: '#22c55e' },
          { label: 'Đã yêu cầu BH',   value: kpi.claimed, color: '#f59e0b' },
          { label: 'Hết hạn',          value: kpi.expired, color: '#ef4444' },
        ].map(k => (
          <Col key={k.label} xs={12} sm={6}>
            <Card style={cardStyle} styles={{ body: { padding: '16px 20px' } }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>{k.label}</Text>}
                value={k.value}
                valueStyle={{ fontSize: 26, fontWeight: 800, color: k.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="Tìm mã BH, serial, sản phẩm, khách hàng..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <Select
          allowClear
          placeholder="Lọc trạng thái"
          value={statusFilter || undefined}
          onChange={v => setStatusFilter(v || '')}
          style={{ width: 180 }}
          options={[
            { value: 'active',  label: 'Còn hiệu lực' },
            { value: 'claimed', label: 'Đã yêu cầu BH' },
            { value: 'expired', label: 'Hết hạn' },
            { value: 'void',    label: 'Vô hiệu' },
          ]}
        />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, borderRadius: 16, overflow: 'hidden' }}>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={warranties}
          pagination={{ pageSize: 15, showTotal: (t) => `Tổng ${t} phiếu` }}
          columns={[
            {
              title: 'Mã BH', dataIndex: 'warranty_code', width: 110,
              render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#22c55e' }}>{v}</span>,
            },
            {
              title: 'Khách hàng', dataIndex: 'customer_name', ellipsis: true,
              render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
            },
            { title: 'Sản phẩm', dataIndex: 'product_name', ellipsis: true },
            {
              title: 'Serial', dataIndex: 'serial_number', width: 180,
              render: (v: string) => <code style={{ fontSize: 12, color: '#6366f1' }}>{v || '—'}</code>,
            },
            {
              title: 'Thời hạn', dataIndex: 'warranty_months', width: 100, align: 'center' as const,
              render: (v: number) => <Tag>{v} tháng</Tag>,
            },
            {
              title: 'Hết hạn', dataIndex: 'expiry_date', width: 120,
              render: (v: string) => {
                const expired = v && new Date(v) < new Date();
                return (
                  <span style={{ color: expired ? '#ef4444' : undefined, fontWeight: expired ? 600 : undefined }}>
                    {fmtDate(v)}
                  </span>
                );
              },
            },
            {
              title: 'Claims', width: 70, align: 'center' as const,
              render: (_: unknown, r: Warranty) => (
                <Tag color={r.claims?.length > 0 ? 'orange' : 'default'}>{r.claims?.length || 0}</Tag>
              ),
            },
            {
              title: 'Trạng thái', dataIndex: 'status', width: 140,
              render: (v: string) => (
                <Tag color={STATUS_COLOR[v] || 'default'} style={{ fontWeight: 600 }}>
                  {STATUS_LABEL[v] || v}
                </Tag>
              ),
            },
          ]}
        />
      </div>

      {/* Modal Tạo phiếu bảo hành */}
      <Modal
        open={modalOpen}
        title="🛡️ Tạo phiếu bảo hành mới"
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Tạo phiếu"
        cancelText="Hủy"
        confirmLoading={saving}
        okButtonProps={{ style: { background: 'linear-gradient(135deg, #22c55e, #10b981)', border: 'none' } }}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="customer_id"
            label="Khách hàng"
            rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}
          >
            <Select
              showSearch
              placeholder="Chọn khách hàng..."
              optionFilterProp="label"
              options={customers}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                name="inventory_id"
                label="Sản phẩm"
                rules={[{ required: true, message: 'Vui lòng chọn sản phẩm' }]}
              >
                <Select
                  showSearch
                  placeholder="Chọn sản phẩm từ kho..."
                  optionFilterProp="label"
                  options={products}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="warranty_months"
                label="Thời hạn bảo hành (tháng)"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={120} style={{ width: '100%' }} addonAfter="tháng" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="serial_number"
            label="Số Serial sản phẩm"
            rules={[{ required: true, message: 'Nhập số serial vật lý của sản phẩm' }]}
          >
            <Input placeholder="VD: SN-ABC123456" style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Form.Item
            name="sales_order_id"
            label="Liên kết đơn bán hàng (tùy chọn)"
          >
            <Select
              showSearch
              allowClear
              placeholder="Chọn đơn hàng liên quan..."
              optionFilterProp="label"
              options={orders}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
