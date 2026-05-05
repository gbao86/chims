// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
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

