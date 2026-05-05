// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Tag,
  Select,
  Button,
  App,
  Divider,
  Typography,
  Input,
  InputNumber,
  Table,
  Space,
  Empty,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  LaptopOutlined,
  ToolOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import { MaintenanceTicket, TicketStatus, InventoryItem } from '@/types';
import { useTheme } from '@/components/ThemeProvider';

const { Text, Title } = Typography;

interface TicketDetailDrawerProps {
  open: boolean;
  ticket: MaintenanceTicket | null;
  onClose: () => void;
  onUpdate: () => void;
}

const statusConfig: Record<TicketStatus, { color: string; label: string }> = {
  pending: { color: 'orange', label: 'Chờ xử lý' },
  diagnosing: { color: 'processing', label: 'Đang chẩn đoán' },
  waiting_parts: { color: 'warning', label: 'Chờ linh kiện' },
  completed: { color: 'success', label: 'Hoàn thành' },
};

export default function TicketDetailDrawer({ open, ticket, onClose, onUpdate }: TicketDetailDrawerProps) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [partsLoading, setPartsLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [partQuantity, setPartQuantity] = useState<number>(1);
  const { isDark } = useTheme();
  const { message } = App.useApp();

  useEffect(() => {
    if (open) {
      fetchInventory();
    }
  }, [open]);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/api/inventory', { params: { limit: 100 } });
      setInventory(res.data.items.filter((i: InventoryItem) => i.stock_quantity > 0));
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    }
  };

  const handleStatusUpdate = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    setStatusLoading(true);
    try {
      await api.put(`/api/tickets/${ticket.id}/status`, { status: newStatus });
      message.success('Cập nhật trạng thái thành công');
      onUpdate();
    } catch (err) {
      message.error('Cập nhật thất bại');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAddPart = async () => {
    if (!ticket || !selectedPartId) return;
    setPartsLoading(true);
    try {
      const item = inventory.find((i) => i.id === selectedPartId);
      if (!item) return;

      await api.put(`/api/tickets/${ticket.id}/parts`, {
        parts: [
          {
            inventory_id: selectedPartId,
            name: item.name,
            quantity: partQuantity,
            price: item.unit_price,
          },
        ],
      });
      message.success(`Đã thêm ${item.name}`);
      setSelectedPartId('');
      setPartQuantity(1);
      onUpdate();
      fetchInventory();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      message.error(err?.response?.data?.detail || 'Thêm linh kiện thất bại');
    } finally {
      setPartsLoading(false);
    }
  };

  if (!ticket) return null;

  const cfg = statusConfig[ticket.status];

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>🔧 {ticket.ticket_id}</span>
          <Tag color={cfg.color} style={{ borderRadius: 6 }}>{cfg.label}</Tag>
        </div>
      }
      open={open}
      onClose={onClose}
      width={520}
      styles={{
        body: { padding: '20px 24px' },
      }}
    >
      {/* Customer Info */}
      <div style={{
        background: isDark ? 'rgba(51,65,85,0.3)' : '#f8fafc',
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
      }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Thông tin khách hàng
        </Text>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined style={{ color: '#64748b' }} />
            <Text strong>{ticket.customer_info.name}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PhoneOutlined style={{ color: '#64748b' }} />
            <Text>{ticket.customer_info.phone}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LaptopOutlined style={{ color: '#64748b' }} />
            <Text>{ticket.device_info}</Text>
          </div>
        </div>
      </div>

      {/* Issue */}
      <div style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Mô tả sự cố
        </Text>
        <div style={{
          marginTop: 8,
          padding: 14,
          background: isDark ? 'rgba(51,65,85,0.3)' : '#f8fafc',
          borderRadius: 10,
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          {ticket.issue_description}
        </div>
      </div>

      {/* Technician */}
      <div style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Kỹ thuật viên
        </Text>
        <div style={{ marginTop: 8 }}>
          <Tag icon={<ToolOutlined />} color="blue" style={{ borderRadius: 6, padding: '2px 10px' }}>
            {ticket.technician_name || 'Chưa phân công'}
          </Tag>
        </div>
      </div>

      {/* Status update */}
      <div style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Cập nhật trạng thái
        </Text>
        <div style={{ marginTop: 8 }}>
          <Select
            value={ticket.status}
            onChange={handleStatusUpdate}
            loading={statusLoading}
            style={{ width: '100%' }}
            options={[
              { value: 'pending', label: '🟠 Chờ xử lý' },
              { value: 'diagnosing', label: '🔵 Đang chẩn đoán' },
              { value: 'waiting_parts', label: '🟡 Chờ linh kiện' },
              { value: 'completed', label: '🟢 Hoàn thành' },
            ]}
          />
        </div>
      </div>

      <Divider />

      {/* Parts Used */}
      <div style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Linh kiện đã sử dụng
        </Text>
        {ticket.parts_used.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            {ticket.parts_used.map((part, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: isDark ? 'rgba(51,65,85,0.3)' : '#f8fafc',
                  borderRadius: 10,
                  marginBottom: 8,
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 13 }}>{part.name || part.inventory_id}</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    SL: {part.quantity} × {part.price.toLocaleString('vi-VN')} ₫
                  </Text>
                </div>
                <Text strong style={{ color: '#6366f1' }}>
                  {(part.price * part.quantity).toLocaleString('vi-VN')} ₫
                </Text>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="Chưa có linh kiện" style={{ marginTop: 12 }} />
        )}
      </div>

      {/* Add Parts */}
      {ticket.status !== 'completed' && (
        <div style={{
          background: isDark ? 'rgba(51,65,85,0.3)' : '#f8fafc',
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            ➕ Thêm linh kiện
          </Text>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Select
              showSearch
              placeholder="Chọn linh kiện..."
              value={selectedPartId || undefined}
              onChange={setSelectedPartId}
              style={{ flex: 1, minWidth: 200 }}
              optionFilterProp="label"
              options={inventory.map((item) => ({
                value: item.id,
                label: `${item.name} (SL: ${item.stock_quantity})`,
              }))}
            />
            <InputNumber
              min={1}
              value={partQuantity}
              onChange={(v) => setPartQuantity(v || 1)}
              style={{ width: 80 }}
              placeholder="SL"
            />
            <Button
              type="primary"
              onClick={handleAddPart}
              loading={partsLoading}
              disabled={!selectedPartId}
              style={{
                background: 'linear-gradient(135deg, #22c55e, #10b981)',
                border: 'none',
                borderRadius: 8,
              }}
            >
              Thêm
            </Button>
          </div>
        </div>
      )}

      {/* Total */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        borderRadius: 14,
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarOutlined style={{ fontSize: 20 }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Tổng chi phí</span>
        </div>
        <span style={{ fontSize: 22, fontWeight: 800 }}>
          {ticket.total_cost.toLocaleString('vi-VN')} ₫
        </span>
      </div>
    </Drawer>
  );
}

