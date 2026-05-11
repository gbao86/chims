// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  App, Button, Card, Col, Descriptions, Divider, Empty, Image, Row, Spin, Tag,
  Typography, Space, Form, Input, InputNumber, Select, Tooltip, Modal,
} from 'antd';
import {
  ArrowLeftOutlined, LeftOutlined, RightOutlined, ShoppingCartOutlined,
  EditOutlined, SaveOutlined, CloseOutlined, PlusOutlined, DeleteOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import { InventoryItem, InventoryListResponse, Category } from '@/types';
import { useTheme } from '@/components/ThemeProvider';

const { Title, Text, Paragraph } = Typography;

const CATEGORIES: Category[] = [
  'CPU', 'GPU', 'RAM', 'Storage', 'Mainboard', 'PSU', 'Case', 'Cooling',
  'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Other',
];

type CartItem = { id: string; sku_code: string; name: string; unit_price: number; image_url: string; quantity: number; };
const cartKey = 'chims_cart_demo';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const { isDark } = useTheme();

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [related, setRelated] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Edit states
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingSpecs, setEditingSpecs] = useState(false);
  const [editingImages, setEditingImages] = useState(false);
  const [infoForm] = Form.useForm();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  // Spec rows: [{key, value}]
  const [specRows, setSpecRows] = useState<{ key: string; value: string }[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get<InventoryListResponse>('/api/inventory', { params: { limit: 200 } });
      const current = res.data.items.find((x) => x.id === params.id) || null;
      setItem(current);
      setActiveImageIndex(0);
      setImageUrls(current?.image_urls?.length ? current.image_urls : current?.image_url ? [current.image_url] : []);
      setRelated(current ? res.data.items.filter((x) => x.id !== params.id && x.category === current.category).slice(0, 4) : []);
    } catch {
      message.error('Không tải được chi tiết sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [params.id]);

  const addToCart = () => {
    if (!item) return;
    const raw = localStorage.getItem(cartKey);
    let cart: CartItem[] = [];
    try { cart = raw ? JSON.parse(raw) : []; if (!Array.isArray(cart)) cart = []; } catch { cart = []; }
    const existing = cart.find((c) => c.id === item.id);
    if (existing) existing.quantity += 1;
    else cart.push({ id: item.id, sku_code: item.sku_code, name: item.name, unit_price: item.unit_price, image_url: item.image_url, quantity: 1 });
    localStorage.setItem(cartKey, JSON.stringify(cart));
    message.success('Đã thêm vào giỏ hàng demo');
  };

  // ── Save Info ──
  const handleSaveInfo = async () => {
    if (!item) return;
    const vals = await infoForm.validateFields();
    setSaving(true);
    try {
      await api.put(`/api/inventory/${item.id}`, vals);
      message.success('Đã lưu thông tin SKU!');
      setEditingInfo(false);
      await loadData();
    } catch {
      message.error('Lưu thất bại');
    } finally { setSaving(false); }
  };

  const startEditInfo = () => {
    if (!item) return;
    infoForm.setFieldsValue({
      name: item.name,
      brand: item.brand,
      category: item.category,
      unit_price: item.unit_price,
      cost_price: item.cost_price,
      stock_quantity: item.stock_quantity,
      min_stock: item.min_stock,
      warranty_months: item.warranty_months,
      location: item.location,
      barcode: item.barcode,
    });
    setEditingInfo(true);
  };

  // ── Save Specs ──
  const handleSaveSpecs = async () => {
    if (!item) return;
    // Validate: warn if any row has key but no value or vice versa
    const specs: Record<string, string> = {};
    for (const row of specRows) {
      const k = row.key.trim();
      const v = row.value.trim();
      if (k && v) specs[k] = v;
    }
    setSaving(true);
    try {
      await api.put(`/api/inventory/${item.id}`, { specs });
      message.success('Đã lưu thông số kỹ thuật!');
      setEditingSpecs(false);
      await loadData();
    } catch {
      message.error('Lưu thất bại');
    } finally { setSaving(false); }
  };

  const startEditSpecs = () => {
    if (!item) return;
    const rows = Object.entries(item.specs || {}).map(([k, v]) => ({ key: k, value: String(v) }));
    setSpecRows(rows.length ? rows : [{ key: '', value: '' }]);
    setEditingSpecs(true);
  };

  const updateSpecRow = (i: number, field: 'key' | 'value', val: string) => {
    setSpecRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };
  const addSpecRow = () => setSpecRows(prev => [...prev, { key: '', value: '' }]);
  const removeSpecRow = (i: number) => setSpecRows(prev => prev.filter((_, idx) => idx !== i));

  // ── Save Images ──
  const handleSaveImages = async () => {
    if (!item) return;
    setSaving(true);
    try {
      // Auto-include URL still in the input field (user forgot to click "Thêm")
      const allUrls = newImageUrl.trim()
        ? [...imageUrls, newImageUrl.trim()]
        : [...imageUrls];
      const validUrls = allUrls.filter(u => u.trim());
      await api.put(`/api/inventory/${item.id}`, {
        image_url: validUrls[0] || '',
        image_urls: validUrls,
      });
      message.success('Đã lưu danh sách ảnh!');
      setNewImageUrl('');
      setEditingImages(false);
      await loadData();
    } catch {
      message.error('Lưu thất bại');
    } finally { setSaving(false); }
  };


  const specs = useMemo(() => item?.specs ? Object.entries(item.specs) : [], [item]);
  const heroSpecs = useMemo(() => {
    const preferredKeys = ['socket', 'chipset', 'capacity', 'vram', 'wattage', 'form_factor', 'type', 'refresh_rate', 'resolution'];
    return preferredKeys.map((key) => [key, item?.specs?.[key]] as const).filter(([, value]) => value !== undefined && value !== null && value !== '');
  }, [item]);

  const cardStyle = {
    borderRadius: 20,
    background: isDark ? 'rgba(30,41,59,0.85)' : '#fff',
    border: `1px solid ${isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)'}`,
  };

  const sectionHeaderStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}><Spin size="large" /></div>;
  if (!item) return <Empty description="Không tìm thấy sản phẩm" />;

  const imageList = (item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : []).slice(0, 8);
  const fallbackImage = imageList[0] || `/catalog/${item.sku_code.toLowerCase()}.jpg`;
  const activeImage = imageList[activeImageIndex] || fallbackImage;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ marginBottom: 16 }}>Quay lại</Button>

      <Row gutter={[24, 24]}>
        {/* ── Image Panel ── */}
        <Col xs={24} lg={10}>
          <Card style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <Text strong style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>Hình ảnh</Text>
              <Tooltip title="Chỉnh sửa ảnh">
                <Button size="small" icon={<EditOutlined />} onClick={() => { setImageUrls(imageList.length ? [...imageList] : []); setEditingImages(true); }}>Sửa ảnh</Button>
              </Tooltip>
            </div>
            <Image src={activeImage} alt={item.name} style={{ width: '100%', borderRadius: 16, objectFit: 'contain', maxHeight: 320 }} preview={false} fallback={fallbackImage} />
            {imageList.length > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 12 }}>
                <Button icon={<LeftOutlined />} onClick={() => setActiveImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length)} />
                <div style={{ display: 'flex', gap: 8, flex: 1, overflowX: 'auto', padding: '0 4px' }}>
                  {imageList.map((src, index) => (
                    <button key={`${src}-${index}`} onClick={() => setActiveImageIndex(index)} style={{ border: index === activeImageIndex ? '2px solid #6366f1' : '1px solid #e2e8f0', borderRadius: 10, padding: 0, background: '#fff', minWidth: 72, height: 72, cursor: 'pointer', overflow: 'hidden' }}>
                      <Image src={src} alt={`${item.name} ${index + 1}`} preview={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback={fallbackImage} />
                    </button>
                  ))}
                </div>
                <Button icon={<RightOutlined />} onClick={() => setActiveImageIndex((prev) => (prev + 1) % imageList.length)} />
              </div>
            )}
            {imageList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: isDark ? '#64748b' : '#94a3b8' }}>
                <PictureOutlined style={{ fontSize: 40 }} />
                <div style={{ marginTop: 8, fontSize: 13 }}>Chưa có ảnh. Nhấn "Sửa ảnh" để thêm.</div>
              </div>
            )}
          </Card>
        </Col>

        {/* ── Info Panel ── */}
        <Col xs={24} lg={14}>
          <Card style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <Text strong style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>Thông tin sản phẩm</Text>
              {!editingInfo ? (
                <Button size="small" icon={<EditOutlined />} onClick={startEditInfo}>Chỉnh sửa</Button>
              ) : (
                <Space>
                  <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingInfo(false)} disabled={saving}>Hủy</Button>
                  <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveInfo} loading={saving}>Lưu</Button>
                </Space>
              )}
            </div>

            {!editingInfo ? (
              <>
                <Tag color="blue">{item.category}</Tag>
                <Title level={2} style={{ marginTop: 8, marginBottom: 4, color: isDark ? '#f1f5f9' : '#0f172a' }}>{item.name}</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{item.brand || 'No brand'}</Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                  <Title level={3} style={{ margin: 0, color: '#ef4444' }}>{item.unit_price.toLocaleString('vi-VN')} ₫</Title>
                  {item.cost_price > 0 && <Text type="secondary" style={{ fontSize: 13 }}>Giá vốn: {item.cost_price.toLocaleString('vi-VN')} ₫</Text>}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Tag color={item.status === 'in_stock' ? 'success' : item.status === 'low_stock' ? 'warning' : 'error'}>
                    {item.status === 'in_stock' ? `Còn hàng (${item.stock_quantity})` : item.status === 'low_stock' ? `Sắp hết (${item.stock_quantity})` : 'Hết hàng'}
                  </Tag>
                </div>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Button type="primary" size="large" icon={<ShoppingCartOutlined />} onClick={addToCart}>Thêm vào giỏ demo</Button>
                  <Button size="large" onClick={() => router.push('/catalog')}>Quay lại catalog</Button>
                </Space>
                {heroSpecs.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                    {heroSpecs.map(([k, v]) => (
                      <div key={k} style={{ padding: '10px 12px', borderRadius: 12, background: isDark ? 'rgba(51,65,85,0.3)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(51,65,85,0.4)' : '#e2e8f0'}` }}>
                        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', display: 'block' }}>{k}</Text>
                        <div style={{ fontWeight: 700, marginTop: 2, color: isDark ? '#f1f5f9' : '#0f172a' }}>{String(v)}</div>
                      </div>
                    ))}
                  </div>
                )}
                <Divider />
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="SKU">{item.sku_code}</Descriptions.Item>
                  <Descriptions.Item label="Tồn kho">{item.stock_quantity} (Min: {item.min_stock})</Descriptions.Item>
                  <Descriptions.Item label="Bảo hành">{item.warranty_months} tháng</Descriptions.Item>
                  <Descriptions.Item label="Vị trí">{item.location || 'Chưa có'}</Descriptions.Item>
                  <Descriptions.Item label="Barcode">{item.barcode || 'Chưa có'}</Descriptions.Item>
                </Descriptions>
              </>
            ) : (
              <Form form={infoForm} layout="vertical">
                <Row gutter={12}>
                  <Col span={16}><Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true }]}><Input /></Form.Item></Col>
                  <Col span={8}><Form.Item name="category" label="Danh mục"><Select options={CATEGORIES.map(c => ({ value: c, label: c }))} /></Form.Item></Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}><Form.Item name="brand" label="Thương hiệu"><Input /></Form.Item></Col>
                  <Col span={12}><Form.Item name="barcode" label="Barcode"><Input /></Form.Item></Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}><Form.Item name="unit_price" label="Giá bán (₫)"><InputNumber style={{ width: '100%' }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item></Col>
                  <Col span={12}><Form.Item name="cost_price" label="Giá vốn (₫)"><InputNumber style={{ width: '100%' }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item></Col>
                </Row>
                <Row gutter={12}>
                  <Col span={8}><Form.Item name="stock_quantity" label="Số lượng tồn"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                  <Col span={8}><Form.Item name="min_stock" label="Tồn tối thiểu"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                  <Col span={8}><Form.Item name="warranty_months" label="Bảo hành (tháng)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                </Row>
                <Form.Item name="location" label="Vị trí lưu kho"><Input placeholder="Ví dụ: A1-01" /></Form.Item>
              </Form>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Specs Panel ── */}
      <Card
        style={{ ...cardStyle, marginTop: 20 }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Thông số kỹ thuật</span>
            {!editingSpecs ? (
              <Button size="small" icon={<EditOutlined />} onClick={startEditSpecs}>Chỉnh sửa thông số</Button>
            ) : (
              <Space>
                <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingSpecs(false)} disabled={saving}>Hủy</Button>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveSpecs} loading={saving}>Lưu thông số</Button>
              </Space>
            )}
          </div>
        }
      >
        {!editingSpecs ? (
          specs.length === 0 ? (
            <Empty description="Chưa có thông số. Nhấn 'Chỉnh sửa thông số' để thêm." />
          ) : (
            <Row gutter={[12, 12]}>
              {specs.map(([key, value]) => (
                <Col xs={24} sm={12} lg={8} key={key}>
                  <div style={{ padding: '10px 14px', borderRadius: 12, background: isDark ? 'rgba(51,65,85,0.3)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(51,65,85,0.4)' : '#e2e8f0'}` }}>
                    <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', display: 'block' }}>{key}</Text>
                    <div style={{ fontWeight: 700, marginTop: 4, color: isDark ? '#f1f5f9' : '#0f172a' }}>{String(value)}</div>
                  </div>
                </Col>
              ))}
            </Row>
          )
        ) : (
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
              Thêm, sửa hoặc xóa từng thông số. Mỗi dòng gồm tên thông số và giá trị.
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {specRows.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    placeholder="Tên thông số (vd: socket)"
                    value={row.key}
                    onChange={e => updateSpecRow(i, 'key', e.target.value)}
                    style={{ width: 200, fontFamily: 'monospace', fontSize: 12 }}
                  />
                  <Input
                    placeholder="Giá trị (vd: AM5)"
                    value={row.value}
                    onChange={e => updateSpecRow(i, 'value', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    danger
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
          </div>
        )}
      </Card>

      {/* ── Related Products ── */}
      <Card title="Sản phẩm liên quan" style={{ ...cardStyle, marginTop: 20 }}>
        {related.length === 0 ? <Empty description="Chưa có sản phẩm liên quan" /> : (
          <Row gutter={[16, 16]}>
            {related.map((r) => {
              const relatedFallback = `/catalog/${r.category.toLowerCase()}-001.jpg`;
              return (
                <Col xs={24} sm={12} lg={6} key={r.id}>
                  <Card hoverable onClick={() => router.push(`/catalog/${r.id}`)} style={{ borderRadius: 16, overflow: 'hidden' }}>
                    <Image src={r.image_urls?.[0] || r.image_url || relatedFallback} alt={r.name} style={{ width: '100%', borderRadius: 12, objectFit: 'contain' }} preview={false} fallback={relatedFallback} />
                    <Tag color="blue" style={{ marginTop: 8 }}>{r.category}</Tag>
                    <Text strong style={{ display: 'block', marginTop: 6 }}>{r.name}</Text>
                    <Text type="secondary" style={{ display: 'block' }}>{r.brand || 'No brand'}</Text>
                    <Text strong>{r.unit_price.toLocaleString('vi-VN')} ₫</Text>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* ── Edit Images Modal ── */}
      <Modal
        open={editingImages}
        onCancel={() => setEditingImages(false)}
        title="Chỉnh sửa danh sách ảnh"
        footer={[
          <Button key="cancel" onClick={() => setEditingImages(false)} disabled={saving}>Hủy</Button>,
          <Button key="save" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSaveImages}>Lưu ảnh</Button>,
        ]}
        destroyOnHidden
        width={560}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
          Nhập URL ảnh. Ảnh đầu tiên sẽ là ảnh đại diện.
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {imageUrls.map((url, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : null}
              </div>
              <Space.Compact style={{ flex: 1 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px', background: isDark ? 'rgba(51,65,85,0.5)' : '#f0f0f0', border: `1px solid ${isDark ? 'rgba(51,65,85,0.8)' : '#d9d9d9'}`, borderRight: 'none', borderRadius: '6px 0 0 6px', fontSize: 11, color: isDark ? '#94a3b8' : '#8c8c8c', whiteSpace: 'nowrap' }}>#{i + 1}</span>
                <Input
                  value={url}
                  onChange={e => setImageUrls(prev => prev.map((u, idx) => idx === i ? e.target.value : u))}
                  placeholder={`URL ảnh ${i + 1}${i === 0 ? ' (đại diện)' : ''}`}
                  style={{ borderRadius: '0 6px 6px 0' }}
                />
              </Space.Compact>
              <Button danger icon={<DeleteOutlined />} onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={newImageUrl}
            onChange={e => setNewImageUrl(e.target.value)}
            placeholder="Dán URL ảnh mới vào đây..."
            onPressEnter={() => { if (newImageUrl.trim()) { setImageUrls(prev => [...prev, newImageUrl.trim()]); setNewImageUrl(''); } }}
          />
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => { if (newImageUrl.trim()) { setImageUrls(prev => [...prev, newImageUrl.trim()]); setNewImageUrl(''); } }}
          >
            Thêm
          </Button>
        </div>
      </Modal>
    </div>
  );
}
