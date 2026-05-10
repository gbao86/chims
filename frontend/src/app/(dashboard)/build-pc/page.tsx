// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Typography, Button, Select, Card, Tag, Space, InputNumber, Input, App, Table, Popconfirm, Badge, Drawer, Form, Tooltip, Progress } from 'antd';
import { PlusOutlined, ThunderboltOutlined, DeleteOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, SearchOutlined, ReloadOutlined, BuildOutlined, DesktopOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { InventoryItem, InventoryListResponse, PCBuild, PCBuildComponent, CompatibilityLevel, Category } from '@/types';
import { useTheme } from '@/components/ThemeProvider';

const { Title, Text } = Typography;

const COMPONENT_SLOTS: { key: Category; label: string; icon: string; required: boolean }[] = [
  { key: 'CPU', label: 'Bộ xử lý (CPU)', icon: '🔲', required: true },
  { key: 'Mainboard', label: 'Bo mạch chủ', icon: '🟩', required: true },
  { key: 'RAM', label: 'Bộ nhớ RAM', icon: '🟦', required: true },
  { key: 'GPU', label: 'Card đồ họa', icon: '🟥', required: false },
  { key: 'Storage', label: 'Ổ cứng', icon: '💾', required: true },
  { key: 'PSU', label: 'Nguồn (PSU)', icon: '⚡', required: true },
  { key: 'Case', label: 'Vỏ case', icon: '🖥️', required: false },
  { key: 'Cooling', label: 'Tản nhiệt', icon: '❄️', required: false },
];

const compatColors: Record<CompatibilityLevel, string> = {
  compatible: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

const compatLabels: Record<CompatibilityLevel, string> = {
  compatible: 'Tương thích',
  warning: 'Cảnh báo',
  error: 'Lỗi',
};

const statusColors: Record<string, string> = {
  draft: 'gold',
  assembled: 'blue',
  sold: 'green',
  cancelled: 'red',
};

export default function BuildPCPage() {
  const { isDark } = useTheme();
  const { message } = App.useApp();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [builds, setBuilds] = useState<PCBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [buildName, setBuildName] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<Record<string, { inventory_id: string; quantity: number }>>({});
  const [compatResult, setCompatResult] = useState<{ level: CompatibilityLevel; notes: string[]; total_tdp: number; recommended_psu: number; total_price: number } | null>(null);
  const [checking, setChecking] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, buildsRes] = await Promise.all([
        api.get<InventoryListResponse>('/api/inventory', { params: { limit: 200 } }),
        api.get('/api/builds', { params: { limit: 50 } }),
      ]);
      setInventory(invRes.data.items);
      setBuilds(buildsRes.data.builds || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getItemsByCategory = (cat: string) => inventory.filter(i => i.category === cat);

  const checkCompat = async () => {
    const comps: PCBuildComponent[] = [];
    for (const [cat, sel] of Object.entries(selectedComponents)) {
      if (sel.inventory_id) {
        const inv = inventory.find(i => i.id === sel.inventory_id);
        comps.push({ category: cat, inventory_id: sel.inventory_id, quantity: sel.quantity, unit_price: inv?.unit_price || 0 });
      }
    }
    if (comps.length < 2) { message.warning('Chọn ít nhất 2 linh kiện để kiểm tra'); return; }
    setChecking(true);
    try {
      const res = await api.post('/api/builds/check-compatibility', { components: comps });
      setCompatResult(res.data);
    } catch { message.error('Lỗi kiểm tra tương thích'); } finally { setChecking(false); }
  };

  const handleCreateBuild = async () => {
    if (!buildName.trim()) { message.warning('Nhập tên cấu hình'); return; }
    const comps: PCBuildComponent[] = [];
    for (const [cat, sel] of Object.entries(selectedComponents)) {
      if (sel.inventory_id) {
        const inv = inventory.find(i => i.id === sel.inventory_id);
        comps.push({ category: cat, inventory_id: sel.inventory_id, quantity: sel.quantity, unit_price: inv?.unit_price || 0 });
      }
    }
    if (comps.length === 0) { message.warning('Chọn ít nhất 1 linh kiện'); return; }
    try {
      await api.post('/api/builds', { build_name: buildName, components: comps });
      message.success('Tạo cấu hình thành công!');
      setBuilderOpen(false);
      setBuildName('');
      setSelectedComponents({});
      setCompatResult(null);
      fetchData();
    } catch { message.error('Lỗi tạo cấu hình'); }
  };

  const handleAssemble = async (id: string) => {
    try {
      await api.post(`/api/builds/${id}/assemble`);
      message.success('Đã lắp ráp thành công!');
      fetchData();
    } catch { message.error('Lỗi lắp ráp'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/builds/${id}`);
      message.success('Đã xóa');
      fetchData();
    } catch { message.error('Lỗi xóa'); }
  };

  const totalPrice = Object.entries(selectedComponents).reduce((sum, [, sel]) => {
    const inv = inventory.find(i => i.id === sel.inventory_id);
    return sum + (inv?.unit_price || 0) * sel.quantity;
  }, 0);

  const selectedCount = Object.values(selectedComponents).filter(s => s.inventory_id).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            <DesktopOutlined style={{ marginRight: 8 }} />Build PC
          </Title>
          <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>
            Lắp ráp cấu hình PC, kiểm tra tương thích & tính công suất nguồn
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setBuilderOpen(true)}
          style={{ borderRadius: 12, height: 44, fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>
          Tạo cấu hình mới
        </Button>
      </div>

      {/* Builds list */}
      <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`, background: isDark ? 'rgba(30,41,59,0.8)' : '#fff' }}>
        <Table loading={loading} dataSource={builds} rowKey="id" pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Mã Build', dataIndex: 'build_code', width: 130, render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{v}</span> },
            { title: 'Tên cấu hình', dataIndex: 'build_name', ellipsis: true, render: (v: string, r: PCBuild) => <div><div style={{ fontWeight: 600 }}>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.components.length} linh kiện</Text></div> },
            { title: 'Tổng giá', dataIndex: 'total_price', width: 160, align: 'right', render: (v: number) => <span style={{ fontWeight: 700 }}>{v.toLocaleString('vi-VN')} ₫</span> },
            { title: 'TDP', dataIndex: 'total_tdp', width: 80, align: 'center', render: (v: number) => <Tag>{v}W</Tag> },
            { title: 'PSU đề xuất', dataIndex: 'recommended_psu', width: 110, align: 'center', render: (v: number) => <Tag color="orange">{v}W</Tag> },
            { title: 'Tương thích', dataIndex: 'compatibility_status', width: 120, align: 'center', render: (v: CompatibilityLevel) => <Tag color={compatColors[v]} style={{ fontWeight: 600 }}>{compatLabels[v]}</Tag> },
            { title: 'Trạng thái', dataIndex: 'status', width: 120, align: 'center', render: (v: string) => <Tag color={statusColors[v]}>{v.toUpperCase()}</Tag> },
            { title: 'Hành động', width: 140, align: 'center', render: (_: unknown, r: PCBuild) => (
              <Space>
                {r.status === 'draft' && <Tooltip title="Lắp ráp"><Button type="primary" size="small" icon={<BuildOutlined />} onClick={() => handleAssemble(r.id)} /></Tooltip>}
                <Popconfirm title="Xóa cấu hình này?" onConfirm={() => handleDelete(r.id)} okText="Xóa" cancelText="Hủy">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
          expandable={{ expandedRowRender: (r: PCBuild) => (
            <div>
              <div style={{ marginBottom: 8 }}><strong>Linh kiện:</strong></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {r.components.map((c, i) => <Tag key={i} color="blue">{c.category}: {c.product_name || c.sku_code || c.inventory_id} × {c.quantity}</Tag>)}
              </div>
              {r.compatibility_notes.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>Ghi chú tương thích:</strong>
                  {r.compatibility_notes.map((n, i) => <div key={i} style={{ marginTop: 4 }}>{n}</div>)}
                </div>
              )}
            </div>
          )}}
        />
      </div>

      {/* Builder Drawer */}
      <Drawer open={builderOpen} onClose={() => { setBuilderOpen(false); setCompatResult(null); }}
        title="🖥️ Xây dựng cấu hình PC" size="large" destroyOnHidden
        extra={<Button type="primary" onClick={handleCreateBuild} style={{ borderRadius: 10, fontWeight: 600, background: 'linear-gradient(135deg, #22c55e, #10b981)', border: 'none' }}>Lưu cấu hình</Button>}>

        <Form layout="vertical">
          <Form.Item label="Tên cấu hình" required>
            <Input placeholder="VD: Gaming Beast RTX 4070" value={buildName} onChange={e => setBuildName(e.target.value)} style={{ borderRadius: 10 }} />
          </Form.Item>
        </Form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {COMPONENT_SLOTS.map(slot => {
            const items = getItemsByCategory(slot.key);
            const sel = selectedComponents[slot.key];
            const selected = sel ? inventory.find(i => i.id === sel.inventory_id) : null;
            return (
              <Card key={slot.key} size="small" style={{
                borderRadius: 14,
                border: selected ? `2px solid ${compatColors['compatible']}40` : `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                background: isDark ? 'rgba(30,41,59,0.6)' : '#fafafa',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 24, width: 40, textAlign: 'center' }}>{slot.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      {slot.label} {slot.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </div>
                    <Select allowClear showSearch style={{ width: '100%' }} placeholder={`Chọn ${slot.label}`}
                      optionFilterProp="label"
                      value={sel?.inventory_id || undefined}
                      onChange={(v) => setSelectedComponents(prev => ({ ...prev, [slot.key]: { inventory_id: v || '', quantity: prev[slot.key]?.quantity || 1 } }))}
                      options={items.map(i => ({ value: i.id, label: `${i.name} — ${i.unit_price.toLocaleString('vi-VN')}₫ (Kho: ${i.stock_quantity})` }))}
                    />
                  </div>
                  <InputNumber min={1} max={16} value={sel?.quantity || 1}
                    onChange={v => setSelectedComponents(prev => ({ ...prev, [slot.key]: { ...prev[slot.key], quantity: v || 1 } }))}
                    style={{ width: 65 }} />
                  {selected && <Text strong style={{ minWidth: 100, textAlign: 'right' }}>{(selected.unit_price * (sel?.quantity || 1)).toLocaleString('vi-VN')}₫</Text>}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Summary panel */}
        <Card style={{ borderRadius: 16, background: isDark ? 'rgba(99,102,241,0.08)' : 'linear-gradient(135deg, #f0f0ff, #e8e8ff)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ fontSize: 16 }}>Tổng cấu hình</Text>
            <Button icon={<ThunderboltOutlined />} onClick={checkCompat} loading={checking}
              style={{ borderRadius: 10, fontWeight: 600, background: '#f59e0b', color: '#fff', border: 'none' }}>
              Kiểm tra tương thích
            </Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div><Text type="secondary">Linh kiện</Text><div style={{ fontSize: 20, fontWeight: 800 }}>{selectedCount}/{COMPONENT_SLOTS.length}</div></div>
            <div><Text type="secondary">Tổng giá</Text><div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>{totalPrice.toLocaleString('vi-VN')}₫</div></div>
            <div><Text type="secondary">Trạng thái</Text>
              {compatResult ? <Tag color={compatColors[compatResult.level]} style={{ fontSize: 14, padding: '4px 12px', fontWeight: 700 }}>
                {compatResult.level === 'compatible' && <CheckCircleOutlined />}
                {compatResult.level === 'warning' && <WarningOutlined />}
                {compatResult.level === 'error' && <CloseCircleOutlined />}
                {' '}{compatLabels[compatResult.level]}
              </Tag> : <Tag>Chưa kiểm tra</Tag>}
            </div>
          </div>
          {compatResult && (
            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: isDark ? 'rgba(0,0,0,0.2)' : '#fff' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                <Text><strong>TDP:</strong> {compatResult.total_tdp}W</Text>
                <Text><strong>PSU khuyến nghị:</strong> <Tag color="orange">{compatResult.recommended_psu}W</Tag></Text>
              </div>
              {compatResult.notes.map((n, i) => <div key={i} style={{ padding: '4px 0', fontSize: 13 }}>{n}</div>)}
            </div>
          )}
        </Card>
      </Drawer>
    </div>
  );
}

