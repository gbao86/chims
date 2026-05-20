// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Alert, Space, Typography, Badge, Tag } from 'antd';
import { CameraOutlined, StopOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CameraScannerProps {
  open: boolean;
  onClose: () => void;
  /** Fired each time a new barcode/QR is detected */
  onDetected: (code: string) => void;
  title?: string;
}

// ── Unique DOM id — avoids conflicts when component mounts twice ──────────────
const READER_ID = 'chims-html5qr-reader';

export default function CameraScanner({
  open,
  onClose,
  onDetected,
  title = 'Quét mã vạch bằng Camera',
}: CameraScannerProps) {
  const scannerRef  = useRef<any>(null);   // Html5Qrcode instance
  const lastCodeRef = useRef('');
  const lastTsRef   = useRef(0);

  const [scanning,  setScanning]  = useState(false);
  const [lastCode,  setLastCode]  = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [error,     setError]     = useState('');

  // ── Stop & destroy scanner ────────────────────────────────────────────────
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // ── Start scanner (html5-qrcode handles everything) ───────────────────────
  const startScanner = async () => {
    setError('');
    try {
      // Dynamic import — avoids SSR crash (window is undefined on server)
      const { Html5Qrcode } = await import('html5-qrcode');

      // Make sure previous instance is gone
      await stopScanner();

      const qr = new Html5Qrcode(READER_ID);
      scannerRef.current = qr;

      await qr.start(
        { facingMode: 'environment' }, // prefer back camera on mobile
        {
          fps: 15,                            // frames per second to scan
          qrbox: { width: 280, height: 180 }, // scanning box — wider for barcodes
          aspectRatio: 1.7,                   // 16:9-ish
        },
        // ── Success callback ─────────────────────────────────────────────
        (decodedText: string) => {
          const now = Date.now();
          const code = decodedText.trim();
          // Debounce: ignore same code within 1.5 s
          if (code === lastCodeRef.current && now - lastTsRef.current < 1500) return;
          lastCodeRef.current = code;
          lastTsRef.current   = now;

          setLastCode(code);
          setScanCount(prev => prev + 1);
          onDetected(code);
        },
        // ── Error callback (fires on every frame with no barcode — suppress it) ─
        () => { /* no-op */ },
      );

      setScanning(true);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('permission')) {
        setError('Trình duyệt từ chối quyền Camera. Nhấn vào biểu tượng khoá trên thanh địa chỉ để cấp quyền.');
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
        setError('Không tìm thấy camera trên thiết bị này.');
      } else {
        setError(`Lỗi khởi động camera: ${msg}`);
      }
      setScanning(false);
    }
  };

  // ── When modal opens → auto-start; when closes → stop ────────────────────
  useEffect(() => {
    if (open) {
      setLastCode('');
      setScanCount(0);
      setError('');
      lastCodeRef.current = '';
      // Small delay lets React render the <div id={READER_ID}> first
      const t = setTimeout(() => startScanner(), 150);
      return () => clearTimeout(t);
    } else {
      stopScanner();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space>
          <CameraOutlined style={{ color: '#6366f1' }} />
          <span>{title}</span>
          <Tag color="green" style={{ fontSize: 10, lineHeight: '16px' }}>html5-qrcode ⚡</Tag>
          {scanCount > 0 && (
            <Badge count={scanCount} style={{ backgroundColor: '#22c55e' }} overflowCount={999} />
          )}
        </Space>
      }
      footer={
        <Space>
          {scanning
            ? <Button danger icon={<StopOutlined />} onClick={stopScanner}>Dừng Camera</Button>
            : <Button type="primary" icon={<CameraOutlined />} onClick={startScanner}
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none' }}>
                Khởi động lại
              </Button>
          }
          <Button onClick={handleClose}>Đóng</Button>
        </Space>
      }
      width={600}
      destroyOnHidden
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={10}>
        {error && <Alert message={error} type="error" showIcon />}

        {/* html5-qrcode renders its own camera UI inside this div */}
        <div
          id={READER_ID}
          style={{
            width: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            minHeight: scanning ? 0 : 280,
            background: '#0f172a',
          }}
        />

        {/* Last detected code */}
        {lastCode && (
          <Alert
            message={
              <span>
                ✅ Đã quét:{' '}
                <strong style={{ fontFamily: 'monospace', color: '#6366f1', fontSize: 15 }}>
                  {lastCode}
                </strong>
              </span>
            }
            type="success"
          />
        )}

        <Text type="secondary" style={{ fontSize: 12 }}>
          Camera tự động bật khi mở hộp thoại. Hướng vào mã vạch hoặc QR — hệ thống nhận diện
          tự động và phát tiếng Bíp khi thành công.
        </Text>
      </Space>
    </Modal>
  );
}
