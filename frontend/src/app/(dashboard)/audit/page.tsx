// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Typography, Button, Table, Tag, Space, Modal, Form, Select, Input,
  Statistic, Row, Col, Tooltip, Badge, Progress, Alert, Divider, Empty,
} from 'antd';
import {
  AuditOutlined, PlusOutlined, ScanOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, ReloadOutlined,
  WarningOutlined, FileSearchOutlined, CameraOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';
import CameraScanner from '@/components/serial-units/CameraScanner';

const { Title, Text } = Typography;

// ── Types ──────────────────────────────────────────────────────────────────
interface AuditSession {
  id: string;
  audit_code: string;
  warehouse_id: string;
  started_by: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  expected_items: number;
  scanned_items: number;
  discrepancies: { serial_number: string; type: 'missing' | 'extra' }[];
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'Đang kiểm kê', color: 'processing' },
  completed:   { label: 'Hoàn tất',     color: 'success' },
  cancelled:   { label: 'Đã huỷ',       color: 'default' },
};

const fmtDate = (s: string) =>
  s ? new Date(s).toLocaleString('vi-VN', { hour12: false }) : '—';

// ── Page ───────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const { isDark } = useTheme();

  const [sessions, setSessions]         = useState<AuditSession[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(false);

  const [warehouses, setWarehouses]     = useState<Warehouse[]>([]);

  // Create session
  const [createOpen, setCreateOpen]     = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm]                    = Form.useForm();

  // Scan modal
  const [scanSession, setScanSession]   = useState<AuditSession | null>(null);
  const [scanInput, setScanInput]       = useState('');
  const [scanLoading, setScanLoading]   = useState(false);
  const [scanMsg, setScanMsg]           = useState<{ type: 'success'|'error'|'warning'; text: string } | null>(null);
  const [cameraOpen, setCameraOpen]     = useState(false);

  // Complete confirm
  const [completeTarget, setCompleteTarget] = useState<AuditSession | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get('/api/audit', { params: { page: p, limit: 20 } });
      setSessions(res.data.sessions || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await api.get('/api/warehouses');
      setWarehouses(res.data.warehouses || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { fetchSessions(page); }, [page]);
  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  // ── Create session ──────────────────────────────────────────────────────
  const handleCreate = async (values: { warehouse_id: string; notes: string }) => {
    setCreateLoading(true);
    try {
      await api.post('/api/audit/start', values);
      setCreateOpen(false);
      createForm.resetFields();
      fetchSessions(1);
      setPage(1);
    } catch (e: any) {
      Modal.error({ title: 'Lỗi tạo phiên', content: e?.response?.data?.detail || 'Không thể tạo phiên kiểm kê.' });
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Scan serial ─────────────────────────────────────────────────────────
  const handleScan = async (code: string) => {
    if (!scanSession || !code.trim()) return;
    const serial = code.trim();
    setScanLoading(true);
    setScanMsg(null);
    try {
      await api.post(`/api/audit/${scanSession.id}/scan`, { serial_number: serial });
      setScanMsg({ type: 'success', text: `✅ Đã quét: ${serial}` });
      setScanInput('');
      // Refresh session data
      const res = await api.get(`/api/audit/${scanSession.id}`);
      setScanSession(res.data);
      fetchSessions(page);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Lỗi không xác định';
      setScanMsg({ type: detail.includes('already') ? 'warning' : 'error', text: `⚠️ ${detail}` });
    } finally {
      setScanLoading(false);
    }
  };

  // Camera detected
  const handleCameraDetect = (code: string) => {
    setScanInput(code);
    handleScan(code);
  };

  // ── Complete session ────────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!completeTarget) return;
    setCompleteLoading(true);
    try {
      const res = await api.post(`/api/audit/${completeTarget.id}/complete`);
      setCompleteTarget(null);
      fetchSessions(page);
      // Show discrepancy summary
      const d = res.data;
      const missing = (d.discrepancies || []).filter((x: any) => x.type === 'missing');
      const extra   = (d.discrepancies || []).filter((x: any) => x.type === 'extra');
      Modal.info({
        title: `Hoàn tất kiểm kê — ${d.audit_code}`,
        width: 560,
        content: (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Statistic title="Dự kiến"    value={d.expected_items} /></Col>
              <Col span={8}><Statistic title="Đã quét"    value={d.scanned_items} /></Col>
              <Col span={8}><Statistic title="Sai lệch"   value={missing.length + extra.length} valueStyle={{ color: (missing.length + extra.length) > 0 ? '#ef4444' : '#22c55e' }} /></Col>
            </Row>
            {missing.length > 0 && (
              <Alert type="error" message={`${missing.length} serial bị THIẾU`}
                description={<div style={{ maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>{missing.map((x: any) => x.serial_number).join(', ')}</div>}
                style={{ marginBottom: 8 }} />
            )}
            {extra.length > 0 && (
              <Alert type="warning" message={`${extra.length} serial DƯ THỪA (ngoài kế hoạch)`}
                description={<div style={{ maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>{extra.map((x: any) => x.serial_number).join(', ')}</div>}
                style={{ marginBottom: 8 }} />
            )}
            {missing.length === 0 && extra.length === 0 && (
              <Alert type="success" message="Kho hàng khớp hoàn toàn! Không có sai lệch." />
            )}
          </div>
        ),
      });
    } catch (e: any) {
      Modal.error({ title: 'Lỗi', content: e?.response?.data?.detail || 'Không thể hoàn tất phiên.' });
    } finally {
      setCompleteLoading(false);
    }
  };

  // ── Card style ──────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(30,41,59,0.9)' : '#fff',
    border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : '#e2e8f0'}`,
    borderRadius: 16,
    padding: '24px 28px',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.06)',
  };

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns: ColumnsType<AuditSession> = [
    {
      title: 'Mã phiên',
      dataIndex: 'audit_code',
      width: 130,
      render: (v) => <Text strong style={{ fontFamily: 'monospace', color: '#6366f1' }}>{v}</Text>,
    },
    {
      title: 'Kho',
      dataIndex: 'warehouse_id',
      width: 160,
      render: (id) => {
        const wh = warehouses.find(w => w.id === id);
        return wh ? <Tag color="blue">{wh.name}</Tag> : <Text type="secondary">{id.slice(-6)}</Text>;
      },
    },
    {
      title: 'Tiến độ',
      width: 180,
      render: (_, r) => {
        const pct = r.expected_items > 0 ? Math.round((r.scanned_items / r.expected_items) * 100) : 0;
        return (
          <div>
            <Progress percent={pct} size="small" strokeColor="#6366f1" status={r.status === 'completed' ? 'success' : 'active'} showInfo={false} style={{ marginBottom: 2 }} />
            <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>{r.scanned_items} / {r.expected_items} serial</Text>
          </div>
        );
      },
    },
    {
      title: 'Sai lệch',
      width: 100,
      render: (_, r) => {
        const n = r.discrepancies?.length || 0;
        return n > 0
          ? <Badge count={n} color="#ef4444" overflowCount={999} />
          : r.status === 'completed' ? <Tag color="success" icon={<CheckCircleOutlined />}>Khớp</Tag> : '—';
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (v) => {
        const s = STATUS_MAP[v] || { label: v, color: 'default' };
        return <Badge status={s.color as any} text={s.label} />;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      width: 160,
      render: fmtDate,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      ellipsis: true,
    },
    {
      title: 'Thao tác',
      width: 180,
      fixed: 'right' as const,
      render: (_, r) => (
        <Space>
          {r.status === 'in_progress' && (
            <>
              <Tooltip title="Quét Serial">
                <Button size="small" type="primary" icon={<ScanOutlined />}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none' }}
                  onClick={() => { setScanSession(r); setScanMsg(null); setScanInput(''); }}
                />
              </Tooltip>
              <Tooltip title="Hoàn tất kiểm kê">
                <Button size="small" icon={<CheckCircleOutlined />} style={{ color: '#22c55e', borderColor: '#22c55e' }}
                  onClick={() => setCompleteTarget(r)}
                />
              </Tooltip>
            </>
          )}
          {r.status === 'completed' && r.discrepancies?.length > 0 && (
            <Tooltip title="Xem báo cáo sai lệch">
              <Button size="small" icon={<FileSearchOutlined />}
                onClick={() => {
                  const missing = r.discrepancies.filter(x => x.type === 'missing');
                  const extra   = r.discrepancies.filter(x => x.type === 'extra');
                  Modal.info({
                    title: `Báo cáo — ${r.audit_code}`,
                    width: 540,
                    content: (
                      <div>
                        {missing.length > 0 && <Alert type="error" message={`${missing.length} serial THIẾU`} description={<div style={{ fontFamily: 'monospace', fontSize: 12 }}>{missing.map(x => x.serial_number).join(', ')}</div>} style={{ marginBottom: 8 }} />}
                        {extra.length > 0   && <Alert type="warning" message={`${extra.length} serial DƯ`}  description={<div style={{ fontFamily: 'monospace', fontSize: 12 }}>{extra.map(x => x.serial_number).join(', ')}</div>} />}
                      </div>
                    ),
                  });
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // ── Scan progress for active session ──────────────────────────────────────
  const scanPct = scanSession && scanSession.expected_items > 0
    ? Math.round((scanSession.scanned_items / scanSession.expected_items) * 100)
    : 0;

  // ── Summary stats ────────────────────────────────────────────────────────
  const totalCompleted  = sessions.filter(s => s.status === 'completed').length;
  const totalInProgress = sessions.filter(s => s.status === 'in_progress').length;
  const totalWithIssues = sessions.filter(s => s.discrepancies?.length > 0).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
            <AuditOutlined style={{ marginRight: 10, color: '#6366f1' }} />
            Kiểm kê Kho định kỳ
          </Title>
          <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 14 }}>
            Quản lý và thực hiện các phiên kiểm kê kho hàng theo Serial Number
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchSessions(page)}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none' }}
            onClick={() => setCreateOpen(true)}
          >
            Tạo phiên kiểm kê
          </Button>
        </Space>
      </div>

      {/* KPI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Đang kiểm kê', value: totalInProgress, icon: <ClockCircleOutlined />, color: '#6366f1' },
          { label: 'Hoàn tất',     value: totalCompleted,  icon: <CheckCircleOutlined />, color: '#22c55e' },
          { label: 'Có sai lệch',  value: totalWithIssues, icon: <ExclamationCircleOutlined />, color: '#ef4444' },
          { label: 'Tổng phiên',   value: total,           icon: <AuditOutlined />,       color: '#f59e0b' },
        ].map(k => (
          <Col xs={12} sm={6} key={k.label}>
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: k.color, flexShrink: 0 }}>
                {k.icon}
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>{k.value}</div>
                <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>{k.label}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <div style={cardStyle}>
        <Table
          dataSource={sessions}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          locale={{ emptyText: <Empty description="Chưa có phiên kiểm kê nào" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={{
            current: page, pageSize: 20, total,
            onChange: setPage,
            showTotal: (t) => `Tổng ${t} phiên`,
          }}
          rowClassName={(r) => r.status === 'in_progress' ? 'audit-row-active' : ''}
        />
      </div>

      {/* ── Modal: Tạo phiên ── */}
      <Modal
        title={<Space><PlusOutlined style={{ color: '#6366f1' }} /><span>Tạo phiên kiểm kê mới</span></Space>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        okText="Bắt đầu kiểm kê"
        confirmLoading={createLoading}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none' } }}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 8 }}>
          <Form.Item name="warehouse_id" label="Kho kiểm kê" rules={[{ required: true, message: 'Vui lòng chọn kho' }]}>
            <Select
              placeholder="Chọn kho"
              options={warehouses.map(w => ({ value: w.id, label: `${w.name} (${w.code})` }))}
              showSearch
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú (tuỳ chọn)">
            <Input.TextArea rows={2} placeholder="Ví dụ: Kiểm kê định kỳ tháng 5/2026..." />
          </Form.Item>
        </Form>
        <Alert
          type="info"
          showIcon
          message="Hệ thống sẽ tự động tính toán số lượng Serial Unit dự kiến trong kho được chọn."
          style={{ marginTop: 4 }}
        />
      </Modal>

      {/* ── Modal: Quét Serial ── */}
      <Modal
        title={
          <Space>
            <ScanOutlined style={{ color: '#6366f1' }} />
            <span>Quét Serial — {scanSession?.audit_code}</span>
          </Space>
        }
        open={!!scanSession}
        onCancel={() => { setScanSession(null); setScanMsg(null); setScanInput(''); fetchSessions(page); }}
        footer={[
          <Button key="cam" icon={<CameraOutlined />} onClick={() => setCameraOpen(true)}>
            Dùng Camera
          </Button>,
          <Button key="close" onClick={() => { setScanSession(null); setScanMsg(null); setScanInput(''); fetchSessions(page); }}>
            Đóng
          </Button>,
        ]}
        width={560}
        destroyOnHidden
      >
        {scanSession && (
          <div>
            {/* Progress */}
            <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 16, background: isDark ? 'rgba(99,102,241,0.1)' : '#f5f3ff' }}>
              <Row gutter={16}>
                <Col span={8}><Statistic title="Dự kiến"  value={scanSession.expected_items} /></Col>
                <Col span={8}><Statistic title="Đã quét"  value={scanSession.scanned_items}  valueStyle={{ color: '#6366f1' }} /></Col>
                <Col span={8}><Statistic title="Còn lại"  value={Math.max(0, scanSession.expected_items - scanSession.scanned_items)} /></Col>
              </Row>
              <Progress percent={scanPct} strokeColor={{ from: '#6366f1', to: '#8b5cf6' }} style={{ marginTop: 12 }} />
            </div>

            {/* Input */}
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ color: isDark ? '#f1f5f9' : '#0f172a', display: 'block', marginBottom: 8 }}>
                Nhập hoặc quét mã Serial:
              </Text>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onPressEnter={() => handleScan(scanInput)}
                  placeholder="Nhập Serial Number rồi nhấn Enter..."
                  size="large"
                  autoFocus
                  allowClear
                />
                <Button
                  type="primary"
                  size="large"
                  loading={scanLoading}
                  icon={<ScanOutlined />}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', minWidth: 90 }}
                  onClick={() => handleScan(scanInput)}
                >
                  Quét
                </Button>
              </Space.Compact>
            </div>

            {/* Scan result */}
            {scanMsg && (
              <Alert
                type={scanMsg.type}
                message={scanMsg.text}
                showIcon
                closable
                onClose={() => setScanMsg(null)}
                style={{ marginBottom: 8 }}
              />
            )}

            <Divider style={{ margin: '12px 0' }} />
            <Alert
              type="info"
              showIcon
              message='Hướng dẫn: Quét từng Serial Number trên sản phẩm. Nhấn "Dùng Camera" để quét bằng Camera thiết bị.'
              style={{ fontSize: 12 }}
            />
          </div>
        )}
      </Modal>

      {/* ── Camera Scanner ── */}
      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDetected={(code) => { setCameraOpen(false); handleCameraDetect(code); }}
        title="Quét Serial bằng Camera"
      />

      {/* ── Confirm Complete ── */}
      <Modal
        title={<Space><WarningOutlined style={{ color: '#f59e0b' }} /><span>Xác nhận hoàn tất kiểm kê</span></Space>}
        open={!!completeTarget}
        onCancel={() => setCompleteTarget(null)}
        onOk={handleComplete}
        okText="Hoàn tất & Tổng kết"
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#22c55e,#10b981)', border: 'none' } }}
        confirmLoading={completeLoading}
      >
        {completeTarget && (
          <div>
            <Text>Bạn sắp kết thúc phiên <Text strong>{completeTarget.audit_code}</Text>.</Text>
            <br /><br />
            <Text>Hệ thống sẽ so sánh <Text strong style={{ color: '#6366f1' }}>{completeTarget.scanned_items} serial đã quét</Text> với <Text strong>{completeTarget.expected_items} serial dự kiến</Text> và xuất báo cáo sai lệch.</Text>
            <br /><br />
            <Alert type="warning" showIcon message="Hành động này không thể hoàn tác. Phiên kiểm kê sẽ bị khoá sau khi hoàn tất." />
          </div>
        )}
      </Modal>
    </div>
  );
}
