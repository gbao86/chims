'use client';

import { Empty, Typography } from 'antd';

const { Text } = Typography;

export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ padding: '56px 16px' }}>
      <Empty
        description={
          <div>
            <Text strong style={{ display: 'block' }}>{title}</Text>
            {description ? <Text type="secondary">{description}</Text> : null}
          </div>
        }
      />
    </div>
  );
}
