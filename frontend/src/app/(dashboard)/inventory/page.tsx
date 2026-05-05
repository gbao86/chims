// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Select, Button, Tag, Popconfirm, App, Typography, Space, Tooltip, Image } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '@/lib/api';
import { InventoryItem, InventoryListResponse, Category, StockStatus } from '@/types';
import AddItemModal from '@/components/inventory/AddItemModal';
import { useTheme } from '@/components/ThemeProvider';

const { Title } = Typography;

const categoryColors: Record<Category, string> = {
  CPU: '#6366f1', GPU: '#ec4899', RAM: '#3b82f6', Storage: '#f59e0b', Mainboard: '#22c55e', PSU: '#f97316', Case: '#14b8a6', Cooling: '#0ea5e9', Monitor: '#84cc16', Keyboard: '#a855f7', Mouse: '#ef4444', Headset: '#64748b', Other: '#64748b',
};

const statusConfig: Record<StockStatus, { color: string; label: string }> = {
  in_stock: { color: 'success', label: 'Còn hàng' },
  low_stock: { color: 'warning', label: 'Sắp hết' },
  out_of_stock: { color: 'error', label: 'Hết hàng' },
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const { isDark } = useTheme();
  const { message } = App.useApp();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      const res = await api.get<InventoryListResponse>('/api/inventory', { params });
      setItems(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/inventory/${id}`);
      message.success('Đã xóa linh kiện');
      fetchItems();
    } catch {
      message.error('Xóa thất bại');
    }
  };

  const handleExport = async (type: 'csv' | 'xlsx') => {
    const exportUrl = `/api/exports/inventory.${type}`;
    const res = await api.get(exportUrl, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: String(res.headers['content-type'] || 'application/octet-stream') });
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = `inventory.${type === 'csv' ? 'csv' : 'xlsx'}`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  const columns: ColumnsType<InventoryItem> = [
    {
      title: 'Ảnh',
      key: 'image_url',
      width: 90,
      render: (_, record) => {
        const src = record.image_url?.trim();
        return src ? (
          <Image
            src={src}
            width={56}
            height={56}
            style={{ objectFit: 'cover', borderRadius: 12, background: '#f8fafc' }}
            preview={false}
          />
        ) : (
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1',
            fontSize: 12,
            fontWeight: 700,
            border: '1px solid rgba(99,102,241,0.15)',
          }}>
            IMG
          </div>
        );
      },
    },
    { title: 'Mã SKU', dataIndex: 'sku_code', key: 'sku_code', width: 120, render: (text: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#6366f1' }}>{text}</span> },
    { title: 'Tên linh kiện', dataIndex: 'name', key: 'name', ellipsis: true, render: (text: string, record) => <div><div style={{ fontWeight: 600 }}>{text}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{record.brand || 'No brand'}</div></div> },
    { title: 'Danh mục', dataIndex: 'category', key: 'category', width: 130, render: (cat: Category) => <Tag color={categoryColors[cat]}>{cat}</Tag> },
    { title: 'Tồn kho', dataIndex: 'stock_quantity', key: 'stock_quantity', width: 100, align: 'center', sorter: (a, b) => a.stock_quantity - b.stock_quantity, render: (qty: number) => <span style={{ fontWeight: 700, color: qty <= 5 ? '#ef4444' : undefined }}>{qty}</span> },
    { title: 'Đơn giá', dataIndex: 'unit_price', key: 'unit_price', width: 150, align: 'right', sorter: (a, b) => a.unit_price - b.unit_price, render: (price: number) => <span>{price.toLocaleString('vi-VN')} ₫</span> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120, align: 'center', render: (status: StockStatus) => <Tag color={statusConfig[status].color}>{statusConfig[status].label}</Tag> },
    { title: 'Hành động', key: 'actions', width: 100, align: 'center', render: (_, record) => <Space><Tooltip title="Sửa"><Button type="text" icon={<EditOutlined />} onClick={() => { setEditItem(record); setModalOpen(true); }} /></Tooltip><Popconfirm title="Xóa linh kiện này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy"><Button type="text" icon={<DeleteOutlined />} danger /></Popconfirm></Space> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>Kho linh kiện</Title>
          <div style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14, marginTop: 4 }}>Quản lý tất cả linh kiện trong kho ({total} sản phẩm)</div>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>CSV</Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport('xlsx')}>Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); setModalOpen(true); }}>Thêm linh kiện</Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Input placeholder="Tìm kiếm theo tên hoặc SKU..." prefix={<SearchOutlined />} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 320 }} allowClear />
        <Select placeholder="Lọc danh mục" value={categoryFilter || undefined} onChange={(val: Category | '') => { setCategoryFilter(val); setPage(1); }} allowClear style={{ width: 180 }} options={[{ value: 'CPU', label: 'CPU' }, { value: 'GPU', label: 'GPU' }, { value: 'RAM', label: 'RAM' }, { value: 'Storage', label: 'Storage' }, { value: 'Mainboard', label: 'Mainboard' }, { value: 'PSU', label: 'PSU' }, { value: 'Other', label: 'Other' }]} />
        <Button icon={<ReloadOutlined />} onClick={fetchItems}>Làm mới</Button>
      </div>

      <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`, background: isDark ? 'rgba(30,41,59,0.8)' : '#fff' }}>
        <Table columns={columns} dataSource={items} rowKey="id" loading={loading} pagination={{ current: page, total, pageSize: 20, onChange: (p) => setPage(p), showSizeChanger: false }} expandable={{ expandedRowRender: (record) => <div style={{ padding: '8px 0' }}><strong>⚙️ Thông số:</strong><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>{Object.entries(record.specs).map(([key, value]) => <Tag key={key}><strong>{key}:</strong> {String(value)}</Tag>)}</div></div> }} />
      </div>

      <AddItemModal open={modalOpen} editItem={editItem} onClose={() => { setModalOpen(false); setEditItem(null); }} onSuccess={fetchItems} />
    </div>
  );
}

