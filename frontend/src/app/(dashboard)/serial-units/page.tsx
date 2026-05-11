// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Typography, Button, Select, Tag, Space, Input, App, Table, Modal, Form, Drawer, Descriptions, Row, Col, Statistic, Card, InputNumber, Upload } from 'antd';
import { PlusOutlined, SearchOutlined, DeleteOutlined, ReloadOutlined, BarcodeOutlined, ImportOutlined, EditOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { SerialUnit, ItemCondition, SerialStatus, InventoryItem, InventoryListResponse } from '@/types';
import { useTheme } from '@/components/ThemeProvider';

const { Title, Text } = Typography;

const conditionLabels: Record<ItemCondition, string> = { new: 'Mới', demo: 'Trưng bày', rma: 'Bảo hành', used: 'Đã sử dụng' };
const conditionColors: Record<ItemCondition, string> = { new: '#22c55e', demo: '#3b82f6', rma: '#f59e0b', used: '#64748b' };
const statusLabels: Record<SerialStatus, string> = { available: 'Có sẵn', sold: 'Đã bán', rma: 'Đang BH', reserved: 'Đã giữ', in_build: 'Trong Build' };
const statusColors: Record<SerialStatus, string> = { available: 'success', sold: 'default', rma: 'warning', reserved: 'processing', in_build: 'purple' };

export default function SerialUnitsPage() {
  const { isDark } = useTheme();
  const { message } = App.useApp();
  const [items, setItems] = useState<SerialUnit[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [condFilter, setCondFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [editUnit, setEditUnit] = useState<SerialUnit | null>(null);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (condFilter) params.condition = condFilter;
      if (statusFilter) params.status = statusFilter;
      const [serialRes, invRes] = await Promise.all([
        api.get('/api/serial-units', { params }),
        api.get<InventoryListResponse>('/api/inventory', { params: { limit: 100 } }),
      ]);
      setItems(serialRes.data.items || []);
      setTotal(serialRes.data.total || 0);
      setInventory(invRes.data.items);
    } finally { setLoading(false); }
  }, [page, search, condFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (editUnit) {
      editForm.setFieldsValue(editUnit);
    }
  }, [editUnit, editForm]);

  const handleAdd = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/api/serial-units', values);
      message.success('Thêm serial thành công');
      setAddOpen(false); form.resetFields(); fetchData();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Lỗi thêm serial'); }
  };

  const handleBulkAdd = async () => {
    const values = await bulkForm.validateFields();
    const serials = values.serial_numbers_text.split(/[\n,;]+/).map((s: string) => s.trim()).filter(Boolean);
    if (serials.length === 0) { message.warning('Nhập ít nhất 1 serial'); return; }
    try {
      const res = await api.post('/api/serial-units/bulk', { ...values, serial_numbers: serials });
      message.success(`Đã nhập ${res.data.created} serial units`);
      setBulkOpen(false); bulkForm.resetFields(); fetchData();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Lỗi nhập hàng loạt'); }
  };

  const handleScan = async () => {
    if (!scanCode.trim()) return;
    try {
      const res = await api.get('/api/serial-units/scan', { params: { code: scanCode } });
      setScanResult(res.data);
    } catch { message.error('Không tìm thấy serial/barcode'); setScanResult(null); }
  };

  const handleEdit = async () => {
    if (!editUnit) return;
    const values = await editForm.validateFields();
    try {
      await api.put(`/api/serial-units/${editUnit.id}`, values);
      message.success('Cập nhật thành công');
      setEditUnit(null); editForm.resetFields(); fetchData();
    } catch { message.error('Lỗi cập nhật'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            <BarcodeOutlined style={{ marginRight: 8 }} />Serial Units
          </Title>
          <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>Quản lý từng linh kiện theo Serial Number ({total} units)</Text>
        </div>
        <Space>
          <Button icon={<BarcodeOutlined />} onClick={() => { setScanOpen(true); setScanResult(null); setScanCode(''); }}>Quét mã</Button>
          <Button icon={<ImportOutlined />} onClick={() => setBulkOpen(true)}>Nhập hàng loạt</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}
            style={{ borderRadius: 12, fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>Thêm Serial</Button>
        </Space>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Input placeholder="Tìm theo Serial Number..." prefix={<SearchOutlined />} value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 300 }} allowClear />
        <Select allowClear placeholder="Tình trạng" value={condFilter || undefined} onChange={v => { setCondFilter(v || ''); setPage(1); }}
          options={[{ value: 'new', label: '🆕 Mới' }, { value: 'demo', label: '🏪 Trưng bày' }, { value: 'rma', label: '🔧 Bảo hành' }, { value: 'used', label: '♻️ Đã sử dụng' }]}
          style={{ width: 160 }} />
        <Select allowClear placeholder="Trạng thái" value={statusFilter || undefined} onChange={v => { setStatusFilter(v || ''); setPage(1); }}
          options={[{ value: 'available', label: 'Có sẵn' }, { value: 'sold', label: 'Đã bán' }, { value: 'rma', label: 'Đang BH' }, { value: 'reserved', label: 'Đã giữ' }, { value: 'in_build', label: 'Trong Build' }]}
          style={{ width: 160 }} />
        <Button icon={<ReloadOutlined />} onClick={() => { setSearch(''); setCondFilter(''); setStatusFilter(''); }}>Làm mới</Button>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`, background: isDark ? 'rgba(30,41,59,0.8)' : '#fff' }}>
        <Table loading={loading} dataSource={items} rowKey="id"
          pagination={{ current: page, total, pageSize: 20, onChange: p => setPage(p), showSizeChanger: false }}
          columns={[
            { title: 'Serial Number', dataIndex: 'serial_number', width: 180, render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{v}</span> },
            { title: 'Sản phẩm', dataIndex: 'product_name', ellipsis: true, render: (v: string, r: SerialUnit) => <div><div style={{ fontWeight: 600 }}>{v || '—'}</div><Text type="secondary" style={{ fontSize: 11 }}>{r.sku_code}</Text></div> },
            { title: 'Danh mục', dataIndex: 'category', width: 100, render: (v: string) => <Tag>{v}</Tag> },
            { title: 'Tình trạng', dataIndex: 'condition', width: 120, render: (v: ItemCondition) => <Tag color={conditionColors[v]}>{conditionLabels[v]}</Tag> },
            { title: 'Trạng thái', dataIndex: 'status', width: 120, render: (v: SerialStatus) => <Tag color={statusColors[v]}>{statusLabels[v]}</Tag> },
            { title: 'Kho', dataIndex: 'warehouse_name', width: 140, render: (v: string) => v || <Text type="secondary">—</Text> },
            { title: 'Vị trí', dataIndex: 'location_code', width: 100, render: (v: string) => v ? <Tag>{v}</Tag> : '—' },
            { title: '', width: 60, render: (_: unknown, r: SerialUnit) => <Button size="small" icon={<EditOutlined />} onClick={() => setEditUnit(r)} /> },
          ]}
        />
      </div>

      {/* Add Single Modal */}
      <Modal open={addOpen} onCancel={() => setAddOpen(false)} onOk={handleAdd}
        title="Thêm Serial Unit" okText="Thêm" cancelText="Hủy" destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={{ condition: 'new' }}>
          <Form.Item name="serial_number" label="Serial Number" rules={[{ required: true }]}><Input placeholder="Nhập hoặc quét serial" /></Form.Item>
          <Form.Item name="inventory_id" label="Sản phẩm (SPU)" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={inventory.map(i => ({ value: i.id, label: `${i.sku_code} — ${i.name}` }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="condition" label="Tình trạng">
                <Select options={[{ value: 'new', label: 'Mới' }, { value: 'demo', label: 'Trưng bày' }, { value: 'rma', label: 'Bảo hành' }, { value: 'used', label: 'Đã sử dụng' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location_code" label="Vị trí"><Input placeholder="VD: A1-01" /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={bulkOpen} onCancel={() => setBulkOpen(false)} onOk={handleBulkAdd}
        title="📦 Nhập Serial hàng loạt" okText="Nhập" cancelText="Hủy" destroyOnHidden>
        <Form form={bulkForm} layout="vertical" initialValues={{ condition: 'new' }}>
          <Form.Item name="inventory_id" label="Sản phẩm (SPU)" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={inventory.map(i => ({ value: i.id, label: `${i.sku_code} — ${i.name}` }))} />
          </Form.Item>
          <Form.Item name="serial_numbers_text" label="Danh sách Serial (mỗi dòng 1 serial)" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder={"SN-001\nSN-002\nSN-003"} />
          </Form.Item>
          <Form.Item name="condition" label="Tình trạng">
            <Select options={[{ value: 'new', label: 'Mới' }, { value: 'demo', label: 'Trưng bày' }, { value: 'used', label: 'Đã sử dụng' }]} />
          </Form.Item>
          <Form.Item name="location_code" label="Vị trí"><Input placeholder="VD: A1-01" /></Form.Item>
        </Form>
      </Modal>

      {/* Scan Modal */}
      <Modal open={scanOpen} onCancel={() => setScanOpen(false)} title="🔍 Quét mã Serial / Barcode" footer={null} destroyOnHidden>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input placeholder="Quét hoặc nhập mã..." value={scanCode} onChange={e => setScanCode(e.target.value)}
            onPressEnter={handleScan} autoFocus style={{ borderRadius: 10 }} />
          <Button type="primary" onClick={handleScan}>Tra cứu</Button>
        </div>
        {scanResult && (
          <Card style={{ borderRadius: 12 }}>
            {scanResult.found === 'serial_unit' && (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Serial">{scanResult.data.serial_number}</Descriptions.Item>
                <Descriptions.Item label="Sản phẩm">{scanResult.data.product_name}</Descriptions.Item>
                <Descriptions.Item label="Tình trạng"><Tag color={conditionColors[scanResult.data.condition as ItemCondition]}>{conditionLabels[scanResult.data.condition as ItemCondition]}</Tag></Descriptions.Item>
                <Descriptions.Item label="Trạng thái"><Tag color={statusColors[scanResult.data.status as SerialStatus]}>{statusLabels[scanResult.data.status as SerialStatus]}</Tag></Descriptions.Item>
                <Descriptions.Item label="Kho">{scanResult.data.warehouse_name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Vị trí">{scanResult.data.location_code || '—'}</Descriptions.Item>
              </Descriptions>
            )}
            {scanResult.found === 'inventory' && (
              <div>
                <Text strong>Tìm thấy trong Inventory:</Text>
                <div>{scanResult.name}</div>
              </div>
            )}
          </Card>
        )}
      </Modal>

      {/* Edit Unit Drawer */}
      <Drawer open={!!editUnit} onClose={() => { setEditUnit(null); editForm.resetFields(); }} title={`Sửa ${editUnit?.serial_number || ''}`}
        destroyOnHidden extra={<Button type="primary" onClick={handleEdit}>Lưu</Button>}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="condition" label="Tình trạng">
            <Select options={[{ value: 'new', label: 'Mới' }, { value: 'demo', label: 'Trưng bày' }, { value: 'rma', label: 'Bảo hành' }, { value: 'used', label: 'Đã sử dụng' }]} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={[{ value: 'available', label: 'Có sẵn' }, { value: 'sold', label: 'Đã bán' }, { value: 'rma', label: 'Đang BH' }, { value: 'reserved', label: 'Đã giữ' }]} />
          </Form.Item>
          <Form.Item name="location_code" label="Vị trí"><Input /></Form.Item>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}

