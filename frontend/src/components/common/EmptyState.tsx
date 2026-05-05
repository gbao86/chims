// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
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

