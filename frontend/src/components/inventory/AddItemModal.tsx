'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, App } from 'antd';
import api from '@/lib/api';
import { Category, InventoryItem, InventoryCreate } from '@/types';

const { TextArea } = Input;

interface AddItemModalProps {
  open: boolean;
  editItem: InventoryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const categoryOptions: { value: Category; label: string }[] = [
  { value: 'CPU', label: 'CPU' },
  { value: 'GPU', label: 'GPU' },
  { value: 'RAM', label: 'RAM' },
  { value: 'Storage', label: 'Storage' },
  { value: 'Mainboard', label: 'Mainboard' },
  { value: 'PSU', label: 'PSU' },
  { value: 'Case', label: 'Case' },
  { value: 'Cooling', label: 'Cooling' },
  { value: 'Monitor', label: 'Monitor' },
  { value: 'Keyboard', label: 'Keyboard' },
  { value: 'Mouse', label: 'Mouse' },
  { value: 'Headset', label: 'Headset' },
  { value: 'Other', label: 'Other' },
];

export default function AddItemModal({ open, editItem, onClose, onSuccess }: AddItemModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  React.useEffect(() => {
    if (editItem) {
      form.setFieldsValue(editItem);
    } else {
      form.resetFields();
    }
  }, [editItem, open, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const payload: InventoryCreate = {
        sku_code: values.sku_code,
        name: values.name,
        category: values.category,
        brand: values.brand,
        image_url: values.image_url,
        specs: values.specs ? JSON.parse(values.specs) : {},
        stock_quantity: values.stock_quantity,
        min_stock: values.min_stock,
        cost_price: values.cost_price,
        unit_price: values.unit_price,
        warranty_months: values.warranty_months,
        location: values.location,
        barcode: values.barcode,
      };

      if (editItem) await api.put(`/api/inventory/${editItem.id}`, payload);
      else await api.post('/api/inventory', payload);

      message.success(editItem ? 'Cập nhật thành công' : 'Thêm linh kiện thành công');
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onOk={handleSubmit} onCancel={onClose} confirmLoading={loading} width={720} destroyOnHidden forceRender>
      <Form form={form} layout="vertical">
        <Form.Item name="sku_code" label="Mã SKU" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="category" label="Danh mục" rules={[{ required: true }]}><Select options={categoryOptions} /></Form.Item>
        <Form.Item name="brand" label="Brand"><Input /></Form.Item>
        <Form.Item name="image_url" label="Ảnh"><Input /></Form.Item>
        <Form.Item name="specs" label="Specs JSON"><TextArea rows={4} /></Form.Item>
        <Form.Item name="stock_quantity" label="Tồn kho" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="min_stock" label="Tồn tối thiểu"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="cost_price" label="Giá vốn"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="unit_price" label="Giá bán" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="warranty_months" label="Bảo hành (tháng)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="location" label="Vị trí"><Input /></Form.Item>
        <Form.Item name="barcode" label="Barcode"><Input /></Form.Item>
      </Form>
    </Modal>
  );
}
