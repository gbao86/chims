// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal, Form, Input, InputNumber, Select, Button, Divider, Row, Col, Tag, App,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { Category, InventoryItem } from '@/types';

interface AddItemModalProps {
  open: boolean;
  editItem: InventoryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const categoryOptions: { value: Category; label: string }[] = [
  { value: 'CPU', label: 'CPU' }, { value: 'GPU', label: 'GPU' },
  { value: 'RAM', label: 'RAM' }, { value: 'Storage', label: 'Storage' },
  { value: 'Mainboard', label: 'Mainboard' }, { value: 'PSU', label: 'PSU' },
  { value: 'Case', label: 'Case' }, { value: 'Cooling', label: 'Cooling' },
  { value: 'Monitor', label: 'Monitor' }, { value: 'Keyboard', label: 'Keyboard' },
  { value: 'Mouse', label: 'Mouse' }, { value: 'Headset', label: 'Headset' },
  { value: 'Other', label: 'Other' },
];

export default function AddItemModal({ open, editItem, onClose, onSuccess }: AddItemModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  // Dynamic image URLs list (index 0 = primary)
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Dynamic spec rows [{key, value}]
  const [specRows, setSpecRows] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      form.setFieldsValue({
        sku_code: editItem.sku_code,
        name: editItem.name,
        category: editItem.category,
        brand: editItem.brand || '',
        stock_quantity: editItem.stock_quantity,
        min_stock: editItem.min_stock ?? 5,
        unit_price: editItem.unit_price,
        cost_price: editItem.cost_price ?? 0,
        warranty_months: editItem.warranty_months ?? 24,
        location: editItem.location || '',
        barcode: editItem.barcode || '',
      });
      // Images: prefer image_urls array, fall back to single image_url
      const urls = editItem.image_urls?.length
        ? editItem.image_urls
        : editItem.image_url
        ? [editItem.image_url]
        : [''];
      setImageUrls(urls);
      // Specs as rows
      const rows = Object.entries(editItem.specs || {}).map(([k, v]) => ({ key: k, value: String(v) }));
      setSpecRows(rows.length ? rows : [{ key: '', value: '' }]);
    } else {
      form.resetFields();
      setImageUrls(['']);
      setSpecRows([{ key: '', value: '' }]);
    }
    setNewImageUrl('');
  }, [editItem, open, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      // Build image_urls: include pending newImageUrl if not yet added
      const allUrls = newImageUrl.trim()
        ? [...imageUrls, newImageUrl.trim()]
        : [...imageUrls];
      const validUrls = allUrls.map(u => u.trim()).filter(Boolean);

      // Build specs object from rows
      const specs: Record<string, string> = {};
      for (const row of specRows) {
        const k = row.key.trim();
        const v = row.value.trim();
        if (k && v) specs[k] = v;
      }

      const payload = {
        sku_code: values.sku_code,
        name: values.name,
        category: values.category,
        brand: values.brand || '',
        image_url: validUrls[0] || '',
        image_urls: validUrls,
        specs,
        stock_quantity: values.stock_quantity ?? 0,
        min_stock: values.min_stock ?? 5,
        unit_price: values.unit_price ?? 0,
        cost_price: values.cost_price ?? 0,
        warranty_months: values.warranty_months ?? 24,
        location: values.location || '',
        barcode: values.barcode || '',
      };

      if (editItem) {
        await api.put(`/api/inventory/${editItem.id}`, payload);
        message.success('Cập nhật linh kiện thành công!');
      } else {
        await api.post('/api/inventory', payload);
        message.success('Thêm linh kiện thành công!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      message.error(detail ? String(detail) : 'Lưu thất bại, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Image helpers
  const updateImageUrl = (i: number, val: string) =>
    setImageUrls(prev => prev.map((u, idx) => (idx === i ? val : u)));
  const removeImageUrl = (i: number) =>
    setImageUrls(prev => prev.filter((_, idx) => idx !== i));
  const addPendingImage = () => {
    if (!newImageUrl.trim()) return;
    setImageUrls(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  // Spec helpers
  const updateSpecRow = (i: number, field: 'key' | 'value', val: string) =>
    setSpecRows(prev => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const addSpecRow = () => setSpecRows(prev => [...prev, { key: '', value: '' }]);
  const removeSpecRow = (i: number) =>
    setSpecRows(prev => prev.filter((_, idx) => idx !== i));

  const isEdit = !!editItem;

  return (
    <Modal
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText={isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
      cancelText="Hủy"
      width={780}
      destroyOnHidden
      title={isEdit ? `✏️ Chỉnh sửa: ${editItem?.name}` : '➕ Thêm linh kiện mới'}
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 8 } }}
    >
      <Form form={form} layout="vertical">
        {/* ── Basic Info ── */}
        <Divider titlePlacement="left" style={{ fontSize: 13, margin: '8px 0 12px' }}>Thông tin cơ bản</Divider>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="sku_code" label="Mã SKU" rules={[{ required: true, message: 'Nhập mã SKU' }]}>
              <Input disabled={isEdit} style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="category" label="Danh mục" rules={[{ required: true }]}>
              <Select options={categoryOptions} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="brand" label="Thương hiệu">
              <Input placeholder="Vd: Intel, ASUS..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="barcode" label="Barcode">
              <Input placeholder="Mã vạch (nếu có)" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="location" label="Vị trí kho">
              <Input placeholder="Vd: A1-01" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Pricing & Stock ── */}
        <Divider titlePlacement="left" style={{ fontSize: 13, margin: '8px 0 12px' }}>Giá & Tồn kho</Divider>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="unit_price" label="Giá bán (₫)" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="cost_price" label="Giá vốn (₫)">
              <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="warranty_months" label="Bảo hành (tháng)">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="stock_quantity" label="Số lượng tồn" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="min_stock" label="Tồn tối thiểu">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Images ── */}
        <Divider titlePlacement="left" style={{ fontSize: 13, margin: '8px 0 12px' }}>Hình ảnh</Divider>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
          Ảnh đầu tiên sẽ là ảnh đại diện hiển thị trong danh sách. Trang chi tiết sẽ hiển thị đầy đủ tất cả ảnh.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {imageUrls.map((url, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tag style={{ flexShrink: 0, fontSize: 11 }}>
                {i === 0 ? '⭐ Chính' : `#${i + 1}`}
              </Tag>
              {/* Preview thumbnail */}
              {url.trim() && (
                <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                </div>
              )}
              <Input
                value={url}
                onChange={e => updateImageUrl(i, e.target.value)}
                placeholder={i === 0 ? 'URL ảnh đại diện (bắt buộc để hiển thị trong bảng)' : `URL ảnh ${i + 1}`}
              />
              {imageUrls.length > 1 && (
                <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeImageUrl(i)} />
              )}
            </div>
          ))}
        </div>
        {/* Add new image URL */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={newImageUrl}
            onChange={e => setNewImageUrl(e.target.value)}
            onPressEnter={addPendingImage}
            placeholder="Dán URL ảnh thêm vào đây rồi nhấn Thêm hoặc Enter..."
          />
          <Button type="dashed" icon={<PlusOutlined />} onClick={addPendingImage}>Thêm</Button>
        </div>

        {/* ── Specs ── */}
        <Divider titlePlacement="left" style={{ fontSize: 13, margin: '16px 0 12px' }}>Thông số kỹ thuật</Divider>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
          Mỗi dòng gồm tên thông số và giá trị. Để trống cả 2 ô để bỏ qua dòng đó.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {specRows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input
                value={row.key}
                onChange={e => updateSpecRow(i, 'key', e.target.value)}
                placeholder="Tên thông số (vd: socket)"
                style={{ width: 200, fontFamily: 'monospace', fontSize: 12 }}
              />
              <Input
                value={row.value}
                onChange={e => updateSpecRow(i, 'value', e.target.value)}
                placeholder="Giá trị (vd: AM5)"
                style={{ flex: 1 }}
              />
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeSpecRow(i)}
                disabled={specRows.length === 1}
              />
            </div>
          ))}
        </div>
        <Button type="dashed" icon={<PlusOutlined />} onClick={addSpecRow} block>
          Thêm thông số
        </Button>
      </Form>
    </Modal>
  );
}
