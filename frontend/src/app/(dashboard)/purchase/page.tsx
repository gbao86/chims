'use client';

import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Drawer, Form, Input, InputNumber, Select, Space, Table, Tag, Typography } from 'antd';
import api from '@/lib/api';

type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id?: string;
  supplier_name: string;
  items: { inventory_id: string; name?: string; quantity: number; unit_cost: number }[];
  total_amount: number;
  status: string;
  created_at: string;
};

type SupplierOption = { value: string; label: string };

export default function PurchasePage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { Title, Text, Paragraph } = Typography;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [ordersRes, suppliersRes] = await Promise.all([
        api.get('/api/purchase-orders', { params: { limit: 100, ...(status ? { status } : {}) } }),
        api.get('/api/suppliers', { params: { limit: 100 } }),
      ]);
      setOrders(ordersRes.data.orders || []);
      setSuppliers((suppliersRes.data.suppliers || []).map((s: any) => ({ value: s.id, label: `${s.name} (${s.code})` })));
    } catch {
      message.error('Không tải được phiếu nhập');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [status]);
  const totalValue = useMemo(() => orders.reduce((s, o) => s + o.total_amount, 0), [orders]);

  const submit = async () => {
    const values = await form.validateFields();
    const payload = { supplier_id: values.supplier_id, items: values.items, notes: values.notes || '' };
    if (editOrder) {
      await api.put(`/api/purchase-orders/${editOrder.id}`, payload);
      message.success('Cập nhật phiếu nhập thành công');
    } else {
      await api.post('/api/purchase-orders', payload);
      message.success('Tạo phiếu nhập thành công');
    }
    setOpen(false);
    setEditOrder(null);
    form.resetFields();
    fetchOrders();
  };

  return (
    <div>
      <Title level={2}>Purchase / Import</Title>
      <Paragraph type="secondary">Theo dõi đơn nhập hàng từ nhà cung cấp, có form tạo/sửa.</Paragraph>
      <Space style={{ marginBottom: 16 }}>
        <Select allowClear value={status || undefined} onChange={(v) => setStatus(v || '')} placeholder="Lọc trạng thái" style={{ width: 220 }} options={[{ value: 'draft', label: 'Draft' }, { value: 'approved', label: 'Approved' }, { value: 'received', label: 'Received' }, { value: 'cancelled', label: 'Cancelled' }]} />
        <Button onClick={fetchOrders}>Làm mới</Button>
        <Button type="primary" onClick={() => setOpen(true)}>Tạo phiếu</Button>
      </Space>
      <Card style={{ marginBottom: 16 }}><Text strong>Tổng giá trị nhập: </Text><Text>{totalValue.toLocaleString('vi-VN')} ₫</Text></Card>
      <Table
        loading={loading}
        rowKey="id"
        dataSource={orders}
        columns={[
          { title: 'PO', dataIndex: 'po_number' },
          { title: 'Nhà cung cấp', dataIndex: 'supplier_name' },
          { title: 'Tổng tiền', dataIndex: 'total_amount', render: (v: number) => `${v.toLocaleString('vi-VN')} ₫` },
          { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag color={v === 'received' ? 'green' : 'gold'}>{v}</Tag> },
          { title: 'Thao tác', render: (_, record: PurchaseOrder) => <Button size="small" onClick={() => { setEditOrder(record); form.setFieldsValue(record); setOpen(true); }}>Sửa</Button> },
        ]}
      />

      <Drawer open={open} onClose={() => { setOpen(false); setEditOrder(null); form.resetFields(); }} title={editOrder ? 'Sửa phiếu nhập' : 'Tạo phiếu nhập'} size="large" extra={<Button type="primary" onClick={submit}>{editOrder ? 'Lưu' : 'Tạo'}</Button>} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ items: [{ inventory_id: undefined, quantity: 1, unit_cost: 0 }] }}>
          <Form.Item name="supplier_id" label="Nhà cung cấp" rules={[{ required: true }]}><Select options={suppliers} placeholder="Chọn NCC" /></Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div>
                {fields.map((field) => (
                  <Card size="small" key={field.key} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px', gap: 12 }}>
                      <Form.Item {...field} name={[field.name, 'inventory_id']} label="Mã hàng" rules={[{ required: true }]}><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'quantity']} label="SL" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'unit_cost']} label="Đơn giá" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                    </div>
                    <Button danger onClick={() => remove(field.name)}>Xóa dòng</Button>
                  </Card>
                ))}
                <Button onClick={() => add({ inventory_id: '', quantity: 1, unit_cost: 0 })}>Thêm dòng</Button>
              </div>
            )}
          </Form.List>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
