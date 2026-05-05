// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Drawer, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import api from '@/lib/api';
import { InventoryItem, InventoryListResponse } from '@/types';

type SalesOrder = {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  items: { inventory_id: string; name?: string; quantity: number; unit_price: number; discount?: number }[];
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
};

type CustomerOption = { value: string; label: string };

export default function SalesPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { Title, Text, Paragraph } = Typography;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, invRes, custRes] = await Promise.all([
        api.get('/api/sales', { params: { limit: 100, ...(selectedStatus ? { status: selectedStatus } : {}) } }),
        api.get<InventoryListResponse>('/api/inventory', { params: { limit: 100 } }),
        api.get('/api/customers', { params: { limit: 100 } }),
      ]);
      setOrders(ordersRes.data.orders || []);
      setInventory(invRes.data.items);
      setCustomers((custRes.data.customers || []).map((c: any) => ({ value: c.id, label: `${c.name} - ${c.phone}` })));
    } catch {
      message.error('Không tải được dữ liệu sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedStatus]);

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + o.total_amount, 0), [orders]);

  const submit = async () => {
    const values = await form.validateFields();
    const payload = {
      customer_id: values.customer_id,
      customer_name: values.customer_name,
      customer_phone: values.customer_phone,
      items: values.items,
      discount_total: values.discount_total || 0,
      payment_method: values.payment_method,
      notes: values.notes || '',
    };
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
  };

  return (
    <div>
      <Title level={2}>Sales</Title>
      <Paragraph type="secondary">Đơn bán hàng thực tế lấy từ backend, có form tạo/sửa.</Paragraph>
      <Space style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="Lọc trạng thái" value={selectedStatus || undefined} onChange={(v) => setSelectedStatus(v || '')} options={[{ value: 'draft', label: 'Draft' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'delivered', label: 'Delivered' }, { value: 'cancelled', label: 'Cancelled' }]} style={{ width: 220 }} />
        <Button onClick={fetchData}>Làm mới</Button>
        <Button type="primary" onClick={() => setCreateOpen(true)}>Tạo đơn</Button>
      </Space>
      <Card style={{ marginBottom: 16 }}>
        <Text strong>Doanh thu: </Text><Text>{totalRevenue.toLocaleString('vi-VN')} ₫</Text>
      </Card>
      <Table
        loading={loading}
        rowKey="id"
        dataSource={orders}
        columns={[
          { title: 'Invoice', dataIndex: 'invoice_number' },
          { title: 'Khách', dataIndex: 'customer_name' },
          { title: 'SĐT', dataIndex: 'customer_phone' },
          { title: 'Tổng tiền', dataIndex: 'total_amount', render: (v: number) => `${v.toLocaleString('vi-VN')} ₫` },
          { title: 'Thanh toán', dataIndex: 'payment_method', render: (v: string) => <Tag>{v}</Tag> },
          { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag color={v === 'confirmed' ? 'green' : v === 'draft' ? 'gold' : 'red'}>{v}</Tag> },
          { title: 'Thao tác', render: (_, record: SalesOrder) => <Button size="small" onClick={() => { setEditOrder(record); form.setFieldsValue(record); setCreateOpen(true); }}>Sửa</Button> },
        ]}
      />

      <Drawer open={createOpen} onClose={() => { setCreateOpen(false); setEditOrder(null); form.resetFields(); }} title={editOrder ? 'Sửa đơn bán' : 'Tạo đơn bán'} size="large" extra={<Button type="primary" onClick={submit}>{editOrder ? 'Lưu' : 'Tạo'}</Button>} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ payment_method: 'cash', items: [{ inventory_id: undefined, name: '', quantity: 1, unit_price: 0, discount: 0 }] }}>
          <Form.Item name="customer_id" label="Khách hàng">
            <Select allowClear options={customers} placeholder="Chọn khách hàng" />
          </Form.Item>
          <Form.Item name="customer_name" label="Tên khách hàng" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="customer_phone" label="SĐT" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="payment_method" label="Phương thức thanh toán"><Select options={[{ value: 'cash', label: 'Cash' }, { value: 'transfer', label: 'Transfer' }, { value: 'card', label: 'Card' }]} /></Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div>
                {fields.map((field) => (
                  <Card size="small" key={field.key} style={{ marginBottom: 12 }}>
                    <Form.Item {...field} name={[field.name, 'inventory_id']} label="Linh kiện" rules={[{ required: true }]}>
                      <Select options={inventory.map((i) => ({ value: i.id, label: `${i.name} (${i.unit_price.toLocaleString('vi-VN')} ₫)` }))} />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <Form.Item {...field} name={[field.name, 'quantity']} label="SL" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'unit_price']} label="Giá bán" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'discount']} label="Giảm giá"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                    </div>
                    <Button danger onClick={() => remove(field.name)}>Xóa dòng</Button>
                  </Card>
                ))}
                <Button onClick={() => add({ inventory_id: undefined, quantity: 1, unit_price: 0, discount: 0 })}>Thêm dòng</Button>
              </div>
            )}
          </Form.List>
          <Form.Item name="discount_total" label="Giảm giá tổng"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Drawer>

      <Card title="Gợi ý bán hàng" style={{ marginTop: 20 }}>
        <Text type="secondary">Tồn kho sẵn có: {inventory.length} sản phẩm để chọn khi tạo đơn.</Text>
      </Card>
    </div>
  );
}

