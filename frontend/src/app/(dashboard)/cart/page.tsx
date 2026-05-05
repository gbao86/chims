// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, InputNumber, List, Result, Space, Typography } from 'antd';
import { DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

type CartItem = {
  id: string;
  sku_code: string;
  name: string;
  unit_price: number;
  image_url: string;
  quantity: number;
};

const cartKey = 'chims_cart_demo';

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const router = useRouter();
  const { message } = App.useApp();
  const { Title, Text } = Typography;

  useEffect(() => {
    const raw = localStorage.getItem(cartKey);
    setCart(raw ? JSON.parse(raw) : []);
  }, []);

  const save = (next: CartItem[]) => {
    setCart(next);
    localStorage.setItem(cartKey, JSON.stringify(next));
  };

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0), [cart]);

  const checkout = () => {
    message.success('Checkout demo thành công');
    save([]);
  };

  if (cart.length === 0) {
    return <Result status="info" icon={<ShoppingCartOutlined />} title="Giỏ hàng trống" extra={<Button type="primary" onClick={() => router.push('/catalog')}>Đi tới Catalog</Button>} />;
  }

  return (
    <div>
      <Title level={2}>Cart Demo</Title>
      <Card>
        <List
          dataSource={cart}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button danger icon={<DeleteOutlined />} onClick={() => save(cart.filter((x) => x.id !== item.id))}>Xóa</Button>,
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={`${item.sku_code} • ${item.unit_price.toLocaleString('vi-VN')} ₫`}
              />
              <Space>
                <Text>Số lượng</Text>
                <InputNumber
                  min={1}
                  value={item.quantity}
                  onChange={(v) => save(cart.map((x) => x.id === item.id ? { ...x, quantity: Number(v || 1) } : x))}
                />
              </Space>
            </List.Item>
          )}
        />
      </Card>
      <Card style={{ marginTop: 16 }}>
        <Title level={4}>Tạm tính: {total.toLocaleString('vi-VN')} ₫</Title>
        <Button type="primary" onClick={checkout}>Thanh toán demo</Button>
      </Card>
    </div>
  );
}

