import type { JSX } from "react";
import ArrowDownOutlined from "@ant-design/icons/ArrowDownOutlined";
import ArrowUpOutlined from "@ant-design/icons/ArrowUpOutlined";
import BookOutlined from "@ant-design/icons/BookOutlined";
import ClockCircleOutlined from "@ant-design/icons/ClockCircleOutlined";
import DollarOutlined from "@ant-design/icons/DollarOutlined";
import TeamOutlined from "@ant-design/icons/TeamOutlined";
import WarningOutlined from "@ant-design/icons/WarningOutlined";
import { Button, Card, Empty, Flex, Grid, Progress, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import {
  courseOccupancy,
  dashboardMetrics,
  financialTrend,
  recentEnrollments,
  type DashboardMetric,
  type RecentEnrollment,
} from "../model/dashboardData";
import "./dashboardOverview.css";

const currency = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

const enrollmentColumns: ColumnsType<RecentEnrollment> = [
  { title: "Öğrenci", dataIndex: "student", key: "student", render: (value: string, record) => (
    <div className="dashboard__student"><strong>{value}</strong><small>{record.id}</small></div>
  ) },
  { title: "Kurs", dataIndex: "course", key: "course" },
  { title: "Kayıt zamanı", dataIndex: "registeredAt", key: "registeredAt" },
  { title: "Ödeme", dataIndex: "payment", key: "payment", render: (value: RecentEnrollment["payment"]) => <PaymentTag status={value} /> },
  { title: "Tutar", dataIndex: "amount", key: "amount", align: "right", render: (value: number) => currency.format(value) },
];

export function DashboardOverview(): JSX.Element {
  const screens = Grid.useBreakpoint();

  return (
    <div className="dashboard">
      <section className="dashboard__heading">
        <div>
          <Typography.Text className="dashboard__eyebrow">3 AĞUSTOS 2026 · PAZARTESİ</Typography.Text>
          <Typography.Title level={1}>Günaydın, operasyon özeti hazır.</Typography.Title>
          <Typography.Paragraph>Öğrenci kayıtları, yaklaşan kurslar ve finansal durumu tek ekranda takip edin.</Typography.Paragraph>
        </div>
        <Button type="primary" size="large" icon={<TeamOutlined />}>Yeni öğrenci kaydı</Button>
      </section>

      <section className="dashboard__metrics" aria-label="Temel operasyon göstergeleri">
        {dashboardMetrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
      </section>

      <section className="dashboard__insights">
        <Card className="dashboard__panel dashboard__finance" title="Gelir ve gider eğilimi"
          extra={<Typography.Text className="dashboard__period">Son 6 ay</Typography.Text>}>
          <div className="dashboard__chart-summary">
            <div><span>Toplam gelir</span><strong>₺4.036.000</strong></div>
            <div><span>Toplam gider</span><strong>₺2.265.000</strong></div>
            <div><span>Net durum</span><strong>₺1.771.000</strong></div>
          </div>
          <FinancialChart />
        </Card>

        <Card className="dashboard__panel dashboard__courses" title="Yaklaşan kurslar"
          extra={<Button type="link">Tümünü gör</Button>}>
          <div className="dashboard__course-list">
            {courseOccupancy.map((course) => {
              const percentage = Math.round(course.enrolled / course.capacity * 100);
              return (
                <article className="dashboard__course" key={course.key}>
                  <Flex justify="space-between" align="flex-start" gap={16}>
                    <div><strong>{course.name}</strong><span><ClockCircleOutlined /> {course.schedule} · {course.instructor}</span></div>
                    <span className="dashboard__capacity">{course.enrolled}/{course.capacity}</span>
                  </Flex>
                  <Progress percent={percentage} showInfo={false} size="small"
                    status={percentage >= 85 ? "exception" : "normal"} />
                </article>
              );
            })}
          </div>
        </Card>
      </section>

      <section aria-labelledby="recent-enrollments-title">
        <div className="dashboard__section-heading">
          <div>
            <Typography.Title id="recent-enrollments-title" level={3}>Son öğrenci kayıtları</Typography.Title>
            <Typography.Text>En son oluşturulan kayıtlar ve ödeme durumları</Typography.Text>
          </div>
          <Button>Tüm kayıtları aç</Button>
        </div>
        {recentEnrollments.length === 0 ? (
          <Empty description="Henüz öğrenci kaydı bulunmuyor." />
        ) : screens.md ? (
          <Table<RecentEnrollment> className="dashboard__table" rowKey="id" columns={enrollmentColumns}
            dataSource={[...recentEnrollments]} pagination={false} />
        ) : (
          <div className="dashboard__enrollment-list">
            {recentEnrollments.map((record) => (
              <article className="dashboard__enrollment" key={record.id}>
                <Flex justify="space-between" gap={16}><strong>{record.student}</strong><PaymentTag status={record.payment} /></Flex>
                <span>{record.course}</span>
                <Flex justify="space-between" gap={16}><small>{record.registeredAt} · {record.id}</small><b>{currency.format(record.amount)}</b></Flex>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }): JSX.Element {
  const icons: Record<DashboardMetric["key"], JSX.Element> = {
    students: <TeamOutlined />,
    courses: <BookOutlined />,
    collections: <DollarOutlined />,
    receivables: <WarningOutlined />,
  };
  return (
    <Card className="dashboard__metric">
      <Flex justify="space-between" align="flex-start">
        <Typography.Text>{metric.label}</Typography.Text>
        <span className={`dashboard__metric-icon dashboard__metric-icon--${metric.trend}`} aria-hidden="true">{icons[metric.key]}</span>
      </Flex>
      <strong className="dashboard__metric-value">{metric.value}</strong>
      <div className={`dashboard__trend dashboard__trend--${metric.trend}`}>
        {metric.trend === "positive" ? <ArrowUpOutlined /> : metric.trend === "attention" ? <ArrowDownOutlined /> : null}
        <b>{metric.change}</b><span>{metric.detail}</span>
      </div>
    </Card>
  );
}

function PaymentTag({ status }: { status: RecentEnrollment["payment"] }): JSX.Element {
  const color = status === "Tamamlandı" ? "success" : status === "Taksitli" ? "processing" : "warning";
  return <Tag color={color}>{status}</Tag>;
}

function FinancialChart(): JSX.Element {
  const width = 640;
  const height = 220;
  const padding = 24;
  const maxValue = 900;
  const points = (key: "income" | "expense") => financialTrend.map((point, index) => {
    const x = padding + index * ((width - padding * 2) / (financialTrend.length - 1));
    const y = height - padding - point[key] / maxValue * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <figure className="dashboard__chart">
      <div className="dashboard__legend"><span><i className="dashboard__legend-income" />Gelir</span><span><i className="dashboard__legend-expense" />Gider</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="financial-chart-title financial-chart-description">
        <title id="financial-chart-title">Son altı aylık gelir ve gider grafiği</title>
        <desc id="financial-chart-description">Gelir Şubat ayındaki 520 bin liradan Temmuz ayında 846 bin liraya yükseldi. Gider Temmuz ayında 452 bin lira oldu.</desc>
        {[0, 1, 2, 3].map((line) => <line className="dashboard__chart-grid" key={line} x1={padding} x2={width - padding} y1={padding + line * 52} y2={padding + line * 52} />)}
        <polyline className="dashboard__line dashboard__line--income" points={points("income")} />
        <polyline className="dashboard__line dashboard__line--expense" points={points("expense")} />
        {financialTrend.map((point, index) => <text key={point.month} className="dashboard__chart-label" x={padding + index * ((width - padding * 2) / (financialTrend.length - 1))} y={height - 2}>{point.month}</text>)}
      </svg>
    </figure>
  );
}
