// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  App, Avatar, Badge, Button, Card, Col, Descriptions, Drawer,
  Form, Input, Modal, Popconfirm, Row, Select, Space, Statistic,
  Switch, Table, Tag, Tooltip, Typography,
} from 'antd';
import {
  UserAddOutlined, SearchOutlined, ReloadOutlined, EditOutlined,
  DeleteOutlined, KeyOutlined, TeamOutlined, UserOutlined,
  ShopOutlined, ToolOutlined, CrownOutlined, LockOutlined,
  CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';

const { Title, Text } = Typography;

type UserRole = 'admin' | 'technician' | 'sales';

interface StaffUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  technician: 'Kỹ thuật viên',
  sales: 'Nhân viên bán hàng',
};
const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#6366f1',
  technician: '#f59e0b',
  sales: '#22c55e',
};
const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  admin: <CrownOutlined />,
  technician: <ToolOutlined />,
  sales: <ShopOutlined />,
};

const avatarGradients = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#22c55e,#10b981)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
  'linear-gradient(135deg,#0ea5e9,#3b82f6)',
  'linear-gradient(135deg,#14b8a6,#06b6d4)',
];

export default function StaffPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();
  const { isDark } = useTheme();

  // ── Role guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.role !== 'admin') {
      message.error('Bạn không có quyền truy cập trang này');
      router.replace('/dashboard');
    }
  }, [user, router, message]);

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [detailUser, setDetailUser] = useState<StaffUser | null>(null);
  const [pwdModalUser, setPwdModalUser] = useState<StaffUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/api/users', { params });
      setUsers(res.data.users || []);
    } catch {
      message.error('Không tải được danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, message]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const vals = await addForm.validateFields();
    setSaving(true);
    try {
      await api.post('/api/users', vals);
      message.success('Tạo tài khoản thành công');
      setAddOpen(false);
      addForm.resetFields();
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Lỗi tạo tài khoản');
    } finally { setSaving(false); }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = (u: StaffUser) => {
    setEditUser(u);
    editForm.setFieldsValue({ full_name: u.full_name, role: u.role, email: u.email, phone: u.phone });
  };

  const handleEdit = async () => {
    if (!editUser) return;
    const vals = await editForm.validateFields();
    setSaving(true);
    try {
      await api.put(`/api/users/${editUser.id}`, vals);
      message.success('Cập nhật thành công');
      setEditUser(null);
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Lỗi cập nhật');
    } finally { setSaving(false); }
  };

  // ── Reset password ──────────────────────────────────────────────────────────
  const handleResetPwd = async () => {
    if (!pwdModalUser) return;
    const vals = await pwdForm.validateFields();
    setSaving(true);
    try {
      await api.post(`/api/users/${pwdModalUser.id}/reset-password`, vals);
      message.success('Đặt lại mật khẩu thành công');
      setPwdModalUser(null);
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Lỗi đặt lại mật khẩu');
    } finally { setSaving(false); }
  };

  // ── Toggle active ───────────────────────────────────────────────────────────
  const handleToggle = async (u: StaffUser) => {
    try {
      const res = await api.patch(`/api/users/${u.id}/toggle-active`);
      message.success(res.data.is_active ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản');
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Lỗi thao tác');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/users/${id}`);
      message.success('Đã xóa tài khoản');
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Lỗi xóa tài khoản');
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const total = users.length;
  const activeCount = users.filter(u => u.is_active).length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const techCount = users.filter(u => u.role === 'technician').length;
  const salesCount = users.filter(u => u.role === 'sales').length;

  const cardBase: React.CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
    background: isDark ? 'rgba(30,41,59,0.85)' : '#fff',
  };

  // ── Role tag renderer ───────────────────────────────────────────────────────
  const RoleTag = ({ role }: { role: UserRole }) => (
    <Tag icon={ROLE_ICONS[role]} color={ROLE_COLORS[role]} style={{ fontWeight: 600 }}>
      {ROLE_LABELS[role]}
    </Tag>
  );

  if (user && user.role !== 'admin') return null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            <TeamOutlined style={{ marginRight: 8, color: '#6366f1' }} />Quản lý Nhân sự
          </Title>
          <Text style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>
            Quản lý tài khoản và phân quyền nhân viên trong hệ thống CHIMS
          </Text>
        </div>
        <Button
          type="primary" icon={<UserAddOutlined />}
          onClick={() => { setAddOpen(true); addForm.resetFields(); }}
          style={{ borderRadius: 12, fontWeight: 600, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', height: 40 }}
        >
          Thêm nhân viên
        </Button>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Tổng tài khoản', value: total, color: '#6366f1', bg: isDark ? 'rgba(99,102,241,0.08)' : 'linear-gradient(135deg,#f0f0ff,#e8e8ff)', border: 'rgba(99,102,241,0.15)' },
          { title: 'Đang hoạt động', value: activeCount, color: '#22c55e', bg: isDark ? 'rgba(34,197,94,0.08)' : 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: 'rgba(34,197,94,0.15)' },
          { title: 'Quản trị viên', value: adminCount, color: '#8b5cf6', bg: isDark ? 'rgba(139,92,246,0.08)' : 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: 'rgba(139,92,246,0.15)' },
          { title: 'Kỹ thuật viên', value: techCount, color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: 'rgba(245,158,11,0.15)' },
          { title: 'Nhân viên bán hàng', value: salesCount, color: '#0ea5e9', bg: isDark ? 'rgba(14,165,233,0.08)' : 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: 'rgba(14,165,233,0.15)' },
        ].map(k => (
          <Col xs={12} sm={8} xl={4} key={k.title} style={{ flex: 1 }}>
            <Card style={{ borderRadius: 16, background: k.bg, border: `1px solid ${k.border}` }}>
              <Statistic title={k.title} value={k.value} styles={{ content: { color: k.color, fontWeight: 800 } }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filter bar */}
      <Card style={{ ...cardBase, marginBottom: 20, borderRadius: 14 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={10}>
            <Input
              placeholder="Tìm theo tên, username, email..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              value={roleFilter || undefined}
              onChange={v => setRoleFilter(v || '')}
              placeholder="Lọc theo vai trò"
              allowClear style={{ width: '100%' }}
              options={[
                { value: 'admin', label: 'Quản trị viên' },
                { value: 'technician', label: 'Kỹ thuật viên' },
                { value: 'sales', label: 'Nhân viên bán hàng' },
              ]}
            />
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchUsers}>Làm mới</Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`, background: isDark ? 'rgba(30,41,59,0.8)' : '#fff' }}>
        <Table
          loading={loading}
          dataSource={users}
          rowKey="id"
          pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} / ${t} tài khoản` }}
          columns={[
            {
              title: 'Nhân viên',
              render: (_: unknown, u: StaffUser) => (
                <Space>
                  <Avatar
                    size={40}
                    style={{ background: avatarGradients[u.username.charCodeAt(0) % avatarGradients.length], fontWeight: 700, fontSize: 16, flexShrink: 0 }}
                  >
                    {u.full_name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>{u.full_name}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>@{u.username}</Text>
                  </div>
                </Space>
              ),
            },
            { title: 'Vai trò', dataIndex: 'role', width: 180, render: (v: UserRole) => <RoleTag role={v} /> },
            { title: 'Email', dataIndex: 'email', render: (v: string) => v || '—' },
            { title: 'SĐT', dataIndex: 'phone', width: 130, render: (v: string) => v || '—' },
            {
              title: 'Trạng thái', dataIndex: 'is_active', width: 130, align: 'center',
              render: (v: boolean, u: StaffUser) => (
                <Tooltip title={v ? 'Nhấn để vô hiệu hóa' : 'Nhấn để kích hoạt'}>
                  <Switch
                    checked={v}
                    checkedChildren={<CheckCircleOutlined />}
                    unCheckedChildren={<StopOutlined />}
                    onChange={() => handleToggle(u)}
                    disabled={u.id === user?.id}
                  />
                </Tooltip>
              ),
            },
            {
              title: 'Hành động', width: 160, align: 'center',
              render: (_: unknown, u: StaffUser) => (
                <Space>
                  <Tooltip title="Xem chi tiết">
                    <Button size="small" icon={<UserOutlined />} onClick={() => setDetailUser(u)} />
                  </Tooltip>
                  <Tooltip title="Chỉnh sửa">
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(u)} />
                  </Tooltip>
                  <Tooltip title="Đặt lại mật khẩu">
                    <Button size="small" icon={<KeyOutlined />} onClick={() => { setPwdModalUser(u); }} />
                  </Tooltip>
                  <Tooltip title={u.id === user?.id ? 'Không thể xóa tài khoản của chính mình' : 'Xóa'}>
                    <Popconfirm
                      title={`Xóa tài khoản "${u.full_name}"?`}
                      description="Thao tác này không thể hoàn tác."
                      onConfirm={() => handleDelete(u.id)}
                      okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                      disabled={u.id === user?.id}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} disabled={u.id === user?.id} />
                    </Popconfirm>
                  </Tooltip>
                </Space>
              ),
            },
          ]}
        />
      </div>

      {/* ── Add Modal ── */}
      <Modal open={addOpen} onCancel={() => setAddOpen(false)} onOk={handleCreate}
        title={<Space><UserAddOutlined style={{ color: '#6366f1' }} /><span>Thêm nhân viên mới</span></Space>}
        okText="Tạo tài khoản" cancelText="Hủy" confirmLoading={saving}>
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Bắt buộc' }, { min: 3, message: 'Tối thiểu 3 ký tự' }]}>
                <Input prefix={<UserOutlined />} placeholder="vd: techguy" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="full_name" label="Họ tên đầy đủ" rules={[{ required: true, message: 'Bắt buộc' }]}>
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Ít nhất 6 ký tự" />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" initialValue="sales" rules={[{ required: true }]}>
            <Select options={[
              { value: 'admin', label: <Space><CrownOutlined />Quản trị viên</Space> },
              { value: 'technician', label: <Space><ToolOutlined />Kỹ thuật viên</Space> },
              { value: 'sales', label: <Space><ShopOutlined />Nhân viên bán hàng</Space> },
            ]} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="email" label="Email"><Input placeholder="example@company.com" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Số điện thoại"><Input placeholder="+84 xxx xxx xxx" /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={!!editUser} onCancel={() => setEditUser(null)} onOk={handleEdit}
        title={<Space><EditOutlined style={{ color: '#6366f1' }} /><span>Chỉnh sửa: {editUser?.full_name}</span></Space>}
        okText="Lưu thay đổi" cancelText="Hủy" confirmLoading={saving}>
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="full_name" label="Họ tên đầy đủ" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select options={[
              { value: 'admin', label: <Space><CrownOutlined />Quản trị viên</Space> },
              { value: 'technician', label: <Space><ToolOutlined />Kỹ thuật viên</Space> },
              { value: 'sales', label: <Space><ShopOutlined />Nhân viên bán hàng</Space> },
            ]} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="email" label="Email"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="SĐT"><Input /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal open={!!pwdModalUser}
        onCancel={() => { setPwdModalUser(null); pwdForm.resetFields(); }}
        onOk={handleResetPwd}
        title={<Space><KeyOutlined style={{ color: '#f59e0b' }} /><span>Đặt lại mật khẩu: {pwdModalUser?.full_name}</span></Space>}
        okText="Đặt lại mật khẩu" cancelText="Hủy" confirmLoading={saving}>
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="new_password" label="Mật khẩu mới"
            rules={[{ required: true, message: 'Bắt buộc' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Ít nhất 6 ký tự" />
          </Form.Item>
          <Form.Item name="confirm" label="Xác nhận mật khẩu"
            dependencies={['new_password']}
            rules={[{ required: true }, ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
              },
            })]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Detail Drawer ── */}
      <Drawer
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        title={
          detailUser ? (
            <Space>
              <Avatar size={36} style={{ background: avatarGradients[detailUser.username.charCodeAt(0) % avatarGradients.length], fontWeight: 700 }}>
                {detailUser.full_name.charAt(0).toUpperCase()}
              </Avatar>
              <span>{detailUser.full_name}</span>
              <Badge status={detailUser.is_active ? 'success' : 'error'} text={detailUser.is_active ? 'Đang hoạt động' : 'Đã vô hiệu hóa'} />
            </Space>
          ) : 'Chi tiết nhân viên'
        }
        size="large"
      >
        {detailUser && (
          <Space orientation="vertical" style={{ width: '100%' }} size={20}>
            {/* Role badge */}
            <Card size="small" style={{ textAlign: 'center', borderRadius: 14, background: isDark ? 'rgba(99,102,241,0.08)' : '#f8fafc' }}>
              <div style={{ fontSize: 36, marginBottom: 4 }}>
                {detailUser.role === 'admin' ? '👑' : detailUser.role === 'technician' ? '🔧' : '🛒'}
              </div>
              <RoleTag role={detailUser.role} />
            </Card>

            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Username">
                <Text code>@{detailUser.username}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Họ tên">{detailUser.full_name}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailUser.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{detailUser.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={detailUser.is_active ? 'success' : 'error'}>
                  {detailUser.is_active ? '✅ Đang hoạt động' : '🚫 Đã vô hiệu hóa'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {detailUser.created_at ? new Date(detailUser.created_at).toLocaleDateString('vi-VN') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Cập nhật">
                {detailUser.updated_at ? new Date(detailUser.updated_at).toLocaleDateString('vi-VN') : '—'}
              </Descriptions.Item>
            </Descriptions>

            <Space wrap>
              <Button icon={<EditOutlined />} onClick={() => { setDetailUser(null); openEdit(detailUser); }}>Chỉnh sửa</Button>
              <Button icon={<KeyOutlined />} onClick={() => { setDetailUser(null); setPwdModalUser(detailUser); }}>
                Đặt lại mật khẩu
              </Button>
              <Button
                danger={detailUser.is_active}
                icon={detailUser.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => { handleToggle(detailUser); setDetailUser(null); }}
                disabled={detailUser.id === user?.id}
              >
                {detailUser.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
              </Button>
            </Space>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
