// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button, Tag, Modal, Form, Input, App, Typography, Spin } from 'antd';
import { PlusOutlined, UserOutlined, PhoneOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { MaintenanceTicket, TicketStatus, TicketListResponse } from '@/types';
import TicketDetailDrawer from '@/components/maintenance/TicketDetailDrawer';
import { useTheme } from '@/components/ThemeProvider';

const { Title, Text } = Typography;

const columns: { status: TicketStatus; label: string; color: string; emoji: string }[] = [
  { status: 'pending', label: 'Chờ xử lý', color: '#f59e0b', emoji: '🟠' },
  { status: 'diagnosing', label: 'Đang chẩn đoán', color: '#3b82f6', emoji: '🔵' },
  { status: 'waiting_parts', label: 'Chờ linh kiện', color: '#f97316', emoji: '🟡' },
  { status: 'completed', label: 'Hoàn thành', color: '#22c55e', emoji: '🟢' },
];

const borderColors: Record<TicketStatus, string> = {
  pending: '#f59e0b',
  diagnosing: '#3b82f6',
  waiting_parts: '#f97316',
  completed: '#22c55e',
};

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [draggedTicket, setDraggedTicket] = useState<MaintenanceTicket | null>(null);
  const [form] = Form.useForm();
  const { isDark } = useTheme();
  const { message } = App.useApp();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<TicketListResponse>('/api/tickets', { params: { limit: 100 } });
      setTickets(res.data.tickets);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreateLoading(true);
      await api.post('/api/tickets', {
        customer_info: { name: values.customer_name, phone: values.customer_phone },
        device_info: values.device_info,
        issue_description: values.issue_description,
      });
      message.success('Tạo phiếu bảo trì thành công!');
      setCreateModalOpen(false);
      form.resetFields();
      fetchTickets();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      if (err?.response?.data?.detail) message.error(err.response.data.detail);
    } finally {
      setCreateLoading(false);
    }
  };

  const updateTicketStatus = async (ticket: MaintenanceTicket, status: TicketStatus) => {
    try {
      await api.put(`/api/tickets/${ticket.id}/status`, { status });
      message.success('Đã cập nhật trạng thái');
      fetchTickets();
      if (selectedTicket?.id === ticket.id) setSelectedTicket({ ...ticket, status });
    } catch {
      message.error('Cập nhật thất bại');
    }
  };

  const handleDrop = async (status: TicketStatus) => {
    if (!draggedTicket || draggedTicket.status === status) return;
    await updateTicketStatus(draggedTicket, status);
    setDraggedTicket(null);
  };

  const getTicketsByStatus = (status: TicketStatus) => tickets.filter((t) => t.status === status);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>Quản lý bảo trì</Title>
          <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>Kanban board kéo thả theo tiến trình sửa chữa ({tickets.length} phiếu)</Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchTickets} style={{ borderRadius: 10, height: 42 }}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setCreateModalOpen(true)} style={{ borderRadius: 12, height: 44, fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>Tạo phiếu mới</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, minHeight: 500 }}>
        {columns.map((col) => {
          const colTickets = getTicketsByStatus(col.status);
          return (
            <div key={col.status} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.status)} style={{ background: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(248,250,252,0.8)', borderRadius: 16, padding: 16, border: `1px solid ${isDark ? 'rgba(51,65,85,0.4)' : 'rgba(226,232,240,0.8)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '8px 12px', borderRadius: 10, background: isDark ? 'rgba(51,65,85,0.4)' : 'rgba(226,232,240,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>{col.emoji}</span><span style={{ fontWeight: 700, fontSize: 14 }}>{col.label}</span></div>
                <Tag color={col.color} style={{ borderRadius: 8, fontWeight: 700, minWidth: 28, textAlign: 'center', border: 'none' }}>{colTickets.length}</Tag>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {colTickets.length === 0 ? <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 13, borderRadius: 10, border: `2px dashed ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}` }}>Kéo phiếu vào đây</div> : colTickets.map((ticket) => (
                  <div key={ticket.id} draggable onDragStart={() => setDraggedTicket(ticket)} onDragEnd={() => setDraggedTicket(null)} onClick={() => { setSelectedTicket(ticket); setDrawerOpen(true); }} style={{ background: isDark ? 'rgba(30,41,59,0.9)' : '#fff', border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`, borderLeftColor: borderColors[ticket.status], borderLeftWidth: 4, borderRadius: 12, padding: 12, cursor: 'grab', opacity: draggedTicket?.id === ticket.id ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}><Text strong style={{ fontSize: 14, color: '#6366f1' }}>{ticket.ticket_id}</Text>{ticket.total_cost > 0 && <Text style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>{ticket.total_cost.toLocaleString('vi-VN')} ₫</Text>}</div>
                    <Text style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>{ticket.customer_info.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{ticket.device_info}</Text>
                    {ticket.technician_name && <Tag icon={<UserOutlined />} style={{ borderRadius: 6, fontSize: 11, padding: '0 6px' }}>{ticket.technician_name}</Tag>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal title="🔧 Tạo phiếu bảo trì mới" open={createModalOpen} onOk={handleCreate} onCancel={() => { setCreateModalOpen(false); form.resetFields(); }} confirmLoading={createLoading} okText="Tạo phiếu" cancelText="Hủy" width={560} destroyOnHidden forceRender>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="customer_name" label="Tên khách hàng" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}><Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" /></Form.Item>
            <Form.Item name="customer_phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}><Input prefix={<PhoneOutlined />} placeholder="0901234567" /></Form.Item>
          </div>
          <Form.Item name="device_info" label="Thiết bị" rules={[{ required: true, message: 'Vui lòng nhập thông tin thiết bị' }]}><Input placeholder="VD: Dell XPS 15 9500" /></Form.Item>
          <Form.Item name="issue_description" label="Mô tả sự cố" rules={[{ required: true, message: 'Vui lòng mô tả sự cố' }]}><Input.TextArea rows={4} placeholder="Mô tả chi tiết vấn đề cần sửa chữa..." /></Form.Item>
        </Form>
      </Modal>

      <TicketDetailDrawer open={drawerOpen} ticket={selectedTicket} onClose={() => { setDrawerOpen(false); setSelectedTicket(null); }} onUpdate={fetchTickets} />
    </div>
  );
}

