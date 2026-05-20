// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Col, Divider, Drawer, Form, Input,
  InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tag, Typography,
} from 'antd';
import {
  CameraOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, ShoppingCartOutlined,
} from '@ant-design/icons';
import CameraScanner from '@/components/serial-units/CameraScanner';
import api from '@/lib/api';
import { InventoryItem, InventoryListResponse } from '@/types';
import { useTheme } from '@/components/ThemeProvider';

type SalesOrder = {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  items: { inventory_id: string; name?: string; quantity: number; unit_price: number; discount?: number }[];
  subtotal: number;
  item_discounts_total: number;
  discount_total: number;
  total_amount: number;
  status: string;
  payment_method: string;
  notes: string;
  created_at: string;
};

type CustomerOption = { value: string; label: string };

const { Title, Text } = Typography;

const statusColor: Record<string, string> = {
  draft: 'gold',
  confirmed: 'green',
  delivered: 'blue',
  cancelled: 'red',
};
const statusLabel: Record<string, string> = {
  draft: 'Nháp',
  confirmed: 'Đã xác nhận',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};
const paymentLabel: Record<string, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  card: 'Thẻ',
};

// State machine: các trạng thái được phép chuyển tới từ mỗi trạng thái hiện tại
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'delivered', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: ['cancelled'],
  cancelled: [], // locked
};

const ALL_STATUS_OPTIONS = [
  { value: 'draft', label: <Tag color="gold">Nháp</Tag>, text: 'Nháp' },
  { value: 'confirmed', label: <Tag color="green">Đã xác nhận</Tag>, text: 'Đã xác nhận' },
  { value: 'delivered', label: <Tag color="blue">Đã giao</Tag>, text: 'Đã giao' },
  { value: 'cancelled', label: <Tag color="red">Đã hủy</Tag>, text: 'Đã hủy' },
];

export default function SalesPage() {
  const { isDark } = useTheme();
  const { message } = App.useApp();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Camera scanner state (for sales form)
  const [scannerOpen, setScannerOpen]   = useState(false);
  const [scanFieldIdx, setScanFieldIdx] = useState<number>(0);

  // Live preview
  const formItems = Form.useWatch('items', form) || [];
  const formDiscountTotal = Form.useWatch('discount_total', form) || 0;

  const liveSubtotal = useMemo(() =>
    formItems.reduce((sum: number, item: any) =>
      sum + (item?.unit_price || 0) * (item?.quantity || 0), 0),
    [formItems]);

  const liveItemDiscounts = useMemo(() =>
    formItems.reduce((sum: number, item: any) => sum + (item?.discount || 0), 0),
    [formItems]);

  const liveTotal = useMemo(() =>
    Math.max(liveSubtotal - liveItemDiscounts - (formDiscountTotal || 0), 0),
    [liveSubtotal, liveItemDiscounts, formDiscountTotal]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, invRes, custRes] = await Promise.all([
        api.get('/api/sales', { params: { limit: 100, ...(selectedStatus ? { status: selectedStatus } : {}) } }),
        api.get<InventoryListResponse>('/api/inventory', { params: { limit: 100 } }),
        api.get('/api/customers', { params: { limit: 100 } }),
      ]);
      setOrders(ordersRes.data.orders || []);
      setInventory(invRes.data.items);
      setCustomers((custRes.data.customers || []).map((c: any) => ({ value: c.id, label: `${c.name} — ${c.phone}` })));
    } catch {
      message.error('Không tải được dữ liệu bán hàng');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditOrder(null);
    form.resetFields();
    form.setFieldsValue({
      payment_method: 'cash',
      items: [{ inventory_id: undefined, quantity: 1, unit_price: 0, discount: 0 }],
    });
    setCreateOpen(true);
  };

  const openEdit = (record: SalesOrder) => {
    setEditOrder(record);
    form.setFieldsValue({
      customer_id: record.customer_id,
      customer_name: record.customer_name,
      customer_phone: record.customer_phone,
      payment_method: record.payment_method,
      discount_total: record.discount_total,
      notes: record.notes,
      items: record.items.map(i => ({
        inventory_id: i.inventory_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount || 0,
      })),
    });
    setCreateOpen(true);
  };

  const handleSelectCustomer = (customerId: string) => {
    const found = customers.find(c => c.value === customerId);
    if (found) {
      const parts = found.label.split(' — ');
      form.setFieldValue('customer_name', parts[0] || '');
      form.setFieldValue('customer_phone', parts[1] || '');
    }
  };

  const handleSelectInventory = (inventoryId: string, fieldName: number) => {
    const item = inventory.find(i => i.id === inventoryId);
    if (item) {
      form.setFieldValue(['items', fieldName, 'unit_price'], item.unit_price);
    }
  };

  // ── Camera scan handler for Sales form ──────────────────────────────────
  const handleScanDetected = useCallback((code: string) => {
    setScannerOpen(false);
    const c = code.trim().toLowerCase();
    // Match by barcode field first, then sku_code, then name substring
    const matched = inventory.find(i =>
      (i.barcode && i.barcode.toLowerCase() === c) ||
      i.sku_code.toLowerCase() === c ||
      i.name.toLowerCase().includes(c)
    );
    if (matched) {
      form.setFieldValue(['items', scanFieldIdx, 'inventory_id'], matched.id);
      form.setFieldValue(['items', scanFieldIdx, 'unit_price'], matched.unit_price);
      message.success(`✅ Tìm thấy: ${matched.name} — ${matched.unit_price.toLocaleString('vi-VN')} ₫`);
    } else {
      message.warning(`Không tìm thấy sản phẩm khớp mã: "${code}"`);
    }
  }, [inventory, scanFieldIdx, form, message]);

  const submit = async () => {
    let values;
    try { values = await form.validateFields(); }
    catch { return; }

    const payload = {
      customer_id: values.customer_id || null,
      customer_name: values.customer_name,
      customer_phone: values.customer_phone,
      items: values.items,
      discount_total: values.discount_total || 0,
      payment_method: values.payment_method,
      notes: values.notes || '',
    };
    setSaving(true);
    try {
      if (editOrder) {
        await api.put(`/api/sales/${editOrder.id}`, payload);
        message.success('Cập nhật đơn hàng thành công');
      } else {
        await api.post('/api/sales', payload);
        message.success('Tạo đơn hàng thành công');
      }
      setCreateOpen(false);
      setEditOrder(null);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : 'Lỗi lưu đơn hàng — vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      await api.delete(`/api/sales/${orderId}`);
      message.success('Đã xóa đơn hàng');
      fetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Lỗi xóa đơn hàng');
    }
  };

  const handleStatusChange = (orderId: string, currentStatus: string, newStatus: string) => {
    Modal.confirm({
      title: 'Xác nhận thay đổi trạng thái',
      content: (
        <span>
          Chuyển trạng thái từ{' '}
          <Tag color={statusColor[currentStatus]}>{statusLabel[currentStatus]}</Tag>
          {' '}→{' '}
          <Tag color={statusColor[newStatus]}>{statusLabel[newStatus]}</Tag>?
        </span>
      ),
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      okButtonProps: { style: { background: '#6366f1', borderColor: '#6366f1' } },
      async onOk() {
        try {
          await api.put(`/api/sales/${orderId}/status`, { status: newStatus });
          message.success(`Đã cập nhật trạng thái → ${statusLabel[newStatus]}`);
          fetchData();
        } catch (err: any) {
          message.error(err?.response?.data?.detail || 'Lỗi cập nhật trạng thái');
        }
      },
    });
  };

  const totalRevenue = useMemo(() =>
    orders.filter(o => o.status === 'confirmed' || o.status === 'delivered')
      .reduce((s, o) => s + o.total_amount, 0),
    [orders]);

  const confirmedCount = useMemo(() => orders.filter(o => o.status === 'confirmed' || o.status === 'delivered').length, [orders]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            <ShoppingCartOutlined style={{ marginRight: 8 }} />Quản lý Bán hàng
          </Title>
          <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>
            Tạo và quản lý đơn bán hàng, theo dõi doanh thu theo trạng thái
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
          <Button
            type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ borderRadius: 12, fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}
          >
            Tạo đơn hàng
          </Button>
        </Space>
      </div>

      {/* KPI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, background: isDark ? 'rgba(99,102,241,0.08)' : 'linear-gradient(135deg, #f0f0ff, #e8e8ff)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <Statistic title="Tổng đơn hàng" value={orders.length} suffix="đơn"
              styles={{ content: { color: '#6366f1', fontWeight: 800 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, background: isDark ? 'rgba(34,197,94,0.08)' : 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <Statistic title="Doanh thu (đã xác nhận)" value={totalRevenue}
              formatter={(v) => `${Number(v).toLocaleString('vi-VN')} ₫`}
              styles={{ content: { color: '#22c55e', fontWeight: 800 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, background: isDark ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <Statistic title="Đơn thành công" value={confirmedCount} suffix="đơn"
              styles={{ content: { color: '#f59e0b', fontWeight: 800 } }} />
          </Card>
        </Col>
      </Row>

      {/* Filter */}
      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear placeholder="Lọc trạng thái" value={selectedStatus || undefined}
          onChange={(v) => setSelectedStatus(v || '')}
          options={[
            { value: 'draft', label: 'Nháp' },
            { value: 'confirmed', label: 'Đã xác nhận' },
            { value: 'delivered', label: 'Đã giao' },
            { value: 'cancelled', label: 'Đã hủy' },
          ]}
          style={{ width: 200 }}
        />
      </Space>

      {/* Table */}
      <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`, background: isDark ? 'rgba(30,41,59,0.8)' : '#fff' }}>
        <Table
          loading={loading} rowKey="id" dataSource={orders}
          pagination={{ pageSize: 20, showTotal: (t) => `Tổng ${t} đơn hàng` }}
          columns={[
            {
              title: 'Số HĐ', dataIndex: 'invoice_number', width: 120,
              render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{v}</span>,
            },
            {
              title: 'Khách hàng', dataIndex: 'customer_name',
              render: (v: string, r: SalesOrder) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{v || '—'}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{r.customer_phone}</Text>
                </div>
              ),
            },
            {
              title: 'Tạm tính', dataIndex: 'subtotal', width: 140, align: 'right' as const,
              render: (v: number) => v ? `${v.toLocaleString('vi-VN')} ₫` : '—',
            },
            {
              title: 'Giảm giá', width: 120, align: 'right' as const,
              render: (_: unknown, r: SalesOrder) => {
                const disc = (r.item_discounts_total || 0) + (r.discount_total || 0);
                return disc > 0
                  ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>-{disc.toLocaleString('vi-VN')} ₫</span>
                  : <Text type="secondary">—</Text>;
              },
            },
            {
              title: 'Thành tiền', dataIndex: 'total_amount', width: 150, align: 'right' as const,
              render: (v: number) => <span style={{ fontWeight: 700, color: '#22c55e' }}>{v.toLocaleString('vi-VN')} ₫</span>,
            },
            {
              title: 'Thanh toán', dataIndex: 'payment_method', width: 130,
              render: (v: string) => <Tag>{paymentLabel[v] || v}</Tag>,
            },
            {
              title: 'Trạng thái', dataIndex: 'status', width: 170,
              render: (v: string, r: SalesOrder) => {
                const allowed = ALLOWED_TRANSITIONS[v] || [];
                const isLocked = allowed.length === 0;
                const options = ALL_STATUS_OPTIONS.filter(
                  opt => opt.value === v || allowed.includes(opt.value)
                );
                return (
                  <Select
                    size="small" value={v}
                    disabled={isLocked}
                    onChange={(newStatus) => handleStatusChange(r.id, v, newStatus)}
                    style={{ width: 155 }}
                    title={isLocked ? 'Đơn hàng đã hủy không thể thay đổi trạng thái' : undefined}
                    options={options}
                  />
                );
              },
            },
            {
              title: 'Hành động', width: 120, align: 'center' as const,
              render: (_: unknown, record: SalesOrder) => (
                <Space>
                  <Button
                    size="small"
                    disabled={record.status !== 'draft'}
                    onClick={() => openEdit(record)}
                  >
                    Sửa
                  </Button>
                  <Popconfirm
                    title="Xóa đơn hàng?"
                    description="Chỉ xóa được đơn ở trạng thái Nháp. Thao tác không thể hoàn tác."
                    onConfirm={() => handleDelete(record.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    disabled={record.status !== 'draft'}
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={record.status !== 'draft'}
                    />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </div>

      {/* Create/Edit Drawer */}
      <Drawer
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditOrder(null); form.resetFields(); }}
        title={editOrder ? '✏️ Sửa đơn bán hàng' : '🛒 Tạo đơn bán hàng mới'}
        size="large"
        extra={
          <Button type="primary" loading={saving} onClick={submit}
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>
            {editOrder ? 'Lưu thay đổi' : 'Tạo đơn'}
          </Button>
        }
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          {/* Customer section */}
          <Card size="small" title="Thông tin khách hàng" style={{ borderRadius: 12, marginBottom: 16 }}>
            <Form.Item name="customer_id" label="Chọn khách hàng có sẵn">
              <Select
                allowClear showSearch optionFilterProp="label"
                options={customers} placeholder="Tìm và chọn khách hàng (tuỳ chọn)"
                onChange={handleSelectCustomer}
              />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="customer_name" label="Tên khách hàng" rules={[{ required: true, message: 'Nhập tên khách' }]}>
                  <Input placeholder="Nhập tên khách hàng" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="customer_phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập SĐT' }]}>
                  <Input placeholder="Nhập số điện thoại" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Items section */}
          <Card size="small" title="Sản phẩm / Linh kiện" style={{ borderRadius: 12, marginBottom: 16 }}>
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <div>
                  {fields.map((field) => (
                    <Card size="small" key={field.key}
                      style={{ marginBottom: 12, borderRadius: 8, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                      <Form.Item {...field} name={[field.name, 'inventory_id']} label={
                        <Space size={4}>
                          <span>Linh kiện</span>
                          <Button
                            size="small" type="dashed" icon={<CameraOutlined />}
                            style={{ fontSize: 11, height: 20, padding: '0 6px', color: '#6366f1', borderColor: '#6366f1' }}
                            onClick={() => { setScanFieldIdx(field.name); setScannerOpen(true); }}
                          >
                            Quét mã
                          </Button>
                        </Space>
                      } rules={[{ required: true, message: 'Chọn sản phẩm' }]}>
                        <Select
                          showSearch optionFilterProp="label"
                          options={inventory.map((i) => ({
                            value: i.id,
                            label: `${i.name} — ${i.unit_price.toLocaleString('vi-VN')} ₫ (Tồn: ${i.stock_quantity})`,
                          }))}
                          placeholder="Chọn sản phẩm hoặc nhấn Quét mã"
                          onChange={(val) => handleSelectInventory(val, field.name)}
                        />
                      </Form.Item>
                      <Row gutter={12}>
                        <Col span={8}>
                          <Form.Item {...field} name={[field.name, 'quantity']} label="Số lượng" rules={[{ required: true }]}>
                            <InputNumber min={1} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item {...field} name={[field.name, 'unit_price']} label="Giá bán / đơn vị (₫)" rules={[{ required: true }]}>
                            <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            {...field} name={[field.name, 'discount']}
                            label="Giảm giá dòng này (₫)"
                            tooltip="Tổng số tiền giảm cho toàn bộ dòng này. VD: mua 2 cái giảm 300k/cái → nhập 600,000"
                          >
                            <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                          </Form.Item>
                        </Col>
                      </Row>
                      {fields.length > 1 && (
                        <Button danger size="small" onClick={() => remove(field.name)}>Xóa dòng</Button>
                      )}
                    </Card>
                  ))}
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => add({ inventory_id: undefined, quantity: 1, unit_price: 0, discount: 0 })}
                  >
                    Thêm sản phẩm
                  </Button>
                </div>
              )}
            </Form.List>
          </Card>

          {/* Payment section */}
          <Card size="small" title="Thanh toán & Giảm giá" style={{ borderRadius: 12, marginBottom: 16 }}>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="payment_method" label="Phương thức thanh toán">
                  <Select options={[
                    { value: 'cash', label: 'Tiền mặt' },
                    { value: 'transfer', label: 'Chuyển khoản' },
                    { value: 'card', label: 'Thẻ' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="discount_total"
                  label="Giảm giá thêm toàn đơn (₫)"
                  tooltip="Voucher, ưu đãi thành viên... áp dụng cho cả đơn hàng, tính thêm ngoài giảm giá từng dòng."
                >
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="0"
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú">
              <Input.TextArea rows={2} placeholder="Ghi chú đơn hàng (tuỳ chọn)" />
            </Form.Item>
          </Card>

          {/* Live total preview */}
          <Alert
            type="info"
            style={{ borderRadius: 12 }}
            message={
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text>Tạm tính:</Text>
                  <Text strong>{liveSubtotal.toLocaleString('vi-VN')} ₫</Text>
                </div>
                {liveItemDiscounts > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text>Giảm giá từng dòng:</Text>
                    <Text style={{ color: '#f59e0b' }}>-{liveItemDiscounts.toLocaleString('vi-VN')} ₫</Text>
                  </div>
                )}
                {formDiscountTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text>Giảm giá thêm toàn đơn:</Text>
                    <Text style={{ color: '#f59e0b' }}>-{Number(formDiscountTotal).toLocaleString('vi-VN')} ₫</Text>
                  </div>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong style={{ fontSize: 16 }}>Thành tiền:</Text>
                  <Text strong style={{ fontSize: 18, color: '#22c55e' }}>
                    {liveTotal.toLocaleString('vi-VN')} ₫
                  </Text>
                </div>
              </div>
            }
          />
        </Form>
      </Drawer>

      {/* ── Camera Scanner for Sales ── */}
      <CameraScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleScanDetected}
        title="Quét mã sản phẩm"
      />
    </div>
  );
}
