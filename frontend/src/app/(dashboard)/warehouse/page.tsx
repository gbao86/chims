// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Typography, Button, Select, Card, Tag, Space, Input, App, Table, Popconfirm, Modal, Form, InputNumber, Drawer, Descriptions, Statistic, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, DeleteOutlined, ReloadOutlined, HomeOutlined, SwapOutlined, EnvironmentOutlined, EditOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { Warehouse, WarehouseType } from '@/types';
import { useTheme } from '@/components/ThemeProvider';

const { Title, Text } = Typography;

const typeLabels: Record<WarehouseType, string> = { main: 'Kho chính', branch: 'Chi nhánh', display: 'Trưng bày' };
const typeColors: Record<WarehouseType, string> = { main: '#6366f1', branch: '#22c55e', display: '#f59e0b' };

interface StockItem { warehouse_id: string; warehouse_name: string; available_count: number; }
interface WHLocation { id: string; warehouse_id: string; location_code: string; zone: string; capacity: number; current_count: number; description: string; }

export default function WarehousePage() {
  const { isDark } = useTheme();
  const { message } = App.useApp();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editWH, setEditWH] = useState<Warehouse | null>(null);
  const [detailWH, setDetailWH] = useState<Warehouse | null>(null);
  const [locations, setLocations] = useState<WHLocation[]>([]);
  const [stockDetail, setStockDetail] = useState<any[]>([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [form] = Form.useForm();
  const [transferForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [whRes, brRes] = await Promise.all([
        api.get('/api/warehouses'),
        api.get('/api/warehouses/stock-by-branch'),
      ]);
      setWarehouses(whRes.data.warehouses || []);
      setBranches(brRes.data.branches || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editWH) {
        await api.put(`/api/warehouses/${editWH.id}`, values);
        message.success('Cập nhật kho thành công');
      } else {
        await api.post('/api/warehouses', values);
        message.success('Tạo kho thành công');
      }
      setModalOpen(false); setEditWH(null); fetchData();
    } catch { message.error('Lỗi lưu kho'); }
  };

  useEffect(() => {
    if (modalOpen) {
      if (editWH) form.setFieldsValue(editWH);
      else form.resetFields();
    }
  }, [modalOpen, editWH, form]);

  const handleDelete = async (id: string) => {
    try { await api.delete(`/api/warehouses/${id}`); message.success('Đã xóa'); fetchData(); }
    catch (e: any) { message.error(e.response?.data?.detail || 'Lỗi xóa'); }
  };

  const openDetail = async (wh: Warehouse) => {
    setDetailWH(wh);
    try {
      const [locRes, stockRes] = await Promise.all([
        api.get(`/api/warehouses/${wh.id}/locations`),
        api.get(`/api/warehouses/${wh.id}/stock`),
      ]);
      setLocations(locRes.data.locations || []);
      setStockDetail(stockRes.data.stock || []);
    } catch { /* ok */ }
  };

  const handleTransfer = async () => {
    const values = await transferForm.validateFields();
    try {
      await api.post('/api/warehouses/transfer', values);
      message.success('Chuyển kho thành công');
      setTransferOpen(false); transferForm.resetFields(); fetchData();
    } catch { message.error('Lỗi chuyển kho'); }
  };

  const totalItems = warehouses.reduce((s, w) => s + w.total_items, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            <HomeOutlined style={{ marginRight: 8 }} />Quản lý Kho
          </Title>
          <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>Quản lý kho hàng, vị trí lưu trữ và chuyển kho giữa các chi nhánh</Text>
        </div>
        <Space>
          <Button icon={<SwapOutlined />} onClick={() => setTransferOpen(true)}>Chuyển kho</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditWH(null); setModalOpen(true); }}
            style={{ borderRadius: 12, fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>Thêm kho</Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, background: isDark ? 'rgba(99,102,241,0.08)' : 'linear-gradient(135deg, #f0f0ff, #e8e8ff)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <Statistic title="Tổng số kho" value={warehouses.length} suffix="kho" styles={{ content: { color: '#6366f1', fontWeight: 800 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, background: isDark ? 'rgba(34,197,94,0.08)' : 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <Statistic title="Tổng sản phẩm" value={totalItems} suffix="units" styles={{ content: { color: '#22c55e', fontWeight: 800 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 16, background: isDark ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <Statistic title="Chi nhánh hoạt động" value={branches.length} suffix="nhánh" styles={{ content: { color: '#f59e0b', fontWeight: 800 } }} />
          </Card>
        </Col>
      </Row>

      {/* Stock by branch */}
      {branches.length > 0 && (
        <Card title="📊 Tồn kho theo chi nhánh" style={{ borderRadius: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {branches.map((b, i) => (
              <Card key={i} size="small" style={{ borderRadius: 12, minWidth: 180, textAlign: 'center', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.warehouse_name}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>{b.available_count}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>sản phẩm có sẵn</Text>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Warehouses table */}
      <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`, background: isDark ? 'rgba(30,41,59,0.8)' : '#fff' }}>
        <Table loading={loading} dataSource={warehouses} rowKey="id" pagination={false}
          columns={[
            { title: 'Mã kho', dataIndex: 'code', width: 100, render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{v}</span> },
            { title: 'Tên kho', dataIndex: 'name', render: (v: string, r: Warehouse) => <div><div style={{ fontWeight: 600 }}>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.address}</Text></div> },
            { title: 'Loại', dataIndex: 'type', width: 120, render: (v: WarehouseType) => <Tag color={typeColors[v]}>{typeLabels[v]}</Tag> },
            { title: 'SĐT', dataIndex: 'phone', width: 130 },
            { title: 'Tồn kho', dataIndex: 'total_items', width: 100, align: 'center', render: (v: number) => <span style={{ fontWeight: 700, color: v > 0 ? '#22c55e' : '#94a3b8' }}>{v}</span> },
            { title: 'Hành động', width: 150, align: 'center', render: (_: unknown, r: Warehouse) => (
              <Space>
                <Button size="small" icon={<EnvironmentOutlined />} onClick={() => openDetail(r)}>Chi tiết</Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditWH(r); setModalOpen(true); }} />
                <Popconfirm title="Xóa kho?" onConfirm={() => handleDelete(r.id)} okText="Xóa" cancelText="Hủy">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onCancel={() => { setModalOpen(false); setEditWH(null); }} onOk={handleSave}
        title={editWH ? 'Sửa kho' : 'Thêm kho mới'} okText="Lưu" cancelText="Hủy" destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={{ type: 'main' }}>
          <Form.Item name="name" label="Tên kho" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
          <Form.Item name="type" label="Loại">
            <Select options={[{ value: 'main', label: 'Kho chính' }, { value: 'branch', label: 'Chi nhánh' }, { value: 'display', label: 'Trưng bày' }]} />
          </Form.Item>
          <Form.Item name="phone" label="SĐT"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer open={!!detailWH} onClose={() => setDetailWH(null)} title={`📦 ${detailWH?.name || ''}`} size="large">
        {detailWH && (
          <>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Mã kho">{detailWH.code}</Descriptions.Item>
              <Descriptions.Item label="Loại"><Tag color={typeColors[detailWH.type]}>{typeLabels[detailWH.type]}</Tag></Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">{detailWH.address || '—'}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{detailWH.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Tồn kho">{detailWH.total_items} sản phẩm</Descriptions.Item>
            </Descriptions>
            {stockDetail.length > 0 && (
              <Card title="Tồn kho chi tiết" size="small" style={{ borderRadius: 12, marginBottom: 16 }}>
                <Table dataSource={stockDetail} rowKey={(r) => `${r.inventory_id}-${r.status}`} pagination={false} size="small"
                  columns={[
                    { title: 'Sản phẩm', dataIndex: 'product_name' },
                    { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
                    { title: 'Tình trạng', dataIndex: 'condition', render: (v: string) => <Tag>{v}</Tag> },
                    { title: 'SL', dataIndex: 'count', align: 'center', render: (v: number) => <strong>{v}</strong> },
                  ]} />
              </Card>
            )}
            {locations.length > 0 && (
              <Card title="Vị trí kho" size="small" style={{ borderRadius: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                  {locations.map(loc => (
                    <div key={loc.id} style={{
                      padding: '12px', borderRadius: 10, textAlign: 'center',
                      background: loc.current_count >= loc.capacity ? 'rgba(239,68,68,0.1)' : loc.current_count > 0 ? 'rgba(34,197,94,0.1)' : isDark ? 'rgba(51,65,85,0.3)' : '#f8fafc',
                      border: `1px solid ${loc.current_count >= loc.capacity ? '#ef4444' : loc.current_count > 0 ? '#22c55e' : isDark ? '#334155' : '#e2e8f0'}`,
                    }}>
                      <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{loc.location_code}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{loc.current_count}/{loc.capacity}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </Drawer>

      {/* Transfer Modal */}
      <Modal open={transferOpen} onCancel={() => setTransferOpen(false)} onOk={handleTransfer}
        title="↔️ Chuyển kho" okText="Chuyển" cancelText="Hủy" destroyOnHidden>
        <Form form={transferForm} layout="vertical">
          <Form.Item name="serial_unit_ids" label="Serial IDs (cách nhau bởi dấu phẩy)" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="SN001, SN002, SN003" />
          </Form.Item>
          <Form.Item name="from_warehouse_id" label="Từ kho" rules={[{ required: true }]}>
            <Select options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
          </Form.Item>
          <Form.Item name="to_warehouse_id" label="Đến kho" rules={[{ required: true }]}>
            <Select options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
          </Form.Item>
          <Form.Item name="to_location_code" label="Vị trí mới"><Input placeholder="VD: A1-01" /></Form.Item>
          <Form.Item name="reason" label="Lý do"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

