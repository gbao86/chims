'use client';

import { Card, Skeleton } from 'antd';

export default function CatalogCardSkeleton() {
  return (
    <Card style={{ borderRadius: 18, overflow: 'hidden' }}>
      <Skeleton.Image active style={{ width: '100%', height: 240 }} />
      <Skeleton active paragraph={{ rows: 3 }} title={{ width: '80%' }} style={{ marginTop: 16 }} />
    </Card>
  );
}
