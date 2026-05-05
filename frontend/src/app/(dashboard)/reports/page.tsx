'use client';

import { useEffect, useState } from 'react';
import { App, Button, Card, Col, Progress, Row, Spin, Table, Typography } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, BarChartOutlined } from '@ant-design/icons';
import api from '@/lib/api';

type ReportsSummary = {
  total_inventory: number;
  low_stock: number;
  total_customers: number;
  total_suppliers: number;
  total_sales_orders: number;
  total_purchase_orders: number;
  total_warranties: number;
  sales_this_month: number;
  purchases_this_month: number;
  weekly_activity: { date: string; count: number }[];
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { message } = App.useApp();
  const { Title, Paragraph, Text } = Typography;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<ReportsSummary>('/api/reports/summary');
        setData(res.data);
      } catch {
        message.error('Không tải được báo cáo');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [message]);

  const download = async (type: 'pdf' | 'xlsx') => {
    setExporting(true);
    try {
      const res = await api.get(`/api/reports/summary.${type}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: String(res.headers['content-type'] || 'application/octet-stream') });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `reports-summary.${type}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      message.error('Không xuất được báo cáo');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <Spin />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>Reports</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>Tổng hợp số liệu từ backend.</Paragraph>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<FilePdfOutlined />} onClick={() => download('pdf')} loading={exporting}>PDF</Button>
          <Button icon={<FileExcelOutlined />} onClick={() => download('xlsx')} loading={exporting}>Excel</Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><Card><Text>Tồn kho</Text><div style={{ fontSize: 24, fontWeight: 700 }}>{data?.total_inventory}</div></Card></Col>
        <Col xs={24} md={8}><Card><Text>Khách hàng</Text><div style={{ fontSize: 24, fontWeight: 700 }}>{data?.total_customers}</div></Card></Col>
        <Col xs={24} md={8}><Card><Text>Nhà cung cấp</Text><div style={{ fontSize: 24, fontWeight: 700 }}>{data?.total_suppliers}</div></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Doanh thu tháng này">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{(data?.sales_this_month || 0).toLocaleString('vi-VN')} ₫</div>
            <Text type="secondary">Bán hàng trong tháng hiện tại</Text>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Giá trị nhập hàng tháng này">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>{(data?.purchases_this_month || 0).toLocaleString('vi-VN')} ₫</div>
            <Text type="secondary">Phiếu nhập đã nhận trong tháng hiện tại</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}><Card><Text>Đơn bán</Text><div style={{ fontSize: 24, fontWeight: 700 }}>{data?.total_sales_orders}</div></Card></Col>
        <Col xs={24} md={8}><Card><Text>Đơn nhập</Text><div style={{ fontSize: 24, fontWeight: 700 }}>{data?.total_purchase_orders}</div></Card></Col>
        <Col xs={24} md={8}><Card><Text>Bảo hành</Text><div style={{ fontSize: 24, fontWeight: 700 }}>{data?.total_warranties}</div></Card></Col>
      </Row>

      <Card style={{ marginTop: 16 }} title="Tỷ lệ hàng tồn thấp">
        <Progress percent={data?.total_inventory ? Math.round(((data?.low_stock || 0) / data.total_inventory) * 100) : 0} status="active" />
      </Card>

      <Card style={{ marginTop: 16 }} title="Hoạt động 7 ngày" extra={<BarChartOutlined />}>
        <Table rowKey="date" dataSource={data?.weekly_activity || []} columns={[{ title: 'Ngày', dataIndex: 'date' }, { title: 'Số lượng', dataIndex: 'count' }]} pagination={false} />
      </Card>
    </div>
  );
}
