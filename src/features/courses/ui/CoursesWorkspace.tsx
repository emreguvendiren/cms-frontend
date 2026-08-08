import type { JSX } from "react";
import { useEffect, useState } from "react";
import BookOutlined from "@ant-design/icons/BookOutlined";
import CalendarOutlined from "@ant-design/icons/CalendarOutlined";
import CheckCircleOutlined from "@ant-design/icons/CheckCircleOutlined";
import ClockCircleOutlined from "@ant-design/icons/ClockCircleOutlined";
import DeleteOutlined from "@ant-design/icons/DeleteOutlined";
import EditOutlined from "@ant-design/icons/EditOutlined";
import PlusOutlined from "@ant-design/icons/PlusOutlined";
import SearchOutlined from "@ant-design/icons/SearchOutlined";
import UserAddOutlined from "@ant-design/icons/UserAddOutlined";
import WalletOutlined from "@ant-design/icons/WalletOutlined";
import { App, Button, DatePicker, Descriptions, Empty, Flex, Form, Grid, Input, InputNumber, Modal, Pagination, Popconfirm, Progress, Radio, Segmented, Select, Space, Spin, Table, Tabs, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import type { AuthenticatedUser } from "../../auth";
import { StatusLine } from "../../../shared/ui/StatusLine";
import {
  createClass, createCourse, enrollStudent, loadClassDetail, loadClasses, loadCourses, loadEnrollmentCandidates, receivePayment, removeClass, removeCourse, removeEnrollment, updateClass, updateCourse, updateEnrollment,
  type ClassDetail, type ClassPage, type ClassStatus, type Course, type CourseClass, type CoursePage, type CourseStatus,
  type CreateClassEnrollmentRequest, type CreateClassRequest, type CreateCourseRequest, type EnrolledStudent, type PaymentPlanType, type PaymentStatus, type UpdateClassEnrollmentRequest,
  type Student, type StudentStatus,
} from "../api/trainingApi";
import "./coursesWorkspace.css";

type WorkspaceTab = "courses" | "classes";
type RemotePage<T> = { status: "loading" } | { status: "error" } | { status: "success"; page: T };
type CourseFormValues = Omit<CreateCourseRequest, never>;
type ClassFormValues = Omit<CreateClassRequest, "startDate" | "endDate"> & { dateRange: [Dayjs, Dayjs] };
type EditingRecord = { type: "course"; value: Course } | { type: "class"; value: CourseClass };
type EnrollmentFormValues = Omit<CreateClassEnrollmentRequest, "firstPaymentDate" | "expectedPaymentDate"> & {
  firstPaymentDate?: Dayjs;
  expectedPaymentDate?: Dayjs;
};
type EnrollmentEditFormValues = Omit<UpdateClassEnrollmentRequest, "firstPaymentDate" | "expectedPaymentDate"> & { firstPaymentDate?: Dayjs; expectedPaymentDate?: Dayjs };

const PAGE_SIZE = 8;
const currency = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const courseStatusLabels: Record<CourseStatus, string> = { ACTIVE: "Aktif", DRAFT: "Taslak", ARCHIVED: "Arşivlendi" };
const classStatusLabels: Record<ClassStatus, string> = { ENROLLMENT_OPEN: "Kayıt açık", PLANNED: "Planlandı", IN_PROGRESS: "Devam ediyor", COMPLETED: "Tamamlandı" };
const enrollmentLabels: Record<string, string> = { ACTIVE: "Aktif kayıt", COMPLETED: "Tamamladı", CANCELLED: "İptal edildi" };
const paymentPlanLabels: Record<PaymentPlanType, string> = { CASH: "Peşin", INSTALLMENT: "Taksitli" };
const paymentStatusLabels = { PENDING: "Ödeme bekliyor", COMPLETED: "Ödeme tamamlandı" } as const;

export function CoursesWorkspace({ user }: { user: AuthenticatedUser }): JSX.Element {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [tab, setTab] = useState<WorkspaceTab>("courses");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CourseStatus | ClassStatus | "all">("all");
  const [pageNumber, setPageNumber] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditingRecord>();
  const [submitting, setSubmitting] = useState(false);
  const [coursesState, setCoursesState] = useState<RemotePage<CoursePage>>({ status: "loading" });
  const [classesState, setClassesState] = useState<RemotePage<ClassPage>>({ status: "loading" });
  const [courseOptions, setCourseOptions] = useState<Course[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ClassDetail>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [detailTarget, setDetailTarget] = useState<CourseClass>();
  const [startDetailInEnrollment, setStartDetailInEnrollment] = useState(false);
  const [form] = Form.useForm<CourseFormValues | ClassFormValues>();
  const can = (authority: string) => user.authorities.includes(authority);

  useEffect(() => {
    let active = true;
    void loadCourses({ search: "", page: 0, size: 100 }).then((result) => { if (active) setCourseOptions(result.content); }).catch(() => undefined);
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      if (tab === "courses") {
        setCoursesState({ status: "loading" });
        void loadCourses({ search: query, status: status === "all" ? undefined : status as CourseStatus, page: pageNumber, size: PAGE_SIZE })
          .then((page) => { if (active) setCoursesState({ status: "success", page }); }).catch(() => { if (active) setCoursesState({ status: "error" }); });
      } else {
        setClassesState({ status: "loading" });
        void loadClasses({ search: query, status: status === "all" ? undefined : status as ClassStatus, page: pageNumber, size: PAGE_SIZE })
          .then((page) => { if (active) setClassesState({ status: "success", page }); }).catch(() => { if (active) setClassesState({ status: "error" }); });
      }
    }, 300);
    return () => { active = false; window.clearTimeout(id); };
  }, [tab, query, status, pageNumber, reloadKey]);

  const resetFilters = () => { setQuery(""); setStatus("all"); setPageNumber(0); };
  const openCreate = () => { setEditing(undefined); form.resetFields(); form.setFieldsValue(tab === "courses" ? { status: "ACTIVE" } : { status: "PLANNED" }); setFormOpen(true); };
  const openEditCourse = (course: Course) => { setEditing({ type: "course", value: course }); form.setFieldsValue({ name: course.name, category: course.category, durationHours: course.durationHours, listPrice: course.listPrice, status: course.status }); setFormOpen(true); };
  const openEditClass = (item: CourseClass) => { setEditing({ type: "class", value: item }); form.setFieldsValue({ name: item.name, courseId: item.courseId, instructorName: item.instructorName, capacity: item.capacity, status: item.status, dateRange: [dayjs(item.startDate), dayjs(item.endDate)] }); setFormOpen(true); };

  const submit = async () => {
    const values = await form.validateFields(); setSubmitting(true);
    try {
      if (tab === "courses") {
        const request = values as CourseFormValues;
        if (editing?.type === "course") await updateCourse(editing.value.id, { ...request, version: editing.value.version }); else await createCourse(request);
        message.success(editing ? "Kurs bilgileri güncellendi." : "Kurs oluşturuldu.");
      } else {
        const value = values as ClassFormValues;
        const request = { name: value.name, courseId: value.courseId, instructorName: value.instructorName, capacity: value.capacity, status: value.status, startDate: value.dateRange[0].format("YYYY-MM-DD"), endDate: value.dateRange[1].format("YYYY-MM-DD") };
        if (editing?.type === "class") await updateClass(editing.value.id, { ...request, version: editing.value.version }); else await createClass(request);
        message.success(editing ? "Sınıf bilgileri güncellendi." : "Sınıf planlandı.");
      }
      setFormOpen(false); form.resetFields(); setPageNumber(0); setReloadKey((value) => value + 1);
    } catch (error) { if (!(error && typeof error === "object" && "errorFields" in error)) message.error("Kayıt güncellenemedi. Bilgileri kontrol edip tekrar deneyin."); }
    finally { setSubmitting(false); }
  };

  const confirmDelete = (type: "course" | "class", record: Course | CourseClass) => {
    modal.confirm({ centered: true, title: `${record.name} silinsin mi?`, content: type === "course" ? "Bağlı sınıfı bulunan kurslar silinemez." : "Kayıtlı öğrencisi bulunan sınıflar silinemez.", okText: "Kalıcı olarak sil", okType: "danger", cancelText: "Vazgeç",
      onOk: async () => { try { if (type === "course") await removeCourse(record.id); else await removeClass(record.id); message.success(`${type === "course" ? "Kurs" : "Sınıf"} silindi.`); setReloadKey((value) => value + 1); } catch { message.error("Kayıt silinemedi. Bağlı kayıtları kontrol edin."); } },
    });
  };

  const openDetail = async (item: CourseClass, startInEnrollment = false) => {
    setDetailTarget(item);
    setStartDetailInEnrollment(startInEnrollment);
    setDetailOpen(true); setDetail(undefined); setDetailError(false); setDetailLoading(true);
    try { setDetail(await loadClassDetail(item.id)); } catch { setDetailError(true); } finally { setDetailLoading(false); }
  };

  const state = tab === "courses" ? coursesState : classesState;
  const currentPage = state.status === "success" ? state.page : undefined;
  const allowCreate = can(tab === "courses" ? "course:create" : "class:create");
  const modalTitle = editing ? `${editing.value.name} kaydını düzenle` : tab === "courses" ? "Yeni kurs oluştur" : "Yeni sınıf planla";

  return <div className="courses">
    <div className="courses__heading"><div><Typography.Text className="courses__eyebrow">EĞİTİM PORTFÖYÜ</Typography.Text><Typography.Title>Kurslar ve sınıflar</Typography.Title><Typography.Paragraph>Kurs portföyünü, dönem sınıflarını ve öğrenci doluluklarını tek yerden yönetin.</Typography.Paragraph></div>{allowCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Yeni {tab === "courses" ? "kurs" : "sınıf"}</Button>}</div>
    <Tabs activeKey={tab} onChange={(key) => { setTab(key as WorkspaceTab); resetFilters(); }} items={[{ key: "courses", label: <span><BookOutlined /> Kurslar {coursesState.status === "success" && <b>{coursesState.page.totalElements}</b>}</span> }, { key: "classes", label: <span><CalendarOutlined /> Sınıflar {classesState.status === "success" && <b>{classesState.page.totalElements}</b>}</span> }]} />
    <div className="courses__toolbar"><Input aria-label="Kayıtlarda ara" prefix={<SearchOutlined />} placeholder={`${tab === "courses" ? "Kurs" : "Sınıf"} ara`} value={query} onChange={(event) => { setQuery(event.target.value); setPageNumber(0); }} allowClear/><Select aria-label="Duruma göre filtrele" value={status} onChange={(value) => { setStatus(value); setPageNumber(0); }} options={statusOptions(tab)} /></div>
    {state.status === "error" && <StatusLine tone="error" title="Kayıtlar yüklenemedi" description="Bağlantıyı kontrol edip tekrar deneyin." action={<Button onClick={() => setReloadKey((value) => value + 1)}>Tekrar dene</Button>} />}
    {state.status === "loading" && <div className="courses__loading">Kayıtlar yükleniyor…</div>}
    {currentPage && <Records tab={tab} page={currentPage} mobile={!screens.md} hasFilters={query !== "" || status !== "all"} can={can} onCreate={openCreate} onClear={resetFilters} onPageChange={(value) => setPageNumber(value - 1)} onEditCourse={openEditCourse} onEditClass={openEditClass} onDelete={confirmDelete} onClassEnrollment={(item) => void openDetail(item, true)} />}
    <Modal centered open={formOpen} title={modalTitle} okText={editing ? "Değişiklikleri kaydet" : tab === "courses" ? "Kursu oluştur" : "Sınıfı planla"} cancelText="Vazgeç" confirmLoading={submitting} closable={!submitting} mask={{ closable: !submitting }} onCancel={() => setFormOpen(false)} onOk={() => void submit()}>{tab === "courses" ? <CourseForm form={form} /> : <ClassForm form={form} courses={courseOptions.filter((course) => course.status !== "ARCHIVED")} />}</Modal>
    <ClassDetailModal key={`${detailTarget?.id ?? "class"}-${startDetailInEnrollment}-${detailOpen}`} open={detailOpen} startInEnrollment={startDetailInEnrollment} loading={detailLoading} error={detailError} detail={detail} canEnroll={can("class:enrollment:create")} canUpdateEnrollment={can("class:enrollment:update")} canDeleteEnrollment={can("class:enrollment:delete")} onDetailChange={setDetail} onClose={() => setDetailOpen(false)} onRetry={() => { if (detailTarget) void openDetail(detailTarget, startDetailInEnrollment); }} />
  </div>;
}

type RecordsProps = { tab: WorkspaceTab; page: CoursePage | ClassPage; mobile: boolean; hasFilters: boolean; can: (authority: string) => boolean; onCreate: () => void; onClear: () => void; onPageChange: (page: number) => void; onEditCourse: (record: Course) => void; onEditClass: (record: CourseClass) => void; onDelete: (type: "course" | "class", record: Course | CourseClass) => void; onClassEnrollment: (record: CourseClass) => void };
function Records(props: RecordsProps): JSX.Element {
  const { tab, page, mobile, hasFilters } = props;
  const [expandedClassIds, setExpandedClassIds] = useState<string[]>([]);
  const [classDetails, setClassDetails] = useState<Record<string, ClassDetail>>({});
  const [loadingClassIds, setLoadingClassIds] = useState<string[]>([]);
  const [failedClassIds, setFailedClassIds] = useState<string[]>([]);
  const toggleClass = async (expanded: boolean, item: CourseClass, force = false) => {
    setExpandedClassIds((ids) => expanded ? [...new Set([...ids, item.id])] : ids.filter((id) => id !== item.id));
    if (!expanded || (!force && classDetails[item.id]) || loadingClassIds.includes(item.id)) return;
    setLoadingClassIds((ids) => [...ids, item.id]); setFailedClassIds((ids) => ids.filter((id) => id !== item.id));
    try { const next = await loadClassDetail(item.id); setClassDetails((items) => ({ ...items, [item.id]: next })); }
    catch { setFailedClassIds((ids) => [...new Set([...ids, item.id])]); }
    finally { setLoadingClassIds((ids) => ids.filter((id) => id !== item.id)); }
  };
  const expandedContent = (item: CourseClass) => <ExpandedClassStudents detail={classDetails[item.id]} loading={loadingClassIds.includes(item.id)} error={failedClassIds.includes(item.id)} canReceivePayment={props.can("class:enrollment:update")} onDetailChange={(next) => setClassDetails((items) => ({ ...items, [item.id]: next }))} onRetry={() => void toggleClass(true, item, true)} />;
  if (page.content.length === 0) {
    const mayCreate = props.can(tab === "courses" ? "course:create" : "class:create");
    return <Empty description={hasFilters ? "Bu filtrelere uygun kayıt bulunamadı." : `Henüz ${tab === "courses" ? "kurs" : "sınıf"} eklenmedi.`}>{hasFilters ? <Button onClick={props.onClear}>Filtreleri temizle</Button> : mayCreate ? <Button type="primary" onClick={props.onCreate}>İlk kaydı oluştur</Button> : null}</Empty>;
  }
  const courseColumns: ColumnsType<Course> = [
    { title: "Kurs", dataIndex: "name", render: (value, record) => <div className="courses__primary-cell"><strong>{value}</strong><small>{record.category}</small></div> },
    { title: "Süre", dataIndex: "durationHours", render: (value) => `${value} saat` }, { title: "Liste fiyatı", dataIndex: "listPrice", align: "right", render: (value) => currency.format(value) },
    { title: "Durum", dataIndex: "status", render: (value) => <StatusTag value={value} /> },
    { title: "İşlemler", width: 140, render: (_, record) => <RecordActions canUpdate={props.can("course:update")} canDelete={props.can("course:delete")} onEdit={() => props.onEditCourse(record)} onDelete={() => props.onDelete("course", record)} /> },
  ];
  const classColumns: ColumnsType<CourseClass> = [
    { title: "Sınıf", dataIndex: "name", render: (value, record) => <div className="courses__primary-cell"><strong>{value}</strong><small>{record.courseName}</small></div> }, { title: "Eğitmen", dataIndex: "instructorName" },
    { title: "Tarih aralığı", dataIndex: "startDate", render: (value, record) => <div className="courses__primary-cell"><span>{formatApiDate(value)}</span><small>{formatApiDate(record.endDate)} tarihine kadar</small></div> },
    { title: "Doluluk", width: 160, render: (_, record) => <Occupancy item={record} /> }, { title: "Durum", dataIndex: "status", render: (value) => <StatusTag value={value} /> },
    { title: "İşlemler", width: 300, render: (_, record) => <Space size={8} wrap={false}>{props.can("class:enrollment:create") && <Button size="small" icon={<UserAddOutlined />} onClick={() => props.onClassEnrollment(record)}>Öğrenci kaydet</Button>}<RecordActions canUpdate={props.can("class:update")} canDelete={props.can("class:delete")} onEdit={() => props.onEditClass(record)} onDelete={() => props.onDelete("class", record)} /></Space> },
  ];
  return <>{mobile ? <div className="courses__mobile-list">{tab === "courses" ? (page as CoursePage).content.map((item) => <CourseCard key={item.id} item={item} {...props} />) : (page as ClassPage).content.map((item) => <div key={item.id} className="courses__mobile-class"><ClassCard item={item} {...props} /><Flex gap={8} wrap><Button onClick={() => void toggleClass(!expandedClassIds.includes(item.id), item)}>{expandedClassIds.includes(item.id) ? "Öğrencileri gizle" : "Öğrencileri göster"}</Button>{props.can("class:enrollment:create") && <Button type="primary" icon={<UserAddOutlined />} onClick={() => props.onClassEnrollment(item)}>Öğrenci kaydet</Button>}</Flex>{expandedClassIds.includes(item.id) && expandedContent(item)}</div>)}</div> : tab === "courses" ? <Table className="courses__records-table" rowKey="id" columns={courseColumns} dataSource={(page as CoursePage).content} pagination={false} /> : <Table className="courses__records-table" rowKey="id" columns={classColumns} dataSource={(page as ClassPage).content} pagination={false} expandable={{ expandedRowKeys: expandedClassIds, onExpand: (expanded, record) => void toggleClass(expanded, record), expandedRowRender: expandedContent }} />}{page.totalElements > page.size && <Pagination className="courses__pagination" current={page.page + 1} pageSize={page.size} total={page.totalElements} showSizeChanger={false} onChange={props.onPageChange} />}</>;
}

function ExpandedClassStudents({ detail, loading, error, canReceivePayment, onDetailChange, onRetry }: { detail?: ClassDetail; loading: boolean; error: boolean; canReceivePayment: boolean; onDetailChange: (detail: ClassDetail) => void; onRetry: () => void }): JSX.Element {
  const [paymentStudent, setPaymentStudent] = useState<EnrolledStudent>();
  if (loading) return <div className="courses__expanded-state"><Spin size="small" /> Öğrenciler yükleniyor…</div>;
  if (error) return <StatusLine tone="error" title="Sınıf öğrencileri yüklenemedi" description="Bu sınıfın öğrenci listesini yeniden yükleyin." action={<Button onClick={onRetry}>Tekrar dene</Button>} />;
  if (!detail || detail.students.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bu sınıfa henüz öğrenci kaydedilmedi." />;
  const updateStudent = (updated: EnrolledStudent) => {
    setPaymentStudent(updated);
    onDetailChange({ ...detail, students: detail.students.map((student) => student.enrollmentId === updated.enrollmentId ? updated : student) });
  };
  return <><div className="courses__expanded-table-scroll"><Table className="courses__expanded-students" rowKey="id" size="small" pagination={false} dataSource={detail.students} columns={[{ title: "Öğrenci", dataIndex: "fullName" }, { title: "E-posta", dataIndex: "email" }, { title: "Kayıt ücreti", dataIndex: "registrationFee", align: "right", render: (value) => currency.format(value) }, { title: "Ödeme", render: (_, student) => `${paymentPlanLabels[student.paymentPlan]} · ${paymentStatusLabels[student.paymentStatus]}` }, { title: "Kayıt durumu", dataIndex: "enrollmentStatus", render: (value) => <Tag>{enrollmentLabels[value] ?? value}</Tag> }, { title: "", width: 56, align: "center", render: (_, student) => <Tooltip title="Ödeme detayları"><Button aria-label={`${student.fullName} ödeme detayları`} type="text" icon={<WalletOutlined />} onClick={() => setPaymentStudent(student)} /></Tooltip> }]} /></div><PaymentDetailsModal classId={detail.classInfo.id} student={paymentStudent} canReceivePayment={canReceivePayment} onStudentChange={updateStudent} onClose={() => setPaymentStudent(undefined)} /></>;
}

function PaymentDetailsModal({ classId, student, canReceivePayment, onStudentChange, onClose }: { classId: string; student?: EnrolledStudent; canReceivePayment: boolean; onStudentChange: (student: EnrolledStudent) => void; onClose: () => void }): JSX.Element {
  const { message } = App.useApp();
  const [receivingPaymentId, setReceivingPaymentId] = useState<string>();
  const paidAmount = student?.payments.filter((payment) => payment.status === "COMPLETED").reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const pendingAmount = student?.payments.filter((payment) => payment.status === "PENDING").reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const receive = async (paymentId: string, version: number) => {
    if (!student) return;
    setReceivingPaymentId(paymentId);
    try {
      const updated = await receivePayment(classId, student.enrollmentId, paymentId, { version });
      onStudentChange(updated);
      message.success("Ödeme alındı olarak kaydedildi.");
    } catch { message.error("Ödeme kaydedilemedi. Güncel ödeme durumunu kontrol edip tekrar deneyin."); }
    finally { setReceivingPaymentId(undefined); }
  };
  return <Modal open={Boolean(student)} title={student ? `${student.fullName} · Ödeme detayları` : "Ödeme detayları"} width={920} onCancel={onClose} footer={<Button onClick={onClose}>Kapat</Button>} destroyOnHidden>
    {student && <div className="courses__payment-details"><Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} items={[{ key: "fee", label: "Kayıt ücreti", children: currency.format(student.registrationFee) }, { key: "plan", label: "Ödeme türü", children: student.paymentPlan === "INSTALLMENT" ? `${paymentPlanLabels[student.paymentPlan]} · ${student.installmentCount ?? student.payments.length} taksit` : paymentPlanLabels[student.paymentPlan] }, { key: "status", label: "Genel ödeme durumu", children: <PaymentStatusTag status={student.paymentStatus} /> }, { key: "paid", label: "Ödenen", children: currency.format(paidAmount) }, { key: "pending", label: "Bekleyen", children: currency.format(pendingAmount) }, { key: "start", label: student.paymentPlan === "INSTALLMENT" ? "İlk taksit tarihi" : "Tahmini ödeme tarihi", children: formatOptionalApiDate(student.paymentPlan === "INSTALLMENT" ? student.firstPaymentDate : student.expectedPaymentDate) }, { key: "note", label: "Not", span: 2, children: student.note || "-" }]} />
      <section aria-labelledby="payment-installments-title"><Typography.Title id="payment-installments-title" level={5}>Ödeme ve taksit planı</Typography.Title><Table rowKey="id" size="small" pagination={false} dataSource={student.payments} scroll={{ x: 760 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Ödeme planı bulunmuyor." /> }} columns={[{ title: "Sıra", render: (_, payment) => `${payment.installmentNumber}/${payment.installmentTotal}` }, { title: "Vade tarihi", dataIndex: "dueDate", render: (value) => formatOptionalApiDate(value) }, { title: "Tutar", dataIndex: "amount", align: "right", render: (value) => currency.format(value) }, { title: "Durum", dataIndex: "status", render: (value: PaymentStatus) => <PaymentStatusTag status={value} /> }, { title: "Ödeme tarihi", dataIndex: "paidAt", render: (value) => formatOptionalApiDate(value) }, { title: "İşlem", width: 136, render: (_, payment) => payment.status === "PENDING" && canReceivePayment ? <Popconfirm title="Ödeme alındı olarak kaydedilsin mi?" description={`${currency.format(payment.amount)} tutarındaki ödeme tamamlanmış sayılacak.`} okText="Ödeme alındı" cancelText="Vazgeç" onConfirm={() => void receive(payment.id, payment.version)}><Button size="small" type="primary" loading={receivingPaymentId === payment.id} disabled={Boolean(receivingPaymentId)}>Ödeme alındı</Button></Popconfirm> : "-" }]} /></section>
    </div>}
  </Modal>;
}

function CourseForm({ form }: { form: ReturnType<typeof Form.useForm<CourseFormValues | ClassFormValues>>[0] }): JSX.Element { return <Form form={form} layout="vertical" requiredMark="optional"><Form.Item name="name" label="Kurs adı" rules={[{ required: true, message: "Kurs adını yazın." }, { min: 3, message: "Kurs adı en az 3 karakter olmalıdır." }]}><Input maxLength={160} /></Form.Item><Form.Item name="category" label="Kategori" rules={[{ required: true, message: "Bir kategori seçin." }]}><Select options={["Teknik Tasarım", "3B Modelleme", "Üretim", "Görselleştirme"].map((value) => ({ value, label: value }))} /></Form.Item><Space className="courses__form-row" size={16} align="start"><Form.Item name="durationHours" label="Toplam süre (saat)" rules={[{ required: true, message: "Süreyi yazın." }]}><InputNumber min={1} max={500} /></Form.Item><Form.Item name="listPrice" label="Liste fiyatı (₺)" rules={[{ required: true, message: "Liste fiyatını yazın." }]}><InputNumber min={0} step={500} /></Form.Item></Space><Form.Item name="status" label="Durum" rules={[{ required: true }]}><Select options={Object.entries(courseStatusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item></Form>; }
function ClassForm({ form, courses }: { form: ReturnType<typeof Form.useForm<CourseFormValues | ClassFormValues>>[0]; courses: Course[] }): JSX.Element { return <Form form={form} layout="vertical" requiredMark="optional"><Form.Item name="name" label="Sınıf adı" rules={[{ required: true, message: "Sınıf adını yazın." }]}><Input maxLength={160} /></Form.Item><Form.Item name="courseId" label="Kurs" rules={[{ required: true, message: "Bağlı kursu seçin." }]}><Select showSearch optionFilterProp="label" options={courses.map((course) => ({ value: course.id, label: course.name }))} /></Form.Item><Form.Item name="instructorName" label="Eğitmen" rules={[{ required: true, message: "Eğitmen adını yazın." }]}><Input maxLength={120} /></Form.Item><Form.Item name="dateRange" label="Başlangıç ve bitiş tarihi" rules={[{ required: true, message: "Başlangıç ve bitiş tarihlerini seçin." }]}><DatePicker.RangePicker className="courses__date-picker" format="DD MMMM YYYY" /></Form.Item><Space className="courses__form-row" size={16} align="start"><Form.Item name="capacity" label="Kontenjan" rules={[{ required: true, message: "Kontenjanı yazın." }]}><InputNumber min={1} max={50} /></Form.Item><Form.Item name="status" label="Durum" rules={[{ required: true }]}><Select options={Object.entries(classStatusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item></Space></Form>; }

type DetailMode = "detail" | "enroll" | "edit";
type CandidateFilter = "ALL" | Extract<StudentStatus, "ACTIVE" | "PROSPECTIVE">;
type CandidateState = { status: "loading" } | { status: "error" } | { status: "success"; students: Student[] };

function ClassDetailModal({ open, startInEnrollment, loading, error, detail, canEnroll, canUpdateEnrollment, canDeleteEnrollment, onDetailChange, onClose, onRetry }: { open: boolean; startInEnrollment: boolean; loading: boolean; error: boolean; detail?: ClassDetail; canEnroll: boolean; canUpdateEnrollment: boolean; canDeleteEnrollment: boolean; onDetailChange: (detail: ClassDetail) => void; onClose: () => void; onRetry: () => void }): JSX.Element {
  const { message, modal } = App.useApp();
  const [mode, setMode] = useState<DetailMode>(startInEnrollment ? "enroll" : "detail");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilter>("ALL");
  const [candidateState, setCandidateState] = useState<CandidateState>({ status: "loading" });
  const [candidateReloadKey, setCandidateReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [enrollmentForm] = Form.useForm<EnrollmentFormValues>();
  const [editForm] = Form.useForm<EnrollmentEditFormValues>();
  const [editingEnrollment, setEditingEnrollment] = useState<EnrolledStudent>();
  const paymentPlan = Form.useWatch("paymentPlan", enrollmentForm);
  const paymentStatus = Form.useWatch("paymentStatus", enrollmentForm);
  const selectedStudentId = Form.useWatch("studentId", enrollmentForm);
  const editPaymentPlan = Form.useWatch("paymentPlan", editForm);
  const editPaymentStatus = Form.useWatch("paymentStatus", editForm);
  const info = detail?.classInfo;
  const enrolledIds = new Set(detail?.students.map((student) => student.id) ?? []);
  const visibleCandidates = candidateState.status === "success"
    ? candidateState.students.filter((candidate) => !enrolledIds.has(candidate.id)) : [];
  const selectedCandidate = visibleCandidates.find((candidate) => candidate.id === selectedStudentId);
  const remainingCapacity = info ? info.capacity - info.enrolledCount : 0;

  useEffect(() => {
    if (mode !== "enroll") return;
    let active = true;
    const timeout = window.setTimeout(() => {
      setCandidateState({ status: "loading" });
      void loadEnrollmentCandidates(candidateQuery, candidateFilter === "ALL" ? undefined : candidateFilter)
        .then((students) => { if (active) setCandidateState({ status: "success", students }); })
        .catch(() => { if (active) setCandidateState({ status: "error" }); });
    }, 250);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [mode, candidateQuery, candidateFilter, candidateReloadKey]);

  const openEnrollment = () => {
    enrollmentForm.resetFields();
    enrollmentForm.setFieldsValue({ paymentPlan: "CASH", paymentStatus: "PENDING" });
    setCandidateQuery(""); setCandidateFilter("ALL"); setMode("enroll");
  };
  const close = () => { setMode("detail"); enrollmentForm.resetFields(); setCandidateQuery(""); setCandidateFilter("ALL"); onClose(); };
  const saveEnrollments = async () => {
    if (!detail || remainingCapacity < 1) return;
    let values: EnrollmentFormValues;
    try { values = await enrollmentForm.validateFields(); } catch { return; }
    setSaving(true);
    try {
      const request: CreateClassEnrollmentRequest = {
        studentId: values.studentId,
        registrationFee: values.registrationFee,
        paymentPlan: values.paymentPlan,
        paymentStatus: values.paymentStatus,
        installmentCount: values.paymentPlan === "INSTALLMENT" ? values.installmentCount : null,
        firstPaymentDate: values.paymentPlan === "INSTALLMENT" ? values.firstPaymentDate?.format("YYYY-MM-DD") ?? null : null,
        expectedPaymentDate: values.paymentPlan === "CASH" && values.paymentStatus === "PENDING" ? values.expectedPaymentDate?.format("YYYY-MM-DD") ?? null : null,
        note: values.note?.trim() || null,
      };
      const enrolledStudent = await enrollStudent(detail.classInfo.id, request);
      onDetailChange({ ...detail, classInfo: { ...detail.classInfo, enrolledCount: detail.classInfo.enrolledCount + 1 }, students: [...detail.students, enrolledStudent] });
      enrollmentForm.resetFields(); setMode("detail");
      message.success(`${enrolledStudent.fullName} sınıfa kaydedildi.`);
    } catch { message.error("Öğrenci sınıfa kaydedilemedi. Kontenjanı ve öğrenci kaydını kontrol edip tekrar deneyin."); }
    finally { setSaving(false); }
  };

  const openEnrollmentEdit = (student: EnrolledStudent) => {
    setEditingEnrollment(student);
    editForm.setFieldsValue({ registrationFee: student.registrationFee, paymentPlan: student.paymentPlan,
      installmentCount: student.installmentCount ?? undefined, firstPaymentDate: student.firstPaymentDate ? dayjs(student.firstPaymentDate) : undefined,
      paymentStatus: student.paymentStatus, expectedPaymentDate: student.expectedPaymentDate ? dayjs(student.expectedPaymentDate) : undefined,
      note: student.note ?? undefined, version: student.version });
    setMode("edit");
  };
  const saveEnrollmentEdit = async () => {
    if (!detail || !editingEnrollment) return;
    let values: EnrollmentEditFormValues;
    try { values = await editForm.validateFields(); } catch { return; }
    setSaving(true);
    try {
      const updated = await updateEnrollment(detail.classInfo.id, editingEnrollment.enrollmentId, {
        registrationFee: values.registrationFee, paymentPlan: values.paymentPlan, paymentStatus: values.paymentStatus,
        installmentCount: values.paymentPlan === "INSTALLMENT" ? values.installmentCount : null,
        firstPaymentDate: values.paymentPlan === "INSTALLMENT" ? values.firstPaymentDate?.format("YYYY-MM-DD") ?? null : null,
        expectedPaymentDate: values.paymentPlan === "CASH" && values.paymentStatus === "PENDING" ? values.expectedPaymentDate?.format("YYYY-MM-DD") ?? null : null,
        note: values.note?.trim() || null, version: values.version,
      });
      onDetailChange({ ...detail, students: detail.students.map((student) => student.id === updated.id ? updated : student) });
      setMode("detail"); setEditingEnrollment(undefined); editForm.resetFields();
      message.success(`${updated.fullName} sınıf kaydı güncellendi.`);
    } catch { message.error("Sınıf kaydı güncellenemedi. Kayıt değişmiş olabilir; detayları yenileyip tekrar deneyin."); }
    finally { setSaving(false); }
  };
  const deleteEnrollment = (student: EnrolledStudent) => modal.confirm({
    title: `${student.fullName} sınıftan çıkarılsın mı?`,
    content: "Yalnızca bu sınıfa ait kayıt ve ödeme bilgileri silinir. Öğrencinin ana kaydı korunur.",
    okText: "Sınıf kaydını sil", okButtonProps: { danger: true }, cancelText: "Vazgeç",
    onOk: async () => {
      if (!detail) return;
      await removeEnrollment(detail.classInfo.id, student.enrollmentId);
      onDetailChange({ ...detail, classInfo: { ...detail.classInfo, enrolledCount: Math.max(0, detail.classInfo.enrolledCount - 1) }, students: detail.students.filter((item) => item.id !== student.id) });
      message.success(`${student.fullName} sınıf kaydı silindi.`);
    },
  });

  const footer = mode === "enroll" ? <Flex justify="space-between" gap={8} wrap><Button disabled={saving} onClick={() => { setMode("detail"); enrollmentForm.resetFields(); }}>Sınıf detayına dön</Button><Button type="primary" icon={<UserAddOutlined />} loading={saving} onClick={() => void saveEnrollments()}>Öğrenciyi sınıfa kaydet</Button></Flex> : mode === "edit" ? <Flex justify="space-between" gap={8} wrap><Button disabled={saving} onClick={() => { setMode("detail"); editForm.resetFields(); }}>Sınıf detayına dön</Button><Button type="primary" loading={saving} onClick={() => void saveEnrollmentEdit()}>Sınıf kaydını güncelle</Button></Flex> : <Flex justify="end" gap={8} wrap><Button onClick={close}>Kapat</Button>{canEnroll && info && remainingCapacity > 0 && <Button type="primary" icon={<UserAddOutlined />} onClick={openEnrollment}>Öğrenci kaydet</Button>}</Flex>;

  return <Modal centered width={1040} open={open} title={mode === "enroll" ? `${info?.name ?? "Sınıf"} · öğrenci kaydı` : mode === "edit" ? `${editingEnrollment?.fullName ?? "Öğrenci"} · sınıf kaydını düzenle` : info?.name ?? "Sınıf detayları"} footer={footer} onCancel={close} closable={!saving} mask={{ closable: !saving }}>
    <div className="courses__detail">{loading && <div className="courses__loading">Sınıf bilgileri yükleniyor…</div>}{error && <StatusLine tone="error" title="Sınıf bilgileri yüklenemedi" description="Sınıfı yeniden yükleyerek devam edebilirsiniz." action={<Button onClick={onRetry}>Tekrar dene</Button>} />}{info && detail && (mode === "detail" ? <ClassOverview detail={detail} canUpdate={canUpdateEnrollment} canDelete={canDeleteEnrollment} onEdit={openEnrollmentEdit} onDelete={deleteEnrollment} /> : mode === "edit" ? <EnrollmentEditForm form={editForm} paymentPlan={editPaymentPlan} paymentStatus={editPaymentStatus} /> : <EnrollmentForm form={enrollmentForm} candidates={visibleCandidates} candidateState={candidateState.status} selectedCandidate={selectedCandidate} remainingCapacity={remainingCapacity} query={candidateQuery} filter={candidateFilter} paymentPlan={paymentPlan} paymentStatus={paymentStatus} onQueryChange={(value) => { enrollmentForm.setFieldValue("studentId", undefined); setCandidateQuery(value); }} onFilterChange={(value) => { enrollmentForm.setFieldValue("studentId", undefined); setCandidateFilter(value); }} onRetryCandidates={() => setCandidateReloadKey((value) => value + 1)} />)}</div>
  </Modal>;
}

function ClassOverview({ detail, canUpdate, canDelete, onEdit, onDelete }: { detail: ClassDetail; canUpdate: boolean; canDelete: boolean; onEdit: (student: EnrolledStudent) => void; onDelete: (student: EnrolledStudent) => void }): JSX.Element {
  const info = detail.classInfo; const full = info.enrolledCount >= info.capacity;
  return <><Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} items={[{ key: "course", label: "Kurs", children: info.courseName }, { key: "teacher", label: "Eğitmen", children: info.instructorName }, { key: "dates", label: "Tarih", children: `${formatApiDate(info.startDate)} – ${formatApiDate(info.endDate)}` }, { key: "capacity", label: "Doluluk", children: `${info.enrolledCount}/${info.capacity} öğrenci` }, { key: "status", label: "Durum", children: <StatusTag value={info.status} /> }]} />
    {full && <StatusLine tone="warning" title="Sınıf kontenjanı dolu" description="Yeni kayıt için önce kontenjanı artırın veya mevcut kayıtları gözden geçirin." />}
    <div><Typography.Title level={4}>Kayıtlı öğrenciler</Typography.Title><Typography.Text type="secondary">Bu sınıfa kayıtlı {detail.students.length} öğrenci bulunuyor.</Typography.Text></div>
    <Table rowKey="id" size="small" dataSource={detail.students} pagination={false} scroll={{ x: 1240 }} expandable={{ expandedRowRender: (student) => <PaymentSchedule student={student} />, rowExpandable: (student) => student.payments.length > 0 }} locale={{ emptyText: <Empty description="Bu sınıfa henüz öğrenci kaydedilmedi." /> }} columns={[{ title: "Öğrenci", dataIndex: "fullName" }, { title: "E-posta", dataIndex: "email" }, { title: "Telefon", dataIndex: "phoneMasked", render: (value) => value || "-" }, { title: "Kayıt ücreti", dataIndex: "registrationFee", align: "right", render: (value) => currency.format(value) }, { title: "Ödeme", render: (_, student) => <div className="courses__primary-cell"><span>{paymentStatusLabels[student.paymentStatus]}</span><small>{paymentPlanLabels[student.paymentPlan]}{student.installmentCount ? ` · ${student.installmentCount} taksit` : ""}{student.firstPaymentDate ? ` · ${formatApiDate(student.firstPaymentDate)}` : ""}{student.expectedPaymentDate ? ` · Tahmini: ${formatApiDate(student.expectedPaymentDate)}` : ""}</small></div> }, { title: "Not", dataIndex: "note", width: 220, ellipsis: true, render: (value) => value || "-" }, { title: "Kayıt durumu", dataIndex: "enrollmentStatus", render: (value) => <Tag>{enrollmentLabels[value] ?? value}</Tag> }, { title: "İşlemler", width: 112, fixed: "right", render: (_, student) => <RecordActions canUpdate={canUpdate} canDelete={canDelete} onEdit={() => onEdit(student)} onDelete={() => onDelete(student)} /> }]} /></>;
}

function PaymentSchedule({ student }: { student: EnrolledStudent }): JSX.Element {
  return <div className="courses__payment-schedule"><Typography.Text strong>Ödeme takvimi</Typography.Text><Table rowKey="id" size="small" pagination={false} dataSource={student.payments} columns={[{ title: "Ödeme", render: (_, payment) => `${payment.installmentNumber}/${payment.installmentTotal}` }, { title: "Vade", dataIndex: "dueDate", render: (value) => value ? formatApiDate(value) : "-" }, { title: "Tutar", dataIndex: "amount", align: "right", render: (value) => currency.format(value) }, { title: "Durum", dataIndex: "status", render: (value: PaymentStatus) => <PaymentStatusTag status={value} /> }, { title: "Ödeme tarihi", dataIndex: "paidAt", render: (value) => value ? formatApiDate(value) : "-" }]} /></div>;
}

function EnrollmentEditForm({ form, paymentPlan, paymentStatus }: { form: ReturnType<typeof Form.useForm<EnrollmentEditFormValues>>[0]; paymentPlan?: PaymentPlanType; paymentStatus?: UpdateClassEnrollmentRequest["paymentStatus"] }): JSX.Element {
  return <Form form={form} layout="vertical" requiredMark="optional">
    <Form.Item name="registrationFee" label="Kayıt ücreti" rules={[{ required: true, message: "Kayıt ücretini yazın." }]}><InputNumber className="courses__money-input" min={0} max={9999999999.99} precision={2} prefix="₺" /></Form.Item>
    <Form.Item name="paymentPlan" label="Ödeme şekli" rules={[{ required: true }]}><Segmented block options={[{ value: "CASH", label: "Peşin" }, { value: "INSTALLMENT", label: "Taksitli" }]} /></Form.Item>
    {paymentPlan === "INSTALLMENT" && <div className="courses__payment-row"><Form.Item name="installmentCount" label="Taksit sayısı" rules={[{ required: true, message: "Taksit sayısını seçin." }]}><Select options={Array.from({ length: 23 }, (_, index) => ({ value: index + 2, label: `${index + 2} taksit` }))} /></Form.Item><Form.Item name="firstPaymentDate" label="İlk ödeme tarihi" rules={[{ required: true, message: "İlk ödeme tarihini seçin." }]}><DatePicker className="courses__date-picker" format="DD MMMM YYYY" /></Form.Item></div>}
    <Form.Item name="paymentStatus" label="Ödeme durumu" rules={[{ required: true }]}><Select options={Object.entries(paymentStatusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
    {paymentPlan === "CASH" && paymentStatus === "PENDING" && <Form.Item name="expectedPaymentDate" label="Tahmini ödeme tarihi" rules={[{ required: true, message: "Tahmini ödeme tarihini seçin." }]}><DatePicker className="courses__date-picker" format="DD MMMM YYYY" /></Form.Item>}
    <Form.Item name="note" label="Kayıt notu"><Input.TextArea rows={4} maxLength={1000} showCount /></Form.Item>
    <Form.Item name="version" hidden><InputNumber /></Form.Item>
  </Form>;
}

function EnrollmentForm({ form, candidates, candidateState, selectedCandidate, remainingCapacity, query, filter, paymentPlan, paymentStatus, onQueryChange, onFilterChange, onRetryCandidates }: { form: ReturnType<typeof Form.useForm<EnrollmentFormValues>>[0]; candidates: Student[]; candidateState: CandidateState["status"]; selectedCandidate?: Student; remainingCapacity: number; query: string; filter: CandidateFilter; paymentPlan?: PaymentPlanType; paymentStatus?: CreateClassEnrollmentRequest["paymentStatus"]; onQueryChange: (value: string) => void; onFilterChange: (value: CandidateFilter) => void; onRetryCandidates: () => void }): JSX.Element {
  return <Form form={form} layout="vertical" requiredMark="optional" className="courses__enrollment-form" initialValues={{ paymentPlan: "CASH", paymentStatus: "PENDING" }}>
    <section className="courses__student-picker" aria-labelledby="enrollment-student-title">
      <div className="courses__enrollment-context"><Typography.Title id="enrollment-student-title" level={5}>Öğrenci seçimi</Typography.Title><Typography.Text type="secondary">{remainingCapacity} kişilik kontenjan kaldı. Aday öğrenci kayıtla birlikte aktifleşir.</Typography.Text></div>
      <div className="courses__enrollment-toolbar"><Input aria-label="Kaydedilecek öğrenci ara" prefix={<SearchOutlined />} placeholder="Ad veya e-posta ara" value={query} onChange={(event) => onQueryChange(event.target.value)} allowClear /><Segmented aria-label="Öğrenci durumuna göre filtrele" value={filter} onChange={(value) => onFilterChange(value as CandidateFilter)} options={[{ value: "ALL", label: "Tümü" }, { value: "ACTIVE", label: "Aktif" }, { value: "PROSPECTIVE", label: "Aday" }]} /></div>
      {selectedCandidate && <div className="courses__selection-summary" role="status"><span className="courses__selection-count"><CheckCircleOutlined aria-hidden="true" /><strong>{selectedCandidate.fullName} seçildi</strong></span>{selectedCandidate.status === "PROSPECTIVE" && <Typography.Text type="secondary">Kayıtla birlikte aktif öğrenciye dönüşecek.</Typography.Text>}</div>}
      {candidateState === "loading" ? <div className="courses__candidate-loading" role="status"><Spin size="small" /> Öğrenciler yükleniyor…</div> : candidateState === "error" ? <StatusLine tone="error" title="Öğrenciler yüklenemedi" description="Arama sonucunu yeniden yükleyin." action={<Button onClick={onRetryCandidates}>Tekrar dene</Button>} /> : candidates.length === 0 ? <Empty description={query || filter !== "ALL" ? "Arama ve filtrelere uygun öğrenci bulunamadı." : "Kaydedilebilecek öğrenci bulunmuyor."} /> : <Form.Item name="studentId" rules={[{ required: true, message: "Sınıfa kaydedilecek öğrenciyi seçin." }]}><Radio.Group className="courses__candidate-list">{candidates.map((candidate) => <Radio className="courses__candidate" key={candidate.id} value={candidate.id}><span className="courses__candidate-info"><strong>{candidate.fullName}</strong><small>{candidate.email} · {candidate.source}</small></span><span className={`courses__candidate-status courses__candidate-status--${candidate.status.toLocaleLowerCase()}`}>{candidate.status === "ACTIVE" ? <CheckCircleOutlined aria-hidden="true" /> : <ClockCircleOutlined aria-hidden="true" />}{candidate.status === "ACTIVE" ? "Aktif öğrenci" : "Aday öğrenci"}</span></Radio>)}</Radio.Group></Form.Item>}
    </section>
    <section className="courses__payment-form" aria-labelledby="enrollment-payment-title">
      <div><Typography.Title id="enrollment-payment-title" level={5}>Kayıt ve ödeme bilgileri</Typography.Title><Typography.Text type="secondary">Öğrenciye özel ücret ve tahsilat planını tanımlayın.</Typography.Text></div>
      <Form.Item name="registrationFee" label="Kayıt ücreti" rules={[{ required: true, message: "Kayıt ücretini yazın." }]}><InputNumber className="courses__money-input" min={0} max={9999999999.99} precision={2} prefix="₺" /></Form.Item>
      <Form.Item name="paymentPlan" label="Ödeme şekli" rules={[{ required: true, message: "Ödeme şeklini seçin." }]}><Segmented block options={[{ value: "CASH", label: "Peşin" }, { value: "INSTALLMENT", label: "Taksitli" }]} /></Form.Item>
      {paymentPlan === "INSTALLMENT" && <div className="courses__payment-row"><Form.Item name="installmentCount" label="Taksit sayısı" rules={[{ required: true, message: "Taksit sayısını seçin." }]}><Select options={Array.from({ length: 23 }, (_, index) => ({ value: index + 2, label: `${index + 2} taksit` }))} /></Form.Item><Form.Item name="firstPaymentDate" label="İlk ödeme tarihi" rules={[{ required: true, message: "İlk ödeme tarihini seçin." }]}><DatePicker className="courses__date-picker" format="DD MMMM YYYY" /></Form.Item></div>}
      <Form.Item name="paymentStatus" label="Ödeme durumu" rules={[{ required: true, message: "Ödeme durumunu seçin." }]}><Select options={Object.entries(paymentStatusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
      {paymentPlan === "CASH" && paymentStatus === "PENDING" && <Form.Item name="expectedPaymentDate" label="Tahmini ödeme tarihi" rules={[{ required: true, message: "Tahmini ödeme tarihini seçin." }]}><DatePicker className="courses__date-picker" format="DD MMMM YYYY" /></Form.Item>}
      <Form.Item name="note" label="Kayıt notu"><Input.TextArea rows={4} maxLength={1000} showCount placeholder="Ödeme anlaşması veya kayıtla ilgili önemli açıklama" /></Form.Item>
    </section>
  </Form>;
}
function CourseCard({ item, can, onEditCourse, onDelete }: { item: Course } & RecordsProps): JSX.Element { return <article className="courses__mobile-card"><Flex justify="space-between" gap={12}><div><strong>{item.name}</strong><small>{item.category}</small></div><StatusTag value={item.status}/></Flex><Flex justify="space-between"><span>{item.durationHours} saat</span><b>{currency.format(item.listPrice)}</b></Flex><RecordActions canUpdate={can("course:update")} canDelete={can("course:delete")} onEdit={() => onEditCourse(item)} onDelete={() => onDelete("course", item)} /></article>; }
function ClassCard({ item, can, onEditClass, onDelete }: { item: CourseClass } & RecordsProps): JSX.Element { return <article className="courses__mobile-card"><div className="courses__card-main"><Flex justify="space-between" gap={12}><div><strong>{item.name}</strong><small>{item.courseName}</small></div><StatusTag value={item.status}/></Flex><div className="courses__class-meta"><span>{item.instructorName}</span><span>{formatApiDate(item.startDate)} – {formatApiDate(item.endDate)}</span></div><Occupancy item={item}/></div><RecordActions canUpdate={can("class:update")} canDelete={can("class:delete")} onEdit={() => onEditClass(item)} onDelete={() => onDelete("class", item)} /></article>; }
function RecordActions({ canUpdate, canDelete, onEdit, onDelete }: { canUpdate: boolean; canDelete: boolean; onEdit: () => void; onDelete: () => void }): JSX.Element | null {
  if (!canUpdate && !canDelete) return null;
  return <Space size={8}>{canUpdate && <Tooltip title="Düzenle"><Button aria-label="Düzenle" icon={<EditOutlined />} onClick={onEdit} /></Tooltip>}{canDelete && <Tooltip title="Sil"><Button aria-label="Sil" danger icon={<DeleteOutlined />} onClick={onDelete} /></Tooltip>}</Space>;
}
function Occupancy({ item }: { item: CourseClass }): JSX.Element { return <div className="courses__occupancy"><span>{item.enrolledCount}/{item.capacity} öğrenci</span><Progress percent={Math.round(item.enrolledCount / item.capacity * 100)} showInfo={false} size="small" /></div>; }
function statusOptions(tab: WorkspaceTab) { const values=tab === "courses" ? courseStatusLabels : classStatusLabels; return [{ value: "all", label: "Tüm durumlar" }, ...Object.entries(values).map(([value,label]) => ({ value,label }))]; }
function formatApiDate(value: string): string { return dateFormatter.format(new Date(`${value}T00:00:00Z`)); }
function formatOptionalApiDate(value?: string | null): string { return value ? formatApiDate(value) : "-"; }
function PaymentStatusTag({ status }: { status: PaymentStatus }): JSX.Element {
  const completed = status === "COMPLETED";
  return <Tag className={`courses__payment-status courses__payment-status--${completed ? "completed" : "pending"}`} icon={completed ? <CheckCircleOutlined /> : <ClockCircleOutlined />}>{paymentStatusLabels[status]}</Tag>;
}
function StatusTag({ value }: { value: CourseStatus | ClassStatus }): JSX.Element { const label=value in courseStatusLabels ? courseStatusLabels[value as CourseStatus] : classStatusLabels[value as ClassStatus]; const color=value === "ACTIVE" || value === "ENROLLMENT_OPEN" ? "success" : value === "IN_PROGRESS" ? "processing" : value === "DRAFT" || value === "PLANNED" ? "warning" : "default"; return <Tag color={color}>{label}</Tag>; }
