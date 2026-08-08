import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import CalendarOutlined from "@ant-design/icons/CalendarOutlined";
import CheckCircleOutlined from "@ant-design/icons/CheckCircleOutlined";
import ClockCircleOutlined from "@ant-design/icons/ClockCircleOutlined";
import TeamOutlined from "@ant-design/icons/TeamOutlined";
import UserOutlined from "@ant-design/icons/UserOutlined";
import { Button, Calendar, Empty, Flex, Grid, Progress, Select, Skeleton, Tag, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/tr";

import { StatusLine } from "../../../shared/ui/StatusLine";
import { loadCalendarClasses, type CourseClass } from "../api/calendarApi";
import "./calendarWorkspace.css";

type CalendarState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; classes: CourseClass[] };

type CalendarStatus = CourseClass["status"] | "ALL";

const statusLabels: Record<CourseClass["status"], string> = {
  ENROLLMENT_OPEN: "Kayıt açık",
  PLANNED: "Planlandı",
  IN_PROGRESS: "Devam ediyor",
  COMPLETED: "Tamamlandı",
};

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const emptyClasses: CourseClass[] = [];

dayjs.locale("tr");

export function CalendarWorkspace(): JSX.Element {
  const screens = Grid.useBreakpoint();
  const [state, setState] = useState<CalendarState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => dayjs());
  const [status, setStatus] = useState<CalendarStatus>("ALL");

  useEffect(() => {
    let active = true;
    void loadCalendarClasses()
      .then((classes) => { if (active) setState({ status: "success", classes }); })
      .catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, [reloadKey]);

  const classes = state.status === "success" ? state.classes : emptyClasses;
  const visibleClasses = useMemo(
    () => classes.filter((item) => status === "ALL" || item.status === status),
    [classes, status],
  );
  const selectedClasses = useMemo(
    () => visibleClasses.filter((item) => includesDate(item, selectedDate)),
    [selectedDate, visibleClasses],
  );

  return (
    <section className="class-calendar" aria-labelledby="class-calendar-title">
      <header className="class-calendar__heading">
        <div>
          <Typography.Text className="class-calendar__eyebrow">EĞİTİM PLANI</Typography.Text>
          <Typography.Title id="class-calendar-title" level={1}>Ders takvimi</Typography.Title>
          <Typography.Paragraph>Sınıfların başlangıç ve bitiş dönemlerini ay üzerinde karşılaştırın.</Typography.Paragraph>
        </div>
        <Select<CalendarStatus>
          aria-label="Sınıf durumuna göre filtrele"
          className="class-calendar__filter"
          value={status}
          onChange={setStatus}
          options={[{ value: "ALL", label: "Tüm sınıflar" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value: value as CourseClass["status"], label }))]}
        />
      </header>

      {state.status === "error" && <StatusLine tone="error" title="Ders takvimi yüklenemedi" description="Sınıf bilgilerini yeniden yükleyerek devam edebilirsiniz." action={<Button onClick={() => { setState({ status: "loading" }); setReloadKey((value) => value + 1); }}>Tekrar dene</Button>} />}
      {state.status === "loading" && <div className="class-calendar__loading" role="status" aria-label="Ders takvimi yükleniyor"><Skeleton active paragraph={{ rows: 8 }} /></div>}
      {state.status === "success" && (
        <div className="class-calendar__layout">
          <div className="class-calendar__surface">
            <Calendar
              value={selectedDate}
              fullscreen={screens.md === true}
              onSelect={(date, info) => { if (info.source === "date") setSelectedDate(date); }}
              cellRender={(date, info) => info.type === "date" ? <CalendarCell date={date} classes={visibleClasses} /> : info.originNode}
            />
            {visibleClasses.length === 0 && <div className="class-calendar__empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={classes.length === 0 ? "Takvimde gösterilecek sınıf bulunmuyor." : "Bu filtreye uygun sınıf bulunmuyor."} /></div>}
          </div>
          <SelectedDay date={selectedDate} classes={selectedClasses} />
        </div>
      )}
    </section>
  );
}

function CalendarCell({ date, classes }: { date: Dayjs; classes: CourseClass[] }): JSX.Element {
  const dayClasses = classes.filter((item) => includesDate(item, date));
  if (dayClasses.length === 0) return <></>;

  return (
    <div className="class-calendar__events" aria-label={`${dayClasses.length} sınıf`}>
      {dayClasses.slice(0, 3).map((item) => (
        <span key={item.id} className={`class-calendar__event class-calendar__event--${item.status.toLocaleLowerCase()}`} title={`${item.name} · ${item.instructorName}`}>
          <span className="class-calendar__event-marker" aria-hidden="true" />
          <span>{item.name}</span>
        </span>
      ))}
      {dayClasses.length > 3 && <span className="class-calendar__more">+{dayClasses.length - 3} sınıf daha</span>}
    </div>
  );
}

function SelectedDay({ date, classes }: { date: Dayjs; classes: CourseClass[] }): JSX.Element {
  return (
    <aside className="class-calendar__day" aria-labelledby="selected-day-title">
      <div className="class-calendar__day-heading">
        <CalendarOutlined aria-hidden="true" />
        <div><Typography.Text type="secondary">Seçili gün</Typography.Text><Typography.Title id="selected-day-title" level={4}>{date.format("D MMMM YYYY")}</Typography.Title></div>
        <Tag>{classes.length} sınıf</Tag>
      </div>
      {classes.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bu tarihte devam eden sınıf yok." /> : (
        <div className="class-calendar__day-list">
          {classes.map((item) => <ClassSummary key={item.id} item={item} />)}
        </div>
      )}
    </aside>
  );
}

function ClassSummary({ item }: { item: CourseClass }): JSX.Element {
  const occupancy = Math.round((item.enrolledCount / item.capacity) * 100);
  const completed = item.status === "COMPLETED";
  return (
    <article className="class-calendar__class">
      <Flex justify="space-between" align="flex-start" gap={8}>
        <div><Typography.Text type="secondary">{item.courseName}</Typography.Text><strong>{item.name}</strong></div>
        <Tag className={`class-calendar__status class-calendar__status--${item.status.toLocaleLowerCase()}`} icon={completed ? <CheckCircleOutlined /> : <ClockCircleOutlined />}>{statusLabels[item.status]}</Tag>
      </Flex>
      <div className="class-calendar__meta"><span><UserOutlined aria-hidden="true" />{item.instructorName}</span><span><CalendarOutlined aria-hidden="true" />{formatDate(item.startDate)} – {formatDate(item.endDate)}</span></div>
      <div className="class-calendar__occupancy"><Flex justify="space-between"><span><TeamOutlined aria-hidden="true" /> Doluluk</span><strong>{item.enrolledCount}/{item.capacity}</strong></Flex><Progress percent={occupancy} showInfo={false} size="small" /></div>
    </article>
  );
}

function includesDate(item: CourseClass, date: Dayjs): boolean {
  return !date.isBefore(dayjs(item.startDate), "day") && !date.isAfter(dayjs(item.endDate), "day");
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}
