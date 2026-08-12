import type { JSX, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Checkbox,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Steps,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import type { AuthenticatedUser } from "../../auth";
import { createStudent, loadStudentEnrollments, loadStudents, removeStudent, revealStudentIdentityNumber, revealStudentPhone, updateStudent } from "../api/studentApi";
import type { Gender, Student, StudentEnrollment, StudentStatus } from "../model/studentData";
import "./studentsWorkspace.css";

type FormValues = {
  fullName: string;
  email: string;
  phone?: string;
  identityNumber?: string;
  birthPlace?: string;
  birthDate?: Dayjs;
  fatherName?: string;
  motherName?: string;
  gender: Gender;
  status: StudentStatus;
  source: string;
  kvkkConsent: boolean;
  inactiveReason?: string;
  registrationDate: Dayjs;
  expectedStartDate?: Dayjs;
  educationLevel?: string;
  schoolName?: string;
  profession?: string;
  address?: string;
};
type EnrollmentState = { status: "loading" } | { status: "error" } | { status: "success"; enrollments: StudentEnrollment[] };
type EnrollmentPayment = StudentEnrollment["payments"][number];

const statusLabels: Record<StudentStatus, string> = { ACTIVE: "Aktif öğrenci", PROSPECTIVE: "Aday öğrenci", INACTIVE: "Pasif" };
const genderLabels: Record<Gender, string> = { FEMALE: "Kadın", MALE: "Erkek", NOT_SPECIFIED: "Belirtmek istemiyor" };
const classStatusLabels: Record<StudentEnrollment["classStatus"], string> = { ENROLLMENT_OPEN: "Kayit acik", PLANNED: "Planlandi", IN_PROGRESS: "Devam ediyor", COMPLETED: "Tamamlandi" };
const enrollmentLabels: Record<StudentEnrollment["enrollmentStatus"], string> = { ACTIVE: "Aktif kayit", COMPLETED: "Tamamladi", CANCELLED: "Iptal edildi" };
const paymentPlanLabels: Record<StudentEnrollment["paymentPlan"], string> = { CASH: "Pesin", INSTALLMENT: "Taksitli", PROMISSORY_NOTE: "Senet" };
const paymentMethodLabels: Record<NonNullable<EnrollmentPayment["paymentMethod"]>, string> = { CASH: "Nakit", CREDIT_CARD: "Kredi karti", BANK_TRANSFER: "Havale/EFT" };
const paymentStatusLabels: Record<StudentEnrollment["paymentStatus"], string> = { PENDING: "Odeme bekliyor", COMPLETED: "Odeme tamamlandi" };
const currency = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const stepFields: Array<Array<keyof FormValues>> = [
  ["fullName", "phone", "email", "status", "source", "registrationDate", "inactiveReason"],
  ["identityNumber", "gender"],
  [],
];

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
  : "-";
const optionalText = (value?: string | null) => value || "-";
const nullableText = (value?: string) => value?.trim() || null;
const formatOptionalDate = (value?: string | null) => value ? formatDate(value) : "-";

export function StudentsWorkspace({ user = { id: "", email: "", authorities: ["student:delete", "student:phone:reveal", "student:identity-number:reveal"] } }: { user?: AuthenticatedUser }): JSX.Element {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm<FormValues>();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StudentStatus | "all">("all");
  const [editing, setEditing] = useState<Student>();
  const [selected, setSelected] = useState<Student>();
  const [formOpen, setFormOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formSnapshot, setFormSnapshot] = useState<Partial<FormValues>>({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedStudentIds, setExpandedStudentIds] = useState<string[]>([]);
  const [enrollmentStates, setEnrollmentStates] = useState<Record<string, EnrollmentState>>({});
  const formStatus = Form.useWatch("status", form);
  const canDelete = user.authorities.includes("student:delete");
  const canReveal = user.authorities.includes("student:phone:reveal");
  const canRevealIdentityNumber = user.authorities.includes("student:identity-number:reveal");

  useEffect(() => {
    let active = true;
    loadStudents().then((page) => { if (active) setStudents(page.content); })
      .catch(() => message.error("Öğrenci kayıtları yüklenemedi."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [message]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return students.filter((s) =>
      (status === "all" || s.status === status) && (!q || [s.fullName, s.email, s.activeCourse ?? "", s.schoolName ?? "", s.profession ?? ""]
        .some((v) => v.toLocaleLowerCase("tr-TR").includes(q))));
  }, [students, query, status]);

  const loadEnrollments = async (studentId: string, force = false) => {
    if (!force && enrollmentStates[studentId]?.status === "success") return;
    setEnrollmentStates((items) => ({ ...items, [studentId]: { status: "loading" } }));
    try {
      const enrollments = await loadStudentEnrollments(studentId);
      setEnrollmentStates((items) => ({ ...items, [studentId]: { status: "success", enrollments } }));
    } catch {
      setEnrollmentStates((items) => ({ ...items, [studentId]: { status: "error" } }));
    }
  };

  const toggleStudent = (expanded: boolean, student: Student) => {
    setExpandedStudentIds((ids) => expanded ? [...new Set([...ids, student.id])] : ids.filter((id) => id !== student.id));
    if (expanded) void loadEnrollments(student.id);
  };

  const openCreate = () => {
    setEditing(undefined);
    setCurrentStep(0);
    form.resetFields();
    const defaults = { status: "PROSPECTIVE" as const, source: "Web sitesi", gender: "NOT_SPECIFIED" as const, kvkkConsent: false, registrationDate: dayjs() };
    form.setFieldsValue(defaults);
    setFormSnapshot(defaults);
    setFormOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setCurrentStep(0);
    const values = {
      fullName: s.fullName,
      email: s.email,
      phone: undefined,
      identityNumber: undefined,
      birthPlace: s.birthPlace ?? undefined,
      birthDate: s.birthDate ? dayjs(s.birthDate) : undefined,
      fatherName: s.fatherName ?? undefined,
      motherName: s.motherName ?? undefined,
      gender: s.gender,
      status: s.status,
      source: s.source,
      kvkkConsent: s.kvkkConsent,
      inactiveReason: s.inactiveReason ?? undefined,
      registrationDate: dayjs(s.registrationDate),
      expectedStartDate: s.expectedStartDate ? dayjs(s.expectedStartDate) : undefined,
      educationLevel: s.educationLevel ?? undefined,
      schoolName: s.schoolName ?? undefined,
      profession: s.profession ?? undefined,
      address: s.address ?? undefined,
    };
    form.setFieldsValue(values);
    setFormSnapshot(values);
    setFormOpen(true);
  };

  const nextStep = async () => {
    try {
      await form.validateFields(stepFields[currentStep]);
      setFormSnapshot((snapshot) => ({ ...snapshot, ...form.getFieldsValue(true) }));
      setCurrentStep((step) => Math.min(step + 1, stepFields.length - 1));
    } catch {
      message.warning("Devam etmeden önce bu bölümdeki eksikleri tamamlayın.");
    }
  };

  const save = async () => {
    const values = { ...formSnapshot, ...form.getFieldsValue(true) } as FormValues;
    setSubmitting(true);
    const common = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      status: values.status,
      activeCourse: editing?.activeCourse ?? null,
      registrationDate: values.registrationDate.format("YYYY-MM-DD"),
      source: values.source,
      kvkkConsent: values.kvkkConsent,
      inactiveReason: values.status === "INACTIVE" ? nullableText(values.inactiveReason) : null,
      expectedStartDate: values.status === "PROSPECTIVE" ? values.expectedStartDate?.format("YYYY-MM-DD") ?? null : null,
      birthPlace: nullableText(values.birthPlace),
      birthDate: values.birthDate?.format("YYYY-MM-DD") ?? null,
      fatherName: nullableText(values.fatherName),
      motherName: nullableText(values.motherName),
      gender: values.gender,
      educationLevel: nullableText(values.educationLevel),
      schoolName: nullableText(values.schoolName),
      profession: nullableText(values.profession),
      address: nullableText(values.address),
    };
    try {
      const saved = editing
        ? await updateStudent(editing.id, { ...common, phone: values.phone?.trim() ?? "", identityNumber: values.identityNumber?.trim() ?? "", version: editing.version })
        : await createStudent({ ...common, phone: values.phone?.trim() ?? "", identityNumber: values.identityNumber?.trim() ?? "" });
      setStudents((items) => editing ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
      setFormOpen(false);
      message.success("Öğrenci kaydı kaydedildi.");
    } catch {
      message.error("Öğrenci kaydı kaydedilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitForm = async () => {
    try {
      await form.validateFields();
      form.submit();
    } catch {
      message.warning("Kaydetmeden önce eksik alanları tamamlayın.");
    }
  };

  const remove = (s: Student) => modal.confirm({
    centered: true,
    title: `${s.fullName} silinsin mi?`,
    content: "Kayıt güvenli biçimde pasife alınacak.",
    okText: "Öğrenciyi sil",
    okType: "danger",
    cancelText: "Vazgec",
    onOk: async () => {
      await removeStudent(s.id);
      setStudents((items) => items.filter((item) => item.id !== s.id));
      message.success("Öğrenci silindi.");
    },
  });

  const actions = (s: Student) => <Space onClick={(e) => e.stopPropagation()}>
    <Tooltip title="Görüntüle"><Button aria-label="Görüntüle" icon={<EyeOutlined />} onClick={() => setSelected(s)} /></Tooltip>
    <Tooltip title="Düzenle"><Button aria-label="Düzenle" icon={<EditOutlined />} onClick={() => openEdit(s)} /></Tooltip>
    {canDelete && <Tooltip title="Sil"><Button aria-label="Sil" danger icon={<DeleteOutlined />} onClick={() => remove(s)} /></Tooltip>}
  </Space>;
  const columns: ColumnsType<Student> = [
    { title: "Öğrenci", dataIndex: "fullName", render: (v, s) => <div className="students__primary-cell"><strong>{v}</strong><small>{s.email}</small></div> },
    { title: "Telefon", dataIndex: "phoneMasked" },
    { title: "TC", dataIndex: "identityNumberMasked" },
    { title: "Durum", dataIndex: "status", render: (v) => <StatusTag status={v} /> },
    { title: "Aktif eğitim", dataIndex: "activeCourse", render: optionalText },
    { title: "Kayıt tarihi", dataIndex: "registrationDate", render: formatDate },
    { title: "İşlemler", width: 144, render: (_, s) => actions(s) },
  ];
  const expandedContent = (student: Student) => <StudentEnrollments
    state={enrollmentStates[student.id]}
    onRetry={() => void loadEnrollments(student.id, true)}
  />;

  if (formOpen) {
    return <section className="students students--form">
      <Flex className="students__heading" justify="space-between" align="end" gap={24} wrap>
        <div>
          <Typography.Text className="students__eyebrow">ÖĞRENCİ KAYDI</Typography.Text>
          <Typography.Title>{editing ? "Öğrenci kaydını düzenle" : "Yeni öğrenci kaydı"}</Typography.Title>
          <Typography.Paragraph>Temel bilgiler, kimlik bilgileri ve iletişim-eğitim bilgilerini tek kayıtta tamamlayın.</Typography.Paragraph>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => setFormOpen(false)}>Listeye dön</Button>
      </Flex>
      <div className="students__form-layout">
        <Steps
          orientation={screens.md ? "vertical" : "horizontal"}
          current={currentStep}
          items={[
            { title: "Temel bilgiler" },
            { title: "Kimlik bilgileri" },
            { title: "İletişim ve eğitim" },
          ]}
        />
        <Form form={form} layout="vertical" requiredMark="optional" className="students__registration-form" preserve onValuesChange={(_, values) => setFormSnapshot((snapshot) => ({ ...snapshot, ...values }))} onFinish={() => void save()}>
          {currentStep === 0 && <FormSection title="Temel bilgiler">
            <Form.Item name="fullName" label="Ad soyad" rules={[{ required: true, min: 3, message: "Ad soyad en az 3 karakter olmalıdır." }]}><Input maxLength={160} autoFocus /></Form.Item>
            <div className="students__form-row">
              <Form.Item name="phone" label={editing ? "Yeni telefon (değişmeyecekse boş bırakın)" : "Telefon"} rules={editing ? [] : [{ required: true, message: "Telefon zorunludur." }]}><Input maxLength={30} /></Form.Item>
              <Form.Item name="email" label="E-posta" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta girin." }]}><Input maxLength={254} /></Form.Item>
            </div>
            <div className="students__form-row">
              <Form.Item name="status" label="Durum" rules={[{ required: true }]}><Select options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
              <Form.Item name="source" label="Kayıt kaynağı" rules={[{ required: true, message: "Kayıt kaynağı seçin." }]}><Select options={["Web sitesi", "Telefon", "Instagram", "Referans", "Yüz yüze"].map((value) => ({ value, label: value }))} /></Form.Item>
            </div>
            <div className="students__form-row">
              <Form.Item name="registrationDate" label="Kayıt tarihi" rules={[{ required: true, message: "Kayıt tarihi zorunludur." }]}><DatePicker className="students__date-picker" /></Form.Item>
              {formStatus === "PROSPECTIVE" && <Form.Item name="expectedStartDate" label="Tahmini başlangıç tarihi"><DatePicker className="students__date-picker" /></Form.Item>}
            </div>
            {formStatus === "INACTIVE" && <Form.Item name="inactiveReason" label="Pasife alınma nedeni" rules={[{ required: true, min: 10, message: "Pasiflik nedenini en az 10 karakterle yazın." }]}><Input.TextArea rows={3} maxLength={500} showCount /></Form.Item>}
            <Form.Item name="kvkkConsent" valuePropName="checked"><Checkbox>KVKK aydınlatma ve iletişim izni alındı.</Checkbox></Form.Item>
          </FormSection>}
          {currentStep === 1 && <FormSection title="Kimlik bilgileri">
            <Form.Item name="identityNumber" label={editing ? "Yeni TC kimlik no (değişmeyecekse boş bırakın)" : "TC kimlik no"} rules={editing ? [{ len: 11, message: "TC kimlik no 11 haneli olmalıdır." }] : [{ required: true, message: "TC kimlik no zorunludur." }, { len: 11, message: "TC kimlik no 11 haneli olmalıdır." }]}><Input prefix={<IdcardOutlined />} maxLength={11} inputMode="numeric" /></Form.Item>
            <div className="students__form-row">
              <Form.Item name="birthPlace" label="Doğum yeri"><Input maxLength={100} /></Form.Item>
              <Form.Item name="birthDate" label="Doğum tarihi"><DatePicker className="students__date-picker" /></Form.Item>
            </div>
            <div className="students__form-row">
              <Form.Item name="fatherName" label="Baba adı"><Input maxLength={120} /></Form.Item>
              <Form.Item name="motherName" label="Anne adı"><Input maxLength={120} /></Form.Item>
            </div>
            <Form.Item name="gender" label="Cinsiyet" rules={[{ required: true, message: "Cinsiyet seçin." }]}><Select options={Object.entries(genderLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
          </FormSection>}
          {currentStep === 2 && <FormSection title="İletişim ve eğitim">
            <div className="students__form-row">
              <Form.Item name="educationLevel" label="Öğrenim durumu"><Select allowClear options={["İlköğretim", "Lise", "Ön lisans", "Lisans", "Yüksek lisans", "Doktora"].map((value) => ({ value, label: value }))} /></Form.Item>
              <Form.Item name="schoolName" label="Okulu"><Input maxLength={160} /></Form.Item>
            </div>
            <Form.Item name="profession" label="Mesleği"><Input maxLength={120} /></Form.Item>
            <Form.Item name="address" label="Adres"><Input.TextArea rows={4} maxLength={500} showCount /></Form.Item>
          </FormSection>}
          <Flex className="students__form-actions" justify="space-between" gap={12} wrap>
            <Button disabled={currentStep === 0} onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}>Geri</Button>
            <Space>
              <Button onClick={() => setFormOpen(false)}>Vazgec</Button>
              {currentStep < stepFields.length - 1
                ? <Button type="primary" onClick={() => void nextStep()}>Devam et</Button>
                : <Button type="primary" icon={<SaveOutlined />} loading={submitting} onClick={() => void submitForm()}>Kaydet</Button>}
            </Space>
          </Flex>
        </Form>
      </div>
    </section>;
  }

  return <section className="students"><Flex className="students__heading" justify="space-between" align="end" gap={24} wrap>
    <div><Typography.Text className="students__eyebrow">ÖĞRENCİ YÖNETİMİ</Typography.Text><Typography.Title>Öğrenciler</Typography.Title><Typography.Paragraph>Aday ve kayıtlı öğrencileri güvenli biçimde yönetin.</Typography.Paragraph></div>
    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Yeni öğrenci</Button>
  </Flex>
    <div className="students__toolbar"><Input aria-label="Öğrenci ara" prefix={<SearchOutlined />} placeholder="Ad, e-posta, okul veya meslek ara" value={query} onChange={(e) => setQuery(e.target.value)} allowClear /><Select aria-label="Öğrenci durumuna göre filtrele" value={status} onChange={setStatus} options={[{ value: "all", label: "Tüm durumlar" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} /></div>
    {!loading && filtered.length === 0 ? <Empty description="Öğrenci kaydı bulunamadı." /> : screens.md
      ? <Table loading={loading} rowKey="id" columns={columns} dataSource={filtered} pagination={{ pageSize: 8, showSizeChanger: false }} expandable={{ expandedRowKeys: expandedStudentIds, onExpand: (expanded, record) => toggleStudent(expanded, record), expandedRowRender: expandedContent }} />
      : <div className="students__mobile-list">{loading ? <div className="students__expanded-state"><Spin size="small" /> Ogrenciler yukleniyor...</div> : filtered.map((s) => <article className="students__mobile-card" key={s.id}><Flex justify="space-between"><strong>{s.fullName}</strong><StatusTag status={s.status} /></Flex><span><PhoneOutlined /> {s.phoneMasked}</span><span><IdcardOutlined /> {s.identityNumberMasked}</span><Flex justify="space-between" gap={8} wrap><Button onClick={() => toggleStudent(!expandedStudentIds.includes(s.id), s)}>{expandedStudentIds.includes(s.id) ? "Kurslari gizle" : "Kurslari goster"}</Button>{actions(s)}</Flex>{expandedStudentIds.includes(s.id) && expandedContent(s)}</article>)}</div>}
    <DetailModal key={selected?.id ?? "closed"} student={selected} canReveal={canReveal} canRevealIdentityNumber={canRevealIdentityNumber} onClose={() => setSelected(undefined)} />
  </section>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <div className="students__form-section"><Typography.Title level={3}>{title}</Typography.Title>{children}</div>;
}

function StudentEnrollments({ state, onRetry }: { state?: EnrollmentState; onRetry: () => void }): JSX.Element {
  const [expandedEnrollmentIds, setExpandedEnrollmentIds] = useState<string[]>([]);
  if (!state || state.status === "loading") return <div className="students__expanded-state"><Spin size="small" /> Kurs kayitlari yukleniyor...</div>;
  if (state.status === "error") return <div className="students__expanded-state students__expanded-state--error"><span>Kurs kayitlari yuklenemedi.</span><Button size="small" onClick={onRetry}>Tekrar dene</Button></div>;
  if (state.enrollments.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bu ogrencinin kurs kaydi bulunmuyor." />;
  const columns: ColumnsType<StudentEnrollment> = [
    { title: "Kurs", render: (_, item) => <div className="students__primary-cell"><strong>{item.courseName}</strong><small>{item.className}</small></div> },
    { title: "Egitmen", dataIndex: "instructorName" },
    { title: "Tarih", render: (_, item) => `${formatDate(item.startDate)} - ${formatDate(item.endDate)}` },
    { title: "Kayit ucreti", dataIndex: "registrationFee", align: "right", render: (value) => currency.format(value) },
    { title: "Odeme", render: (_, item) => <div className="students__primary-cell"><span>{paymentStatusLabels[item.paymentStatus]}</span><small>{paymentPlanSummary(item)}</small></div> },
    { title: "Durum", dataIndex: "enrollmentStatus", render: (value: StudentEnrollment["enrollmentStatus"]) => <Tag>{enrollmentLabels[value]}</Tag> },
    { title: "", width: 148, render: (_, item) => <Button size="small" onClick={() => setExpandedEnrollmentIds((ids) => ids.includes(item.enrollmentId) ? ids.filter((id) => id !== item.enrollmentId) : [...ids, item.enrollmentId])}>{expandedEnrollmentIds.includes(item.enrollmentId) ? "Odemeleri gizle" : "Odemeleri goster"}</Button> },
  ];
  return <div className="students__enrollments">
    <Table rowKey="enrollmentId" size="small" columns={columns} dataSource={state.enrollments} pagination={false} scroll={{ x: 980 }} expandable={{ expandedRowKeys: expandedEnrollmentIds, onExpand: (expanded, record) => setExpandedEnrollmentIds((ids) => expanded ? [...new Set([...ids, record.enrollmentId])] : ids.filter((id) => id !== record.enrollmentId)), expandedRowRender: (enrollment) => <PaymentDetails enrollment={enrollment} /> }} />
  </div>;
}

function PaymentDetails({ enrollment }: { enrollment: StudentEnrollment }): JSX.Element {
  const paidAmount = enrollment.payments.filter((payment) => payment.status === "COMPLETED").reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = enrollment.payments.filter((payment) => payment.status === "PENDING").reduce((sum, payment) => sum + payment.amount, 0);
  return <div className="students__payment-details">
    <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} items={[
      { key: "course", label: "Kurs", children: enrollment.courseName },
      { key: "class", label: "Sinif", children: enrollment.className },
      { key: "classStatus", label: "Sinif durumu", children: <Tag>{classStatusLabels[enrollment.classStatus]}</Tag> },
      { key: "fee", label: "Kayit ucreti", children: currency.format(enrollment.registrationFee) },
      { key: "plan", label: "Odeme turu", children: paymentPlanSummary(enrollment) },
      { key: "status", label: "Genel odeme", children: <PaymentStatusTag status={enrollment.paymentStatus} /> },
      { key: "paid", label: "Odenen", children: currency.format(paidAmount) },
      { key: "pending", label: "Bekleyen", children: currency.format(pendingAmount) },
      { key: "start", label: enrollment.paymentPlan === "CASH" ? "Tahmini odeme" : "Ilk vade", children: formatOptionalDate(enrollment.paymentPlan === "CASH" ? enrollment.expectedPaymentDate : enrollment.firstPaymentDate) },
      { key: "note", label: "Not", span: 2, children: enrollment.note || "-" },
    ]} />
    <section aria-labelledby={`payment-schedule-${enrollment.enrollmentId}`}><Typography.Title id={`payment-schedule-${enrollment.enrollmentId}`} level={5}>Odeme ve taksit plani</Typography.Title><Table rowKey="id" size="small" pagination={false} dataSource={enrollment.payments} scroll={{ x: 760 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Odeme plani bulunmuyor." /> }} columns={[{ title: "Sira", render: (_, payment) => `${payment.installmentNumber}/${payment.installmentTotal}` }, { title: "Vade", dataIndex: "dueDate", render: formatOptionalDate }, { title: "Tutar", dataIndex: "amount", align: "right", render: (value) => currency.format(value) }, { title: "Durum", dataIndex: "status", render: (value: StudentEnrollment["paymentStatus"]) => <PaymentStatusTag status={value} /> }, { title: "Odeme tarihi", dataIndex: "paidAt", render: formatOptionalDate }, { title: "Tahsilat tipi", dataIndex: "paymentMethod", render: (value: EnrollmentPayment["paymentMethod"]) => value ? paymentMethodLabels[value] : "-" }]} /></section>
  </div>;
}

function PaymentStatusTag({ status }: { status: StudentEnrollment["paymentStatus"] }): JSX.Element {
  const completed = status === "COMPLETED";
  return <Tag color={completed ? "success" : "warning"} icon={completed ? <CheckCircleIcon /> : <ClockIcon />}>{paymentStatusLabels[status]}</Tag>;
}

function CheckCircleIcon(): JSX.Element { return <WalletOutlined aria-hidden="true" />; }
function ClockIcon(): JSX.Element { return <CalendarOutlined aria-hidden="true" />; }

function paymentPlanSummary(enrollment: StudentEnrollment): string {
  if (enrollment.paymentPlan === "PROMISSORY_NOTE") return `${paymentPlanLabels[enrollment.paymentPlan]} - ${enrollment.installmentCount ?? enrollment.payments.length} senet`;
  if (enrollment.paymentPlan === "INSTALLMENT") return `${paymentPlanLabels[enrollment.paymentPlan]} - ${enrollment.installmentCount ?? enrollment.payments.length} taksit`;
  return paymentPlanLabels[enrollment.paymentPlan];
}

function DetailModal({ student, canReveal, canRevealIdentityNumber, onClose }: { student?: Student; canReveal: boolean; canRevealIdentityNumber: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const [phone, setPhone] = useState<string>();
  const [identityNumber, setIdentityNumber] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(false);
  const reveal = async () => {
    if (!student) return;
    setLoading(true);
    try { setPhone(await revealStudentPhone(student.id)); } catch { message.error("Telefon görüntülenemedi."); } finally { setLoading(false); }
  };
  const revealIdentity = async () => {
    if (!student) return;
    setIdentityLoading(true);
    try { setIdentityNumber(await revealStudentIdentityNumber(student.id)); } catch { message.error("TC kimlik no görüntülenemedi."); } finally { setIdentityLoading(false); }
  };
  return <Modal centered width={860} open={!!student} title={student?.fullName ?? "Öğrenci bilgileri"} footer={<Button onClick={onClose}>Kapat</Button>} onCancel={onClose}>{student && <div className="students__detail"><Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} items={[
    { key: "status", label: "Durum", children: <StatusTag status={student.status} /> },
    { key: "date", label: "Kayıt tarihi", children: formatDate(student.registrationDate) },
    { key: "email", label: "E-posta", children: <a href={`mailto:${student.email}`}><MailOutlined /> {student.email}</a> },
    { key: "phone", label: "Telefon", children: phone ? <a href={`tel:${phone}`}><PhoneOutlined /> {phone}</a> : <Space>{student.phoneMasked}{canReveal && student.phoneAvailable && <Tooltip title="Telefon numarasını göster"><Button aria-label="Telefon numarasını göster" size="small" icon={<EyeOutlined />} loading={loading} onClick={() => void reveal()} /></Tooltip>}</Space> },
    { key: "identity", label: "TC kimlik no", children: identityNumber ? identityNumber : <Space>{student.identityNumberAvailable ? student.identityNumberMasked : "-"}{canRevealIdentityNumber && student.identityNumberAvailable && <Tooltip title="TC kimlik numarasını göster"><Button aria-label="TC kimlik numarasını göster" size="small" icon={<EyeOutlined />} loading={identityLoading} onClick={() => void revealIdentity()} /></Tooltip>}</Space> },
    { key: "gender", label: "Cinsiyet", children: genderLabels[student.gender] },
    { key: "birth", label: "Doğum", children: `${optionalText(student.birthPlace)} / ${formatDate(student.birthDate)}` },
    { key: "parents", label: "Anne / Baba", children: `${optionalText(student.motherName)} / ${optionalText(student.fatherName)}` },
    { key: "source", label: "Kayıt kaynağı", children: student.source },
    { key: "consent", label: "KVKK izni", children: student.kvkkConsent ? "Alındı" : "Alınmadı" },
    { key: "education", label: "Öğrenim", children: optionalText(student.educationLevel) },
    { key: "school", label: "Okul", children: optionalText(student.schoolName) },
    { key: "profession", label: "Meslek", children: optionalText(student.profession) },
    { key: "address", label: "Adres", children: optionalText(student.address) },
  ]} />{student.status === "INACTIVE" && <Typography.Paragraph>Pasiflik nedeni: {student.inactiveReason}</Typography.Paragraph>}</div>}</Modal>;
}

function StatusTag({ status }: { status: StudentStatus }) {
  return <Tag color={status === "ACTIVE" ? "success" : status === "PROSPECTIVE" ? "warning" : "default"}>{statusLabels[status]}</Tag>;
}
