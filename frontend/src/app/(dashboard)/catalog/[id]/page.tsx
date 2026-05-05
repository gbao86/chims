'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { App, Button, Card, Col, Descriptions, Divider, Empty, Image, Row, Spin, Tag, Typography, Space } from 'antd';
import { ArrowLeftOutlined, LeftOutlined, RightOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { InventoryItem, InventoryListResponse } from '@/types';

const { Title, Text, Paragraph } = Typography;

type CartItem = {
  id: string;
  sku_code: string;
  name: string;
  unit_price: number;
  image_url: string;
  quantity: number;
};

const cartKey = 'chims_cart_demo';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [related, setRelated] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<InventoryListResponse>('/api/inventory', { params: { limit: 100 } });
        const current = res.data.items.find((x) => x.id === params.id) || null;
        setItem(current);
        setActiveImageIndex(0);
        setRelated(
          current
            ? res.data.items.filter((x) => x.id !== params.id && x.category === current.category).slice(0, 4)
            : []
        );
      } catch {
        message.error('Không tải được chi tiết sản phẩm');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, message]);

  const addToCart = () => {
    if (!item) return;
    const raw = localStorage.getItem(cartKey);
    let cart: CartItem[] = [];

    try {
      cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart)) cart = [];
    } catch {
      cart = [];
    }

    const existing = cart.find((c) => c.id === item.id);
    if (existing) existing.quantity += 1;
    else cart.push({ id: item.id, sku_code: item.sku_code, name: item.name, unit_price: item.unit_price, image_url: item.image_url, quantity: 1 });

    localStorage.setItem(cartKey, JSON.stringify(cart));
    message.success('Đã thêm vào giỏ hàng demo');
  };

  const specs = useMemo(() => item?.specs ? Object.entries(item.specs) : [], [item]);
  const structuredSpecs = useMemo(() => {
    const priorityGroups = {
      core: ['socket', 'chipset', 'architecture', 'cores', 'threads', 'process'],
      memory: ['capacity', 'type', 'bus', 'vram', 'memory_bus', 'latency'],
      performance: ['boost_clock', 'base_clock', 'refresh_rate', 'resolution', 'wattage', 'tdp'],
      physical: ['form_factor', 'dimensions', 'weight', 'fan_size'],
    } as const;

    const used = new Set<string>();
    const grouped = Object.entries(priorityGroups).map(([group, keys]) => ({
      group,
      items: keys
        .map((key) => [key, item?.specs?.[key]] as const)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => {
          used.add(key);
          return { key, value: String(value) };
        }),
    })).filter((entry) => entry.items.length > 0);

    const remaining = Object.entries(item?.specs || {})
      .filter(([key]) => !used.has(key))
      .slice(0, 12)
      .map(([key, value]) => ({ key, value: String(value) }));

    return { grouped, remaining };
  }, [item]);
  const heroSpecs = useMemo(() => {
    const preferredKeys = ['socket', 'chipset', 'capacity', 'vram', 'wattage', 'form_factor', 'type', 'refresh_rate', 'resolution'];
    return preferredKeys
      .map((key) => [key, item?.specs?.[key]] as const)
      .filter(([, value]) => value !== undefined && value !== null && value !== '');
  }, [item]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}><Spin size="large" /></div>;
  if (!item) return <Empty description="Không tìm thấy sản phẩm" />;

  const imageList = (item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : []).slice(0, 8);
  const fallbackImage = imageList[0] || `/catalog/${item.sku_code.toLowerCase()}.jpg`;
  const activeImage = imageList[activeImageIndex] || fallbackImage;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ marginBottom: 16 }}>Quay lại</Button>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10}>
          <Card style={{ borderRadius: 20 }}>
            <Image src={activeImage} alt={item.name} style={{ width: '100%', borderRadius: 16, objectFit: 'contain' }} preview={false} fallback={fallbackImage} />
            {imageList.length > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 12 }}>
                <Button icon={<LeftOutlined />} onClick={() => setActiveImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length)} />
                <div style={{ display: 'flex', gap: 8, flex: 1, overflowX: 'auto', padding: '0 4px' }}>
                  {imageList.map((src, index) => (
                    <button
                      key={`${src}-${index}`}
                      onClick={() => setActiveImageIndex(index)}
                      style={{
                        border: index === activeImageIndex ? '2px solid #6366f1' : '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 0,
                        background: '#fff',
                        minWidth: 72,
                        height: 72,
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                    >
                      <Image src={src} alt={`${item.name} ${index + 1}`} preview={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback={fallbackImage} />
                    </button>
                  ))}
                </div>
                <Button icon={<RightOutlined />} onClick={() => setActiveImageIndex((prev) => (prev + 1) % imageList.length)} />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card style={{ borderRadius: 20 }}>
            <Tag color="blue">{item.category}</Tag>
            <Title level={2} style={{ marginTop: 8 }}>{item.name}</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{item.brand || 'No brand'}</Text>
            <Title level={3} style={{ marginTop: 0, color: '#ef4444' }}>{item.unit_price.toLocaleString('vi-VN')} ₫</Title>
            <Paragraph>{item.stock_quantity > 0 ? 'Còn hàng' : 'Hết hàng'}</Paragraph>
            <Space wrap style={{ marginBottom: 8 }}>
              <Button type="primary" size="large" icon={<ShoppingCartOutlined />} onClick={addToCart}>Thêm vào giỏ demo</Button>
              <Button size="large" onClick={() => router.push('/catalog')}>Quay lại catalog</Button>
            </Space>

            {heroSpecs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
                {heroSpecs.map(([k, v]) => (
                  <Card key={k} size="small" style={{ borderRadius: 14 }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>{k}</Text>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{String(v)}</div>
                  </Card>
                ))}
              </div>
            )}

            <Divider />
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="SKU">{item.sku_code}</Descriptions.Item>
              <Descriptions.Item label="Bảo hành">{item.warranty_months} tháng</Descriptions.Item>
              <Descriptions.Item label="Vị trí">{item.location || 'Chưa có'}</Descriptions.Item>
              <Descriptions.Item label="Barcode">{item.barcode || 'Chưa có'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title="Thông số kỹ thuật" style={{ marginTop: 20, borderRadius: 20 }}>
        {structuredSpecs.grouped.map((section) => (
          <div key={section.group} style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 12, textTransform: 'capitalize' }}>{section.group}</Text>
            <Row gutter={[12, 12]}>
              {section.items.map((spec) => (
                <Col xs={24} md={12} key={spec.key}>
                  <Card size="small" style={{ borderRadius: 14 }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>{spec.key}</Text>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{spec.value}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        ))}
        {structuredSpecs.remaining.length > 0 && (
          <>
            <Divider />
            <Row gutter={[12, 12]}>
              {structuredSpecs.remaining.map((spec) => (
                <Col xs={24} md={12} key={spec.key}>
                  <Card size="small" style={{ borderRadius: 14 }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>{spec.key}</Text>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{spec.value}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Card>

      <Card title="Sản phẩm liên quan" style={{ marginTop: 20, borderRadius: 20 }}>
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
    </div>
  );
}
