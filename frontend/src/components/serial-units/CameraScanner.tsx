// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Button, Select, Alert, Space, Typography, Badge } from 'antd';
import { CameraOutlined, StopOutlined, ScanOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CameraScannerProps {
  open: boolean;
  onClose: () => void;
  /** Called each time a new barcode is successfully decoded */
  onDetected: (code: string) => void;
  /** Title shown in the modal */
  title?: string;
}

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
}

export default function CameraScanner({ open, onClose, onDetected, title = 'Quét mã vạch bằng Camera' }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readerRef = useRef<any>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [lastCode, setLastCode] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [error, setError] = useState('');

  // Load ZXing lazily to avoid SSR issues
  const loadZxing = useCallback(async () => {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    readerRef.current = new BrowserMultiFormatReader();
  }, []);

  // Enumerate cameras on mount
  const enumerateCameras = useCallback(async () => {
    try {
      // Ask permission first so labels are populated
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` }));
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        // Prefer back camera on mobile
        const back = videoDevices.find(d => /back|rear|environment/i.test(d.label));
        setSelectedCamera(back?.deviceId || videoDevices[videoDevices.length - 1].deviceId);
      }
    } catch {
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập trình duyệt.');
    }
  }, [selectedCamera]);

  useEffect(() => {
    if (open) {
      setError('');
      setLastCode('');
      setScanCount(0);
      loadZxing();
      enumerateCameras();
    } else {
      stopScan();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopScan = useCallback(() => {
    setScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (readerRef.current) {
      try { readerRef.current.reset?.(); } catch { /* ignore */ }
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScan = useCallback(async () => {
    if (!selectedCamera) { setError('Chưa chọn camera'); return; }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedCamera }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      // Poll canvas every 300ms for a barcode
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || !readerRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState < video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const result = await readerRef.current.decodeFromCanvas(canvas);
          if (result) {
            const code = result.getText().trim();
            if (code && code !== lastCode) {
              setLastCode(code);
              setScanCount(prev => prev + 1);
              onDetected(code);
              // Visual flash
              canvas.style.outline = '4px solid #22c55e';
              setTimeout(() => { if (canvas) canvas.style.outline = 'none'; }, 400);
            }
          }
        } catch {
          // No barcode found in this frame — normal, keep scanning
        }
      }, 300);
    } catch (err: any) {
      setError(`Không thể mở camera: ${err?.message || 'Lỗi không xác định'}`);
      setScanning(false);
    }
  }, [selectedCamera, lastCode, onDetected]);

  // Reset lastCode after 1.5s so the same barcode can be re-scanned
  useEffect(() => {
    if (!lastCode) return;
    const t = setTimeout(() => setLastCode(''), 1500);
    return () => clearTimeout(t);
  }, [lastCode]);

  const handleClose = () => {
    stopScan();
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
          {scanCount > 0 && <Badge count={scanCount} style={{ backgroundColor: '#22c55e' }} overflowCount={999} />}
        </Space>
      }
      footer={
        <Space>
          {!scanning
            ? <Button type="primary" icon={<CameraOutlined />} onClick={startScan} disabled={!selectedCamera || cameras.length === 0}
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none' }}>
                Bắt đầu quét
              </Button>
            : <Button danger icon={<StopOutlined />} onClick={stopScan}>Dừng</Button>
          }
          <Button onClick={handleClose}>Đóng</Button>
        </Space>
      }
      width={640}
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: '100%' }} size={12}>
        {/* Camera selector */}
        {cameras.length > 1 && (
          <Select
            value={selectedCamera}
            onChange={v => { stopScan(); setSelectedCamera(v); }}
            style={{ width: '100%' }}
            options={cameras.map(c => ({ value: c.deviceId, label: c.label }))}
            placeholder="Chọn camera"
          />
        )}
        {cameras.length === 0 && !error && (
          <Alert title="Đang tìm camera..." type="info" showIcon />
        )}

        {/* Error */}
        {error && <Alert title={error} type="error" showIcon />}

        {/* Video feed */}
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0f172a', minHeight: 280 }}>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', display: 'block', borderRadius: 12 }}
          />
          {/* Scan overlay */}
          {scanning && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
            }}>
              <div style={{
                width: 220, height: 140, border: '2px solid #6366f1', borderRadius: 8,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              }} />
              {/* Scan line animation */}
              <style>{`
                @keyframes scanLine { 0%{top:30%} 50%{top:70%} 100%{top:30%} }
                .scan-line { animation: scanLine 2s ease-in-out infinite; }
              `}</style>
              <div className="scan-line" style={{
                position: 'absolute', left: 'calc(50% - 110px)', width: 220, height: 2,
                background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
              }} />
            </div>
          )}
          {!scanning && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              <ScanOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Nhấn "Bắt đầu quét" để khởi động camera</Text>
            </div>
          )}
        </div>

        {/* Hidden canvas for decoding */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Last detected */}
        {lastCode && (
          <Alert
            title={<span>✅ Đã quét: <strong style={{ fontFamily: 'monospace', color: '#6366f1' }}>{lastCode}</strong></span>}
            type="success"
          />
        )}

        <Text type="secondary" style={{ fontSize: 12 }}>
          Hướng camera vào mã vạch hoặc QR code của linh kiện. Hệ thống sẽ tự động nhận dạng và ghi nhận mã vào danh sách.
        </Text>
      </Space>
    </Modal>
  );
}
