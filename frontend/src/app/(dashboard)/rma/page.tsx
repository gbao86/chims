'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Typography, Button, Tag, Space, Input, App, Table, Modal, Form, Select, Drawer, Timeline, Card, Row, Col, Statistic, Descriptions, Badge } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, SafetyOutlined, SendOutlined, CheckCircleOutlined, ClockCircleOutlined, PhoneOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { RMATicket, RMAStatusType, RMAEvent } from '@/types';
import { useTheme } from '@/components/ThemeProvider';

const { Title, Text } = Typography;

const STATUS_CONFIG: Record<RMAStatusType, { label: string; color: string; icon: React.ReactNode }> = {
  received: { label: 'Tiếp nhận', color: '#3b82f6', icon: <ClockCircleOutlined /> },
  sent_to_vendor: { label: 'Gửi hãng', color: '#f59e0b', icon: <SendOutlined /> },
  vendor_processing: { label: 'Hãng xử lý', color: '#a855f7', icon: <ClockCircleOutlined /> },
  returned_from_vendor: { label: 'Nhận từ hãng', color: '#14b8a6', icon: <CheckCircleOutlined /> },
  returned_to_customer: { label: 'Đã trả khách', color: '#22c55e', icon: <CheckCircleOutlined /> },
  replaced: { label: 'Đổi mới', color: '#6366f1', icon: <CheckCircleOutlined /> },
  rejected: { label: 'Từ chối', color: '#ef4444', icon: <CheckCircleOutlined /> },
};

const STATUS_FLOW: RMAStatusType[] = ['received', 'sent_to_vendor', 'vendor_processing', 'returned_from_vendor', 'returned_to_customer'];

export default function RMAPage() {
  const { isDark } = useTheme();
  const { message } = App.useApp();
  const [items, setItems] = useState<RMATicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailRMA, setDetailRMA] = useState<RMATicket | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [form] = Form.useForm();
  const [updateForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/api/rma', { params });
      setItems(res.data.items || []);
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/api/rma', values);
      message.success('Tạo phiếu RMA thành công');
      setCreateOpen(false); form.resetFields(); fetchData();
    } catch { message.error('Lỗi tạo RMA'); }
  };

  const handleUpdateStatus = async () => {
    if (!detailRMA) return;
    const values = await updateForm.validateFields();
    try {
      const res = await api.put(`/api/rma/${detailRMA.id}/status`, values);
      message.success('Cập nhật trạng thái thành công');
      setUpdateOpen(false); updateForm.resetFields();
      setDetailRMA(res.data);
      fetchData();
    } catch { message.error('Lỗi cập nhật'); }
  };

  const handleLookup = async () => {
    if (!lookupQuery.trim()) return;
    try {
      const res = await api.get('/api/rma/lookup', { params: { q: lookupQuery } });
      setLookupResult(res.data);
      setLookupOpen(true);
    } catch { message.error('Không tìm thấy kết quả'); }
  };

  const counts = items.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            <SafetyOutlined style={{ marginRight: 8 }} />Quản lý RMA
          </Title>
          <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>Quy trình bảo hành: Tiếp nhận → Gửi hãng → Nhận lại → Trả khách</Text>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}
            style={{ borderRadius: 12, fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>Tạo phiếu RMA</Button>
        </Space>
      </div>

      {/* Lookup bar */}
      <Card style={{ borderRadius: 16, marginBottom: 20, background: isDark ? 'rgba(99,102,241,0.06)' : 'linear-gradient(135deg, #f0f0ff, #e8e8ff)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <PhoneOutlined style={{ fontSize: 20, color: '#6366f1' }} />
          <Text strong>Tra cứu bảo hành:</Text>
          <Input placeholder="Nhập Serial Number hoặc Số điện thoại..." value={lookupQuery} onChange={e => setLookupQuery(e.target.value)}
            onPressEnter={handleLookup} style={{ maxWidth: 400, borderRadius: 10 }} />
          <Button type="primary" onClick={handleLookup} style={{ borderRadius: 10 }}>Tra cứu</Button>
        </div>
      </Card>

      {/* Status summary */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {(['received', 'sent_to_vendor', 'vendor_processing', 'returned_from_vendor', 'returned_to_customer'] as RMAStatusType[]).map(s => (
          <Col key={s} xs={12} sm={8} md={4}>
            <Card size="small" style={{ borderRadius: 12, cursor: 'pointer', border: statusFilter === s ? `2px solid ${STATUS_CONFIG[s].color}` : undefined }}
              onClick={() => setStatusFilter(prev => prev === s ? '' : s)}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: STATUS_CONFIG[s].color, fontWeight: 700, fontSize: 22 }}>{counts[s] || 0}</div>
                <Text style={{ fontSize: 11 }}>{STATUS_CONFIG[s].label}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Input placeholder="Tìm mã RMA, serial, khách hàng..." prefix={<SearchOutlined />} value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 320 }} allowClear />
        <Button icon={<ReloadOutlined />} onClick={() => { setSearch(''); setStatusFilter(''); }}>Làm mới</Button>
      </div>

      {/* RMA Table */}
      <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`, background: isDark ? 'rgba(30,41,59,0.8)' : '#fff' }}>
        <Table loading={loading} dataSource={items} rowKey="id" pagination={{ pageSize: 15 }}
          columns={[
            { title: 'Mã RMA', dataIndex: 'rma_code', width: 120, render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{v}</span> },
            { title: 'Khách hàng', dataIndex: 'customer_name', render: (v: string, r: RMATicket) => <div><div style={{ fontWeight: 600 }}>{v || '—'}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.customer_phone}</Text></div> },
            { title: 'Sản phẩm', dataIndex: 'product_name', ellipsis: true },
            { title: 'Serial', dataIndex: 'serial_number', width: 140, render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
            { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (v: RMAStatusType) => <Tag color={STATUS_CONFIG[v]?.color}>{STATUS_CONFIG[v]?.label}</Tag> },
            { title: 'Tracking', dataIndex: 'vendor_tracking', width: 120, render: (v: string) => v ? <Tag>{v}</Tag> : '—' },
            { title: 'Hành động', width: 100, render: (_: unknown, r: RMATicket) => <Button size="small" type="primary" onClick={() => { setDetailRMA(r); }}>Chi tiết</Button> },
          ]}
        />
      </div>

      {/* Create RMA Modal */}
      <Modal open={createOpen} onCancel={() => setCreateOpen(false)} onOk={handleCreate}
        title="📋 Tạo phiếu RMA" okText="Tạo" cancelText="Hủy" destroyOnClose width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="serial_number" label="Serial Number" rules={[{ required: true, message: 'Nhập serial' }]}><Input placeholder="Nhập serial sản phẩm" /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="customer_name" label="Tên khách hàng"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="customer_phone" label="SĐT"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="product_name" label="Tên sản phẩm"><Input /></Form.Item>
          <Form.Item name="issue_description" label="Mô tả lỗi" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="vendor_name" label="Hãng bảo hành"><Input placeholder="VD: ASUS, MSI, Corsair..." /></Form.Item>
          <Form.Item name="warranty_id" label="Mã bảo hành (nếu có)"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer open={!!detailRMA} onClose={() => setDetailRMA(null)} title={`🔧 ${detailRMA?.rma_code || ''}`} width={600}
        extra={<Button type="primary" onClick={() => { setUpdateOpen(true); updateForm.resetFields(); }}>Cập nhật trạng thái</Button>}>
        {detailRMA && (
          <>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Mã RMA">{detailRMA.rma_code}</Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{detailRMA.customer_name} — {detailRMA.customer_phone}</Descriptions.Item>
              <Descriptions.Item label="Sản phẩm">{detailRMA.product_name}</Descriptions.Item>
              <Descriptions.Item label="Serial">{detailRMA.serial_number}</Descriptions.Item>
              <Descriptions.Item label="Mô tả lỗi">{detailRMA.issue_description}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><Tag color={STATUS_CONFIG[detailRMA.status]?.color}>{STATUS_CONFIG[detailRMA.status]?.label}</Tag></Descriptions.Item>
              <Descriptions.Item label="Hãng BH">{detailRMA.vendor_name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Tracking">{detailRMA.vendor_tracking || '—'}</Descriptions.Item>
              {detailRMA.replacement_serial && <Descriptions.Item label="Serial thay thế">{detailRMA.replacement_serial}</Descriptions.Item>}
            </Descriptions>

            {/* Progress */}
            <Card title="Tiến trình xử lý" size="small" style={{ borderRadius: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                {STATUS_FLOW.map((s, i) => {
                  const currentIdx = STATUS_FLOW.indexOf(detailRMA.status as any);
                  const done = i <= currentIdx;
                  return (
                    <div key={s} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', margin: '0 auto 4px',
                        background: done ? STATUS_CONFIG[s].color : isDark ? '#334155' : '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700,
                      }}>{done ? '✓' : i + 1}</div>
                      <Text style={{ fontSize: 10, color: done ? STATUS_CONFIG[s].color : '#94a3b8' }}>{STATUS_CONFIG[s].label}</Text>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Timeline */}
            <Card title="Lịch sử xử lý" size="small" style={{ borderRadius: 14 }}>
              <Timeline items={detailRMA.timeline.map(evt => ({
                color: STATUS_CONFIG[evt.status]?.color || 'gray',
                children: (
                  <div>
                    <div style={{ fontWeight: 600 }}>{STATUS_CONFIG[evt.status]?.label || evt.status}</div>
                    {evt.note && <div style={{ fontSize: 13, color: '#64748b' }}>{evt.note}</div>}
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(evt.timestamp).toLocaleString('vi-VN')} • {evt.performed_by}
                    </div>
                  </div>
                ),
              }))} />
            </Card>
          </>
        )}
      </Drawer>

      {/* Update Status Modal */}
      <Modal open={updateOpen} onCancel={() => setUpdateOpen(false)} onOk={handleUpdateStatus}
        title="Cập nhật trạng thái RMA" okText="Cập nhật" cancelText="Hủy" destroyOnClose>
        <Form form={updateForm} layout="vertical">
          <Form.Item name="status" label="Trạng thái mới" rules={[{ required: true }]}>
            <Select options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="vendor_tracking" label="Mã tracking"><Input /></Form.Item>
          <Form.Item name="replacement_serial" label="Serial thay thế"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* Lookup Results */}
      <Modal open={lookupOpen} onCancel={() => setLookupOpen(false)} title="🔍 Kết quả tra cứu" width={700} footer={null}>
        {lookupResult && (
          <div>
            {lookupResult.warranties?.length > 0 && (
              <Card title="Bảo hành" size="small" style={{ marginBottom: 12, borderRadius: 12 }}>
                <Table dataSource={lookupResult.warranties} rowKey="id" pagination={false} size="small"
                  columns={[
                    { title: 'Mã BH', dataIndex: 'warranty_code' },
                    { title: 'Sản phẩm', dataIndex: 'product_name' },
                    { title: 'Serial', dataIndex: 'serial_number' },
                    { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag color={v === 'active' ? 'green' : 'red'}>{v}</Tag> },
                  ]}
                />
              </Card>
            )}
            {lookupResult.rma_tickets?.length > 0 && (
              <Card title="Phiếu RMA" size="small" style={{ borderRadius: 12 }}>
                <Table dataSource={lookupResult.rma_tickets} rowKey="id" pagination={false} size="small"
                  columns={[
                    { title: 'Mã RMA', dataIndex: 'rma_code' },
                    { title: 'Sản phẩm', dataIndex: 'product_name' },
                    { title: 'Trạng thái', dataIndex: 'status', render: (v: RMAStatusType) => <Tag color={STATUS_CONFIG[v]?.color}>{STATUS_CONFIG[v]?.label}</Tag> },
                  ]}
                />
              </Card>
            )}
            {(lookupResult.warranties?.length === 0 && lookupResult.rma_tickets?.length === 0) && (
              <Text type="secondary">Không tìm thấy kết quả nào</Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
