import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { DeleteOutlined, EditOutlined, EyeOutlined, MailOutlined, PhoneOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { App, Button, Checkbox, DatePicker, Descriptions, Empty, Flex, Form, Grid, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import type { AuthenticatedUser } from "../../auth";
import { createStudent, loadStudents, removeStudent, revealStudentPhone, updateStudent } from "../api/studentApi";
import type { Student, StudentStatus } from "../model/studentData";
import "./studentsWorkspace.css";

type FormValues = { fullName: string; email: string; phone?: string; status: StudentStatus; source: string;
  kvkkConsent: boolean; inactiveReason?: string; registrationDate: Dayjs; expectedStartDate?: Dayjs };
const labels: Record<StudentStatus, string> = { ACTIVE: "Aktif öğrenci", PROSPECTIVE: "Aday öğrenci", INACTIVE: "Pasif" };
const formatDate = (value: string) => new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export function StudentsWorkspace({ user = { id: "", email: "", authorities: ["student:delete", "student:phone:reveal"] } }: { user?: AuthenticatedUser }): JSX.Element {
  const { message, modal } = App.useApp(); const screens = Grid.useBreakpoint(); const [form] = Form.useForm<FormValues>();
  const [students, setStudents] = useState<Student[]>([]); const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState<StudentStatus | "all">("all");
  const [editing, setEditing] = useState<Student>(); const [selected, setSelected] = useState<Student>();
  const [formOpen, setFormOpen] = useState(false); const [submitting, setSubmitting] = useState(false);
  const formStatus = Form.useWatch("status", form);
  const canDelete = user.authorities.includes("student:delete");
  const canReveal = user.authorities.includes("student:phone:reveal");

  useEffect(() => { let active = true; loadStudents().then((page) => { if (active) setStudents(page.content); })
    .catch(() => message.error("Öğrenci kayıtları yüklenemedi.")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; }; }, [message]);
  const filtered = useMemo(() => { const q = query.trim().toLocaleLowerCase("tr-TR"); return students.filter((s) =>
    (status === "all" || s.status === status) && (!q || [s.fullName, s.email, s.activeCourse ?? ""].some((v) => v.toLocaleLowerCase("tr-TR").includes(q)))); }, [students, query, status]);

  const openCreate = () => { setEditing(undefined); form.resetFields(); form.setFieldsValue({ status: "PROSPECTIVE", source: "Web sitesi", kvkkConsent: false, registrationDate: dayjs() }); setFormOpen(true); };
  const openEdit = (s: Student) => { setEditing(s); form.setFieldsValue({ fullName: s.fullName, email: s.email, phone: undefined, status: s.status, source: s.source, kvkkConsent: s.kvkkConsent,
    inactiveReason: s.inactiveReason ?? undefined, registrationDate: dayjs(s.registrationDate), expectedStartDate: s.expectedStartDate ? dayjs(s.expectedStartDate) : undefined }); setFormOpen(true); };
  const save = async () => { let values: FormValues; try { values = await form.validateFields(); } catch { return; } setSubmitting(true);
    const common = { fullName: values.fullName.trim(), email: values.email.trim(), status: values.status, activeCourse: editing?.activeCourse ?? null,
      registrationDate: values.registrationDate.format("YYYY-MM-DD"), source: values.source, kvkkConsent: values.kvkkConsent,
      inactiveReason: values.status === "INACTIVE" ? values.inactiveReason?.trim() ?? null : null,
      expectedStartDate: values.status === "PROSPECTIVE" ? values.expectedStartDate?.format("YYYY-MM-DD") ?? null : null };
    try { const saved = editing ? await updateStudent(editing.id, { ...common, phone: values.phone ?? "", version: editing.version }) : await createStudent({ ...common, phone: values.phone ?? "" });
      setStudents((items) => editing ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]); setFormOpen(false); message.success("Öğrenci kaydı kaydedildi.");
    } catch { message.error("Öğrenci kaydı kaydedilemedi."); } finally { setSubmitting(false); } };
  const remove = (s: Student) => modal.confirm({ centered: true, title: `${s.fullName} silinsin mi?`, content: "Kayıt güvenli biçimde pasife alınacak.", okText: "Öğrenciyi sil", okType: "danger", cancelText: "Vazgeç",
    onOk: async () => { await removeStudent(s.id); setStudents((items) => items.filter((item) => item.id !== s.id)); message.success("Öğrenci silindi."); } });
  const actions = (s: Student) => <Space onClick={(e) => e.stopPropagation()}><Tooltip title="Görüntüle"><Button aria-label="Görüntüle" icon={<EyeOutlined />} onClick={() => setSelected(s)} /></Tooltip><Tooltip title="Düzenle"><Button aria-label="Düzenle" icon={<EditOutlined />} onClick={() => openEdit(s)} /></Tooltip>{canDelete && <Tooltip title="Sil"><Button aria-label="Sil" danger icon={<DeleteOutlined />} onClick={() => remove(s)} /></Tooltip>}</Space>;
  const columns: ColumnsType<Student> = [{ title: "Öğrenci", dataIndex: "fullName", render: (v, s) => <div className="students__primary-cell"><strong>{v}</strong><small>{s.email}</small></div> },
    { title: "Telefon", dataIndex: "phoneMasked" }, { title: "Durum", dataIndex: "status", render: (v) => <StatusTag status={v} /> },
    { title: "Aktif eğitim", dataIndex: "activeCourse", render: (v) => v || "-" }, { title: "Kayıt tarihi", dataIndex: "registrationDate", render: formatDate },
    { title: "İşlemler", width: 144, render: (_, s) => actions(s) }];

  return <section className="students"><Flex className="students__heading" justify="space-between" align="end" gap={24} wrap><div><Typography.Text className="students__eyebrow">ÖĞRENCİ YÖNETİMİ</Typography.Text><Typography.Title>Öğrenciler</Typography.Title><Typography.Paragraph>Aday ve kayıtlı öğrencileri güvenli biçimde yönetin.</Typography.Paragraph></div><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Yeni öğrenci</Button></Flex>
    <div className="students__toolbar"><Input aria-label="Öğrenci ara" prefix={<SearchOutlined />} placeholder="Ad, e-posta veya eğitim ara" value={query} onChange={(e) => setQuery(e.target.value)} allowClear/><Select aria-label="Öğrenci durumuna göre filtrele" value={status} onChange={setStatus} options={[{value:"all",label:"Tüm durumlar"},...Object.entries(labels).map(([value,label])=>({value,label}))]}/></div>
    {!loading && filtered.length === 0 ? <Empty description="Öğrenci kaydı bulunamadı."/> : screens.md ? <Table loading={loading} rowKey="id" columns={columns} dataSource={filtered} pagination={{pageSize:8,showSizeChanger:false}} onRow={(s)=>({className:"students__clickable-row",onClick:()=>setSelected(s)})}/> : <div className="students__mobile-list">{filtered.map((s)=><article className="students__mobile-card" key={s.id}><Flex justify="space-between"><strong>{s.fullName}</strong><StatusTag status={s.status}/></Flex><span><PhoneOutlined/> {s.phoneMasked}</span><Flex justify="end">{actions(s)}</Flex></article>)}</div>}
    <Modal centered open={formOpen} title={editing ? "Öğrenciyi düzenle" : "Yeni öğrenci kaydı"} okText="Kaydet" cancelText="Vazgeç" confirmLoading={submitting} onCancel={()=>setFormOpen(false)} onOk={()=>void save()}><Form form={form} layout="vertical" requiredMark="optional"><Form.Item name="fullName" label="Ad soyad" rules={[{required:true,min:3}]}><Input maxLength={160}/></Form.Item><div className="students__form-row"><Form.Item name="phone" label={editing ? "Yeni telefon (değişmeyecekse boş bırakın)" : "Telefon"} rules={editing ? [] : [{required:true}]}><Input maxLength={30}/></Form.Item><Form.Item name="email" label="E-posta" rules={[{required:true,type:"email"}]}><Input maxLength={254}/></Form.Item></div><div className="students__form-row"><Form.Item name="status" label="Durum" rules={[{required:true}]}><Select options={Object.entries(labels).map(([value,label])=>({value,label}))}/></Form.Item><Form.Item name="source" label="Kayıt kaynağı" rules={[{required:true}]}><Select options={["Web sitesi","Telefon","Instagram","Referans","Yüz yüze"].map((value)=>({value,label:value}))}/></Form.Item></div><div className="students__form-row"><Form.Item name="registrationDate" label="Kayıt tarihi" rules={[{required:true}]}><DatePicker className="students__date-picker"/></Form.Item>{formStatus === "PROSPECTIVE" && <Form.Item name="expectedStartDate" label="Tahmini başlangıç tarihi"><DatePicker className="students__date-picker"/></Form.Item>}</div>{formStatus === "INACTIVE" && <Form.Item name="inactiveReason" label="Pasife alınma nedeni" rules={[{required:true,min:10}]}><Input.TextArea rows={3} maxLength={500} showCount/></Form.Item>}<Form.Item name="kvkkConsent" valuePropName="checked"><Checkbox>KVKK aydınlatma ve iletişim izni alındı.</Checkbox></Form.Item></Form></Modal>
    <DetailModal key={selected?.id ?? "closed"} student={selected} canReveal={canReveal} onClose={()=>setSelected(undefined)}/>
  </section>;
}

function DetailModal({ student, canReveal, onClose }: { student?: Student; canReveal: boolean; onClose:()=>void }) {
  const { message } = App.useApp(); const [phone,setPhone]=useState<string>(); const [loading,setLoading]=useState(false);
  const reveal=async()=>{setLoading(true);try{setPhone(await revealStudentPhone(student!.id));}catch{message.error("Telefon görüntülenemedi.");}finally{setLoading(false);}};
  return <Modal centered width={760} open={!!student} title={student?.fullName ?? "Öğrenci bilgileri"} footer={<Button onClick={onClose}>Kapat</Button>} onCancel={onClose}>{student&&<div className="students__detail"><Descriptions bordered size="small" column={{xs:1,sm:2}} items={[{key:"status",label:"Durum",children:<StatusTag status={student.status}/>},{key:"date",label:"Kayıt tarihi",children:formatDate(student.registrationDate)},{key:"email",label:"E-posta",children:<a href={`mailto:${student.email}`}><MailOutlined/> {student.email}</a>},{key:"phone",label:"Telefon",children:phone?<a href={`tel:${phone}`}><PhoneOutlined/> {phone}</a>:<Space>{student.phoneMasked}{canReveal&&student.phoneAvailable&&<Tooltip title="Telefon numarasını göster"><Button aria-label="Telefon numarasını göster" size="small" icon={<EyeOutlined/>} loading={loading} onClick={()=>void reveal()}/></Tooltip>}</Space>},{key:"source",label:"Kayıt kaynağı",children:student.source},{key:"consent",label:"KVKK izni",children:student.kvkkConsent?"Alındı":"Alınmadı"}]}/>{student.status==="INACTIVE"&&<Typography.Paragraph>Pasiflik nedeni: {student.inactiveReason}</Typography.Paragraph>}</div>}</Modal>;
}
function StatusTag({status}:{status:StudentStatus}){return <Tag color={status==="ACTIVE"?"success":status==="PROSPECTIVE"?"warning":"default"}>{labels[status]}</Tag>;}
