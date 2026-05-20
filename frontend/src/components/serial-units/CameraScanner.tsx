// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Button, Select, Alert, Space, Typography, Badge, Tag } from 'antd';
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

// ── Audio Beep (no external file — pure AudioContext) ─────────────────────────
function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch { /* ignore */ }
}

// ── Haptic Feedback ───────────────────────────────────────────────────────────
function vibrate() {
  try { navigator.vibrate?.(60); } catch { /* ignore */ }
}

// ── Detect native BarcodeDetector support ─────────────────────────────────────
function hasBarcodeDetectorAPI(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export default function CameraScanner({
  open, onClose, onDetected, title = 'Quét mã vạch bằng Camera',
}: CameraScannerProps) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const rafRef       = useRef<number | null>(null);
  const detectorRef  = useRef<any>(null);   // Native BarcodeDetector
  const zxingRef     = useRef<any>(null);   // ZXing fallback
  const lastCodeRef  = useRef('');
  const lastCodeTsRef = useRef(0);

  const [cameras, setCameras]       = useState<{ deviceId: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [scanning, setScanning]     = useState(false);
  const [lastCode, setLastCode]     = useState('');
  const [scanCount, setScanCount]   = useState(0);
  const [error, setError]           = useState('');
  const [apiMode, setApiMode]       = useState<'native' | 'zxing' | ''>('');

  // ── Initialize detectors (lazy) ───────────────────────────────────────────
  const initDetectors = useCallback(async () => {
    if (hasBarcodeDetectorAPI()) {
      try {
        const det = new (window as any).BarcodeDetector({
          // Supports most common barcode formats used in retail / inventory
          formats: [
            'qr_code', 'code_128', 'ean_13', 'ean_8',
            'code_39', 'code_93', 'itf', 'pdf417', 'data_matrix', 'aztec',
          ],
        });
        detectorRef.current = det;
        setApiMode('native');
        return;
      } catch { /* fallthrough */ }
    }
    // Fallback: ZXing (works on Safari/iOS)
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    zxingRef.current = new BrowserMultiFormatReader();
    setApiMode('zxing');
  }, []);

  // ── Enumerate available cameras ───────────────────────────────────────────
  const enumerateCameras = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` }));
      setCameras(cams);
      if (cams.length > 0 && !selectedCamera) {
        // Prefer back/environment camera on mobile devices
        const back = cams.find(d => /back|rear|environment/i.test(d.label));
        setSelectedCamera(back?.deviceId || cams[cams.length - 1].deviceId);
      }
    } catch {
      setError('Không thể truy cập camera. Kiểm tra quyền truy cập trình duyệt.');
    }
  }, [selectedCamera]);

  useEffect(() => {
    if (open) {
      setError('');
      setLastCode('');
      setScanCount(0);
      lastCodeRef.current = '';
      lastCodeTsRef.current = 0;
      initDetectors();
      enumerateCameras();
    } else {
      stopScan();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle a successfully detected barcode ────────────────────────────────
  const handleCode = useCallback((code: string) => {
    const now = Date.now();
    // Debounce: same code must wait ≥1.5 s before firing again (prevents duplicates)
    if (code === lastCodeRef.current && now - lastCodeTsRef.current < 1500) return;
    lastCodeRef.current = code;
    lastCodeTsRef.current = now;

    setLastCode(code);
    setScanCount(prev => prev + 1);
    playBeep();
    vibrate();
    onDetected(code);
  }, [onDetected]);

  // ── requestAnimationFrame scan loop ───────────────────────────────────────
  const scanLoop = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    // ── Path A: Native Barcode Detection API (GPU/hardware accelerated) ──────
    if (detectorRef.current) {
      try {
        const barcodes: any[] = await detectorRef.current.detect(video);
        if (barcodes.length > 0) {
          handleCode(barcodes[0].rawValue.trim());
        }
      } catch { /* no barcode in this frame — normal */ }
    }
    // ── Path B: ZXing fallback (canvas decode via WebAssembly/JS) ────────────
    else if (zxingRef.current && canvas) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        try {
          const result = await zxingRef.current.decodeFromCanvas(canvas);
          if (result) handleCode(result.getText().trim());
        } catch { /* no barcode */ }
      }
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, [handleCode]);

  // ── Stop camera stream & RAF loop ─────────────────────────────────────────
  const stopScan = useCallback(() => {
    setScanning(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try { zxingRef.current?.reset?.(); } catch { /* ignore */ }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── Start camera stream & RAF loop ────────────────────────────────────────
  const startScan = useCallback(async () => {
    if (!selectedCamera) { setError('Chưa chọn camera'); return; }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedCamera },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      setError(`Không thể mở camera: ${err?.message || 'Lỗi không xác định'}`);
    }
  }, [selectedCamera, scanLoop]);

  const handleClose = () => { stopScan(); onClose(); };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space>
          <CameraOutlined style={{ color: '#6366f1' }} />
          <span>{title}</span>
          {/* Show which engine is active */}
          {apiMode === 'native' && (
            <Tag color="green" style={{ fontSize: 10, lineHeight: '16px' }}>⚡ Native API</Tag>
          )}
          {apiMode === 'zxing' && (
            <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px' }}>ZXing Fallback</Tag>
          )}
          {scanCount > 0 && (
            <Badge count={scanCount} style={{ backgroundColor: '#22c55e' }} overflowCount={999} />
          )}
        </Space>
      }
      footer={
        <Space>
          {!scanning
            ? (
              <Button
                type="primary"
                icon={<CameraOutlined />}
                onClick={startScan}
                disabled={!selectedCamera || cameras.length === 0}
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none' }}
              >
                Bắt đầu quét
              </Button>
            )
            : <Button danger icon={<StopOutlined />} onClick={stopScan}>Dừng</Button>
          }
          <Button onClick={handleClose}>Đóng</Button>
        </Space>
      }
      width={640}
      destroyOnHidden
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>

        {/* Camera selector (shown only when >1 camera available) */}
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
          <Alert message="Đang tìm camera..." type="info" showIcon />
        )}
        {error && <Alert message={error} type="error" showIcon />}

        {/* Video feed with scan overlay */}
        <div style={{
          position: 'relative', borderRadius: 12, overflow: 'hidden',
          background: '#0f172a', minHeight: 280,
        }}>
          <video
            ref={videoRef} muted playsInline
            style={{ width: '100%', display: 'block', borderRadius: 12 }}
          />

          {/* Scanning overlay: dim surround + animated scan line */}
          {scanning && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 240, height: 150,
                border: '2px solid #6366f1', borderRadius: 8,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              }} />
              <style>{`
                @keyframes scanLine { 0%{top:28%} 50%{top:68%} 100%{top:28%} }
                .chims-scan-line {
                  position: absolute;
                  left: calc(50% - 120px);
                  width: 240px; height: 2px;
                  background: linear-gradient(90deg, transparent, #6366f1, transparent);
                  animation: scanLine 1.8s ease-in-out infinite;
                }
              `}</style>
              <div className="chims-scan-line" />
            </div>
          )}

          {/* Idle placeholder */}
          {!scanning && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <ScanOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.25)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.35)' }}>
                Nhấn &ldquo;Bắt đầu quét&rdquo; để khởi động camera
              </Text>
            </div>
          )}
        </div>

        {/* Hidden canvas for ZXing fallback decode */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Last detected code */}
        {lastCode && (
          <Alert
            message={
              <span>
                ✅ Đã quét:{' '}
                <strong style={{ fontFamily: 'monospace', color: '#6366f1' }}>{lastCode}</strong>
              </span>
            }
            type="success"
          />
        )}

        {/* Engine info */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {hasBarcodeDetectorAPI()
            ? '⚡ Đang dùng Barcode Detection API (phần cứng / GPU) — tốc độ tối đa, nhận diện tức thì.'
            : '🔧 Đang dùng ZXing (phần mềm) — tương thích mọi trình duyệt kể cả Safari/iOS.'}
          {' '}Hướng camera vào mã vạch hoặc QR code để nhận diện tự động.
        </Text>
      </Space>
    </Modal>
  );
}
