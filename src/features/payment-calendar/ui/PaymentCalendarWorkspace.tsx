import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import BankOutlined from "@ant-design/icons/BankOutlined";
import CalendarOutlined from "@ant-design/icons/CalendarOutlined";
import CheckCircleOutlined from "@ant-design/icons/CheckCircleOutlined";
import ClockCircleOutlined from "@ant-design/icons/ClockCircleOutlined";
import CloseOutlined from "@ant-design/icons/CloseOutlined";
import FileTextOutlined from "@ant-design/icons/FileTextOutlined";
import OrderedListOutlined from "@ant-design/icons/OrderedListOutlined";
import { Button, Calendar, Card, Empty, Flex, Grid, Skeleton, Statistic, Tag, Tooltip, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/tr";

import { StatusLine } from "../../../shared/ui/StatusLine";
import { loadPaymentCalendar, type PaymentCalendarItem } from "../api/paymentCalendarApi";
import "./paymentCalendarWorkspace.css";

type PaymentCalendarState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; items: PaymentCalendarItem[] };

type SelectedScope = "date" | "month";
type PaymentKind = "completed" | "installment" | "promissory";
type CompletedPaymentMethod = NonNullable<PaymentCalendarItem["paymentMethod"]>;

const emptyItems: PaymentCalendarItem[] = [];
const currency = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

dayjs.locale("tr");

export function PaymentCalendarWorkspace(): JSX.Element {
  const screens = Grid.useBreakpoint();
  const [state, setState] = useState<PaymentCalendarState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => dayjs());
  const [panelMode, setPanelMode] = useState<"month" | "year">("month");
  const [closedSelectionKey, setClosedSelectionKey] = useState<string | null>(null);
  const monthKey = selectedDate.format("YYYY-MM");

  useEffect(() => {
    let active = true;
    void loadPaymentCalendar(monthKey)
      .then((calendar) => { if (active) setState({ status: "success", items: calendar.items }); })
      .catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, [monthKey, reloadKey]);

  const items = state.status === "success" ? state.items : emptyItems;
  const selectedScope: SelectedScope = panelMode === "year" ? "month" : "date";
  const selectedItems = useMemo(
    () => items.filter((item) => selectedScope === "date" ? eventDate(item).isSame(selectedDate, "day") : eventDate(item).isSame(selectedDate, "month")),
    [items, selectedDate, selectedScope],
  );
  const selectedKey = `${selectedScope}:${selectedScope === "date" ? selectedDate.format("YYYY-MM-DD") : selectedDate.format("YYYY-MM")}`;
  const showSelectedPayments = selectedItems.length > 0 && closedSelectionKey !== selectedKey;
  const summary = useMemo(() => buildSummary(items), [items]);

  return (
    <section className="payment-calendar" aria-labelledby="payment-calendar-title">
      <header className="payment-calendar__heading">
        <div>
          <Typography.Text className="payment-calendar__eyebrow">FINANS PLANI</Typography.Text>
          <Typography.Title id="payment-calendar-title" level={1}>Odeme Takvimi</Typography.Title>
          <Typography.Paragraph>Ay icindeki tahsilatlari, beklenen taksitleri ve senet vadelerini izleyin.</Typography.Paragraph>
        </div>
      </header>

      {state.status === "error" && <StatusLine tone="error" title="Odeme takvimi yuklenemedi" description="Odeme planini yeniden yukleyerek devam edebilirsiniz." action={<Button onClick={() => setReloadKey((value) => value + 1)}>Tekrar dene</Button>} />}
      {state.status === "loading" && <div className="payment-calendar__loading" role="status" aria-label="Odeme takvimi yukleniyor"><Skeleton active paragraph={{ rows: 8 }} /></div>}
      {state.status === "success" && (
        <>
          <SummaryCards summary={summary} />
          <div className={`payment-calendar__layout${showSelectedPayments ? "" : " payment-calendar__layout--full"}`}>
            <div className="payment-calendar__surface">
              <Calendar
                value={selectedDate}
                fullscreen={screens.md === true}
                onPanelChange={(date, mode) => { setSelectedDate(date); setPanelMode(mode); }}
                onSelect={(date, info) => { if (info.source === "date" || info.source === "month") setSelectedDate(date); }}
                cellRender={(date, info) => info.type === "date" ? <CalendarCell date={date} items={items} /> : info.originNode}
              />
              {items.length === 0 && <div className="payment-calendar__empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bu ay icin odeme hareketi bulunmuyor." /></div>}
            </div>
            {showSelectedPayments && <SelectedPayments date={selectedDate} scope={selectedScope} items={selectedItems} onClose={() => setClosedSelectionKey(selectedKey)} />}
          </div>
        </>
      )}
    </section>
  );
}

function SummaryCards({ summary }: { summary: PaymentSummary }): JSX.Element {
  return (
      <div className="payment-calendar__summary" aria-label="Aylik odeme ozeti">
      <MetricCard title="Tamamlanan odemeler" kind="completed" value={summary.completed.count} amount={summary.completed.amount} icon={<CheckCircleOutlined />} breakdown={summary.completed.byMethod} />
      <MetricCard title="Beklenen taksitler" kind="installment" value={summary.installment.count} amount={summary.installment.amount} icon={<ClockCircleOutlined />} />
      <MetricCard title="Beklenen senetler" kind="promissory" value={summary.promissory.count} amount={summary.promissory.amount} icon={<FileTextOutlined />} />
    </div>
  );
}

function MetricCard({ title, kind, value, amount, icon, breakdown }: {
  title: string;
  kind: PaymentKind;
  value: number;
  amount: number;
  icon: JSX.Element;
  breakdown?: PaymentMethodSummary;
}): JSX.Element {
  return (
    <Card className="payment-calendar__metric">
      <Flex align="center" justify="space-between" gap={16}>
        <Statistic title={title} value={value} suffix="adet" />
        <span className="payment-calendar__metric-icon" aria-hidden="true">{icon}</span>
      </Flex>
      <strong className={`payment-calendar__metric-amount payment-calendar__metric-amount--${kind}`}>{currency.format(amount)}</strong>
      {breakdown && <PaymentMethodBreakdown breakdown={breakdown} />}
    </Card>
  );
}

function PaymentMethodBreakdown({ breakdown }: { breakdown: PaymentMethodSummary }): JSX.Element {
  const visibleMethods = paymentMethods.filter((method) => breakdown[method].count > 0);
  if (visibleMethods.length === 0) return <Typography.Text type="secondary">Odeme yontemi kaydi yok</Typography.Text>;

  return (
    <div className="payment-calendar__method-breakdown" aria-label="Odeme yontemine gore tamamlananlar">
      {visibleMethods.map((method) => (
        <span key={method}>
          <Typography.Text type="secondary">{paymentMethodLabels[method]}</Typography.Text>
          <strong>{breakdown[method].count} adet - {currency.format(breakdown[method].amount)}</strong>
        </span>
      ))}
    </div>
  );
}

function CalendarCell({ date, items }: { date: Dayjs; items: PaymentCalendarItem[] }): JSX.Element {
  const dayItems = items.filter((item) => eventDate(item).isSame(date, "day"));
  if (dayItems.length === 0) return <></>;

  return (
    <div className="payment-calendar__events" aria-label={`${dayItems.length} odeme`}>
      {dayItems.slice(0, 3).map((item) => (
        <span key={item.paymentId} className={`payment-calendar__event payment-calendar__event--${paymentKind(item)}`} title={`${item.studentFullName} - ${currency.format(item.amount)}`}>
          <span className="payment-calendar__event-marker" aria-hidden="true" />
          <span>{eventLabel(item)}</span>
        </span>
      ))}
      {dayItems.length > 3 && <span className="payment-calendar__more">+{dayItems.length - 3} odeme daha</span>}
    </div>
  );
}

function SelectedPayments({ date, scope, items, onClose }: { date: Dayjs; scope: SelectedScope; items: PaymentCalendarItem[]; onClose: () => void }): JSX.Element {
  return (
    <aside className="payment-calendar__day" aria-labelledby="selected-payment-day-title" aria-label={scope === "date" ? "Secili gun odemeleri" : "Secili ay odemeleri"}>
      <div className="payment-calendar__day-heading">
        <CalendarOutlined aria-hidden="true" />
        <div>
          <Typography.Text type="secondary">{scope === "date" ? "Secili gun" : "Secili ay"}</Typography.Text>
          <Typography.Title id="selected-payment-day-title" level={4}>{scope === "date" ? date.format("D MMMM YYYY") : date.format("MMMM YYYY")}</Typography.Title>
        </div>
        <Tag>{items.length} odeme</Tag>
        <Tooltip title="Paneli kapat">
          <Button className="payment-calendar__day-close" type="text" aria-label="Secili gun panelini kapat" icon={<CloseOutlined />} onClick={onClose} />
        </Tooltip>
      </div>
      <div className="payment-calendar__day-list">
        {items.map((item) => <PaymentSummaryCard key={item.paymentId} item={item} />)}
      </div>
    </aside>
  );
}

function PaymentSummaryCard({ item }: { item: PaymentCalendarItem }): JSX.Element {
  return (
    <article className="payment-calendar__payment">
      <Flex justify="space-between" align="flex-start" gap={8}>
        <div><Typography.Text type="secondary">{item.courseName}</Typography.Text><strong>{item.studentFullName}</strong></div>
        <Tag className={`payment-calendar__status payment-calendar__status--${paymentKind(item)}`} icon={statusIcon(item)}>{eventLabel(item)}</Tag>
      </Flex>
      <div className="payment-calendar__amount">{currency.format(item.amount)}</div>
      <div className="payment-calendar__meta">
        <span><BankOutlined aria-hidden="true" />{item.classCode} - {item.className}</span>
        <span><CalendarOutlined aria-hidden="true" />{formatDate(displayDate(item))}</span>
        <span><OrderedListOutlined aria-hidden="true" />{item.installmentNumber}/{item.installmentTotal}</span>
      </div>
    </article>
  );
}

type PaymentMethodSummary = Record<CompletedPaymentMethod, { count: number; amount: number }>;
type PaymentSummary = {
  completed: { count: number; amount: number; byMethod: PaymentMethodSummary };
  installment: { count: number; amount: number };
  promissory: { count: number; amount: number };
};

const paymentMethods: CompletedPaymentMethod[] = ["CASH", "CREDIT_CARD", "BANK_TRANSFER"];
const paymentMethodLabels: Record<CompletedPaymentMethod, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi karti",
  BANK_TRANSFER: "Havale/EFT",
};

function buildSummary(items: PaymentCalendarItem[]): PaymentSummary {
  return items.reduce<PaymentSummary>((summary, item) => {
    const kind = paymentKind(item);
    summary[kind].count += 1;
    summary[kind].amount += item.amount;
    if (kind === "completed" && item.paymentMethod) {
      summary.completed.byMethod[item.paymentMethod].count += 1;
      summary.completed.byMethod[item.paymentMethod].amount += item.amount;
    }
    return summary;
  }, {
    completed: {
      count: 0,
      amount: 0,
      byMethod: {
        CASH: { count: 0, amount: 0 },
        CREDIT_CARD: { count: 0, amount: 0 },
        BANK_TRANSFER: { count: 0, amount: 0 },
      },
    },
    installment: { count: 0, amount: 0 },
    promissory: { count: 0, amount: 0 },
  });
}

function paymentKind(item: PaymentCalendarItem): PaymentKind {
  if (item.status === "COMPLETED") return "completed";
  return item.paymentPlan === "PROMISSORY_NOTE" ? "promissory" : "installment";
}

function eventLabel(item: PaymentCalendarItem): string {
  const kind = paymentKind(item);
  if (kind === "completed") return "Tahsil edildi";
  if (kind === "promissory") return "Senet vadesi";
  return "Taksit vadesi";
}

function statusIcon(item: PaymentCalendarItem): JSX.Element {
  const kind = paymentKind(item);
  if (kind === "completed") return <CheckCircleOutlined />;
  if (kind === "promissory") return <FileTextOutlined />;
  return <ClockCircleOutlined />;
}

function eventDate(item: PaymentCalendarItem): Dayjs {
  return dayjs(displayDate(item));
}

function displayDate(item: PaymentCalendarItem): string {
  return item.status === "COMPLETED" ? item.paidAt ?? item.dueDate ?? "" : item.dueDate ?? item.paidAt ?? "";
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}
