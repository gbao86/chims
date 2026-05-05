'use client';

import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Col, Empty, Image, Input, Radio, Row, Select, Space, Spin, Tag, Typography } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Category, InventoryItem, InventoryListResponse, StockStatus } from '@/types';
import CatalogCardSkeleton from '@/components/common/CatalogCardSkeleton';
import EmptyState from '@/components/common/EmptyState';

const { Title, Text, Paragraph } = Typography;

const categoryLabels: Record<Category, string> = {
  CPU: 'CPU',
  GPU: 'GPU',
  RAM: 'RAM',
  Storage: 'Storage',
  Mainboard: 'Mainboard',
  PSU: 'PSU',
  Case: 'Case',
  Cooling: 'Cooling',
  Monitor: 'Monitor',
  Keyboard: 'Keyboard',
  Mouse: 'Mouse',
  Headset: 'Headset',
  Other: 'Other',
};

const categoryOptions = Object.keys(categoryLabels).map((key) => ({ value: key, label: categoryLabels[key as Category] }));

const priceRanges = [
  { id: 'all', label: 'Tất cả' },
  { id: 'under3', label: 'Dưới 3 triệu' },
  { id: '3to10', label: '3 - 10 triệu' },
  { id: '10to30', label: '10 - 30 triệu' },
  { id: 'over30', label: 'Trên 30 triệu' },
];

const statusLabels: Record<StockStatus, string> = {
  in_stock: 'Còn hàng',
  low_stock: 'Sắp hết',
  out_of_stock: 'Hết hàng',
};

function matchesPriceRange(price: number, range: string) {
  if (range === 'under3') return price < 3_000_000;
  if (range === '3to10') return price >= 3_000_000 && price < 10_000_000;
  if (range === '10to30') return price >= 10_000_000 && price < 30_000_000;
  if (range === 'over30') return price >= 30_000_000;
  return true;
}

function getFallbackImage(item: InventoryItem) {
  return item.image_urls?.[0] || item.image_url || `/catalog/${item.sku_code.toLowerCase()}.jpg`;
}

function getCategoryImage(item: InventoryItem) {
  const slug = item.category.toLowerCase();
  const imageMap: Partial<Record<string, string>> = {
    cpu: '/catalog/cpu-001.jpg',
    gpu: '/catalog/gpu-001.jpg',
    ram: '/catalog/ram-001.jpg',
    storage: '/catalog/storage-001.jpg',
    mainboard: '/catalog/mainboard-001.jpg',
    psu: '/catalog/psu-001.jpg',
    case: '/catalog/case-001.jpg',
    cooling: '/catalog/cooling-001.jpg',
    monitor: '/catalog/monitor-001.jpg',
    keyboard: '/catalog/keyboard-001.jpg',
    mouse: '/catalog/mouse-001.jpg',
    headset: '/catalog/headset-001.jpg',
  };

  return imageMap[slug] ?? '/catalog/other-001.jpg';
}

export default function CatalogPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [priceRange, setPriceRange] = useState('all');
  const router = useRouter();
  const { message } = App.useApp();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { limit: 100 };
        if (category) params.category = category;
        if (search) params.search = search;
        const res = await api.get<InventoryListResponse>('/api/inventory', { params });
        setItems(res.data.items);
      } catch {
        message.error('Không tải được catalog');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category, search, message]);

  const featuredItems = useMemo(() => items.slice(0, 4), [items]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const byStatus = statusFilter === 'all' ? true : item.status === statusFilter;
      const byPrice = matchesPriceRange(item.unit_price, priceRange);
      const bySearch = search ? [item.name, item.sku_code, item.brand, item.category].join(' ').toLowerCase().includes(search.toLowerCase()) : true;
      return byStatus && byPrice && bySearch;
    });
  }, [items, search, statusFilter, priceRange]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 6 }}>Catalog</Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Khám phá sản phẩm công nghệ, lọc nhanh theo hãng, giá, danh mục và tình trạng tồn kho.
        </Paragraph>
      </div>

      <Card style={{ marginBottom: 20, borderRadius: 20, background: 'linear-gradient(135deg, #0f172a, #4f46e5)' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={14}>
            <Title level={3} style={{ color: '#fff', marginTop: 0 }}>Mua sắm linh kiện máy tính chính hãng</Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
              Tìm kiếm, so sánh và khám phá các sản phẩm theo phong cách thương mại hiện đại của CHIMS.
            </Text>
          </Col>
          <Col xs={24} lg={10}>
            <Input
              size="large"
              placeholder="Tìm CPU, GPU, RAM, SSD..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>{visibleItems.length} sản phẩm</Text>
        <Text type="secondary">Sản phẩm nổi bật và lọc nâng cao</Text>
      </div>

      <div style={{ position: 'sticky', top: 88, zIndex: 20, marginBottom: 20 }}>
        <Card style={{ borderRadius: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={10}>
              <Input
                size="large"
                placeholder="Tìm CPU, GPU, RAM, SSD..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} md={6}>
              <Select value={category || undefined} onChange={(v) => setCategory(v || '')} placeholder="Lọc theo danh mục" style={{ width: '100%' }} allowClear options={categoryOptions} />
            </Col>
            <Col xs={24} md={4}>
              <Select value={priceRange} onChange={setPriceRange} style={{ width: '100%' }} options={priceRanges.map((r) => ({ value: r.id, label: r.label }))} />
            </Col>
            <Col xs={24} md={4}>
              <Radio.Group value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} optionType="button" buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                <Radio.Button value="all" style={{ flex: 1, textAlign: 'center' }}>Tất cả</Radio.Button>
                <Radio.Button value="in_stock" style={{ flex: 1, textAlign: 'center' }}>Còn hàng</Radio.Button>
                <Radio.Button value="low_stock" style={{ flex: 1, textAlign: 'center' }}>Sắp hết</Radio.Button>
                <Radio.Button value="out_of_stock" style={{ flex: 1, textAlign: 'center' }}>Hết hàng</Radio.Button>
              </Radio.Group>
            </Col>
          </Row>
        </Card>
      </div>

      {loading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Col xs={24} sm={12} xl={8} xxl={6} key={index}>
              <CatalogCardSkeleton />
            </Col>
          ))}
        </Row>
      ) : visibleItems.length === 0 ? (
        <EmptyState title="Không có sản phẩm phù hợp" description="Thử đổi bộ lọc, danh mục hoặc từ khóa tìm kiếm." />
      ) : (
        <Row gutter={[16, 16]}>
          {visibleItems.map((item) => (
            <Col xs={24} sm={12} xl={8} xxl={6} key={item.id}>
              <Card
                hoverable
                onClick={() => router.push(`/catalog/${item.id}`)}
                cover={
                  <div style={{ position: 'relative', background: '#f8fafc' }}>
                    <Image
                      src={item.image_urls?.[0] || item.image_url || getCategoryImage(item)}
                      alt={item.name}
                      height={240}
                      style={{ objectFit: 'contain', width: '100%', padding: 16, background: '#f8fafc' }}
                      preview={false}
                      fallback={getCategoryImage(item)}
                    />
                    <div style={{ position: 'absolute', top: 12, left: 12 }}>
                      <Tag color={item.status === 'in_stock' ? 'green' : item.status === 'low_stock' ? 'orange' : 'red'}>
                        {statusLabels[item.status]}
                      </Tag>
                    </div>
                  </div>
                }
                actions={[
                  <Button key="view" type="text" icon={<EyeOutlined />}>Xem chi tiết</Button>,
                ]}
                style={{ borderRadius: 18, overflow: 'hidden' }}
              >
                <Tag color="blue">{item.category}</Tag>
                <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>SKU: {item.sku_code}</Text>
                <Title level={5} style={{ marginTop: 8, marginBottom: 6, minHeight: 48 }}>{item.name}</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{item.brand || 'No brand'}</Text>
                <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                  {Object.entries(item.specs || {}).slice(0, 2).map(([k, v]) => (
                    <Text key={k} type="secondary" style={{ fontSize: 12 }}>
                      {k}: {String(v)}
                    </Text>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ fontSize: 18 }}>{item.unit_price.toLocaleString('vi-VN')} ₫</Text>
                  <Text>Tồn: {item.stock_quantity}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card title="Sản phẩm nổi bật" style={{ marginTop: 24, borderRadius: 18 }}>
        <Row gutter={[16, 16]}>
          {featuredItems.map((item) => (
            <Col xs={24} md={12} lg={6} key={item.id}>
              <Card size="small" hoverable onClick={() => router.push(`/catalog/${item.id}`)}>
                <Image src={item.image_urls?.[0] || item.image_url || getCategoryImage(item)} alt={item.name} height={120} style={{ objectFit: 'contain', width: '100%', padding: 8, background: '#f8fafc', borderRadius: 12 }} preview={false} fallback={getCategoryImage(item)} />
                <Text strong style={{ display: 'block', marginTop: 8 }}>{item.name}</Text>
                <Text type="secondary">{item.unit_price.toLocaleString('vi-VN')} ₫</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
