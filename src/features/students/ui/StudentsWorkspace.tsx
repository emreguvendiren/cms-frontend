import type { JSX, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
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
  Steps,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import type { AuthenticatedUser } from "../../auth";
import { createStudent, loadStudents, removeStudent, revealStudentPhone, updateStudent } from "../api/studentApi";
import type { Gender, Student, StudentStatus } from "../model/studentData";
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

const statusLabels: Record<StudentStatus, string> = { ACTIVE: "Aktif öğrenci", PROSPECTIVE: "Aday öğrenci", INACTIVE: "Pasif" };
const genderLabels: Record<Gender, string> = { FEMALE: "Kadın", MALE: "Erkek", NOT_SPECIFIED: "Belirtmek istemiyor" };
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

export function StudentsWorkspace({ user = { id: "", email: "", authorities: ["student:delete", "student:phone:reveal"] } }: { user?: AuthenticatedUser }): JSX.Element {
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
  const formStatus = Form.useWatch("status", form);
  const canDelete = user.authorities.includes("student:delete");
  const canReveal = user.authorities.includes("student:phone:reveal");

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
    {!loading && filtered.length === 0 ? <Empty description="Öğrenci kaydı bulunamadı." /> : screens.md ? <Table loading={loading} rowKey="id" columns={columns} dataSource={filtered} pagination={{ pageSize: 8, showSizeChanger: false }} onRow={(s) => ({ className: "students__clickable-row", onClick: () => setSelected(s) })} /> : <div className="students__mobile-list">{filtered.map((s) => <article className="students__mobile-card" key={s.id}><Flex justify="space-between"><strong>{s.fullName}</strong><StatusTag status={s.status} /></Flex><span><PhoneOutlined /> {s.phoneMasked}</span><span><IdcardOutlined /> {s.identityNumberMasked}</span><Flex justify="end">{actions(s)}</Flex></article>)}</div>}
    <DetailModal key={selected?.id ?? "closed"} student={selected} canReveal={canReveal} onClose={() => setSelected(undefined)} />
  </section>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <div className="students__form-section"><Typography.Title level={3}>{title}</Typography.Title>{children}</div>;
}

function DetailModal({ student, canReveal, onClose }: { student?: Student; canReveal: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const [phone, setPhone] = useState<string>();
  const [loading, setLoading] = useState(false);
  const reveal = async () => {
    if (!student) return;
    setLoading(true);
    try { setPhone(await revealStudentPhone(student.id)); } catch { message.error("Telefon görüntülenemedi."); } finally { setLoading(false); }
  };
  return <Modal centered width={860} open={!!student} title={student?.fullName ?? "Öğrenci bilgileri"} footer={<Button onClick={onClose}>Kapat</Button>} onCancel={onClose}>{student && <div className="students__detail"><Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} items={[
    { key: "status", label: "Durum", children: <StatusTag status={student.status} /> },
    { key: "date", label: "Kayıt tarihi", children: formatDate(student.registrationDate) },
    { key: "email", label: "E-posta", children: <a href={`mailto:${student.email}`}><MailOutlined /> {student.email}</a> },
    { key: "phone", label: "Telefon", children: phone ? <a href={`tel:${phone}`}><PhoneOutlined /> {phone}</a> : <Space>{student.phoneMasked}{canReveal && student.phoneAvailable && <Tooltip title="Telefon numarasını göster"><Button aria-label="Telefon numarasını göster" size="small" icon={<EyeOutlined />} loading={loading} onClick={() => void reveal()} /></Tooltip>}</Space> },
    { key: "identity", label: "TC kimlik no", children: student.identityNumberAvailable ? student.identityNumberMasked : "-" },
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
