import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { App, Button, Checkbox, Empty, Flex, Input, Select, Spin, Table, Tag, Typography } from "antd";
import SearchOutlined from "@ant-design/icons/SearchOutlined";
import type { AuthenticatedUser } from "../../auth";
import { StatusLine } from "../../../shared/ui/StatusLine";
import { loadAuthorizationCatalog, loadManagedUsers, saveUserAuthorities, type AuthorizationCatalog, type ManagedUser } from "../api/authorizationApi";
import "./authorizationWorkspace.css";

const labels: Record<string, string> = {
  "profile:read": "Profil görüntüleme", "course:read": "Kursları görüntüleme", "course:create": "Kurs oluşturma",
  "course:update": "Kurs düzenleme", "course:delete": "Kurs silme",
  "class:read": "Sınıfları görüntüleme", "class:create": "Sınıf oluşturma", "class:update": "Sınıf düzenleme", "class:delete": "Sınıf silme", "class:enrollment:create": "Sınıfa öğrenci kaydetme", "class:enrollment:update": "Sınıf kaydını düzenleme", "class:enrollment:delete": "Sınıf kaydını silme", "user:permission:manage": "Rol ve yetki yönetimi",
};
const roleLabels: Record<string, string> = { ADMIN: "Yönetici", TRAINING_MANAGER: "Eğitim yöneticisi", VIEWER: "Görüntüleyici", CUSTOM: "Özel yetkiler" };

export function AuthorizationWorkspace({ currentUser }: { currentUser: AuthenticatedUser }): JSX.Element {
  const { message } = App.useApp();
  const [catalog, setCatalog] = useState<AuthorizationCatalog>();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selected, setSelected] = useState<ManagedUser>();
  const [draft, setDraft] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [nextCatalog, nextUsers] = await Promise.all([loadAuthorizationCatalog(), loadManagedUsers(search, page, 10)]);
      setCatalog(nextCatalog); setUsers(nextUsers.content); setTotal(nextUsers.totalElements);
    } catch { setError(true); } finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => { const id = window.setTimeout(() => void reload(), 250); return () => window.clearTimeout(id); }, [reload]);

  const openUser = (user: ManagedUser) => { setSelected(user); setDraft([...user.authorities]); };
  const matchingRole = catalog && Object.entries(catalog.roles).find(([, permissions]) => permissions.length === draft.length && permissions.every((item) => draft.includes(item)))?.[0];
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await saveUserAuthorities(selected.id, draft);
      setUsers((items) => items.map((item) => item.id === updated.id ? updated : item)); setSelected(updated);
      message.success(`${updated.email} yetkileri güncellendi.`);
    } catch { message.error("Yetkiler güncellenemedi. Seçimi kontrol edip tekrar deneyin."); } finally { setSaving(false); }
  };

  return <section className="authorization">
    <Flex className="authorization__header" justify="space-between" align="start" gap={16} wrap>
      <div><Typography.Title level={2}>Rol ve yetki yönetimi</Typography.Title><Typography.Text type="secondary">Kullanıcıların eğitim operasyonlarına erişimini yönetin.</Typography.Text></div>
    </Flex>
    <Input aria-label="Kullanıcı ara" prefix={<SearchOutlined />} placeholder="E-posta ile ara" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} allowClear />
    {error && <StatusLine tone="error" title="Kullanıcılar yüklenemedi" description="Bağlantıyı kontrol edip yeniden deneyin." action={<Button onClick={() => void reload()}>Tekrar dene</Button>} />}
    <Spin spinning={loading}>
      <Table className="authorization__table" rowKey="id" dataSource={users} pagination={{ current: page + 1, pageSize: 10, total, showSizeChanger: false, onChange: (value) => setPage(value - 1) }}
        locale={{ emptyText: <Empty description={search ? "Aramayla eşleşen kullanıcı yok." : "Henüz kullanıcı yok."} /> }}
        columns={[{ title: "Kullanıcı", dataIndex: "email" }, { title: "Durum", render: (_, user) => <Tag>{user.enabled ? "Aktif" : "Pasif"}</Tag> }, { title: "Yetki", render: (_, user) => `${user.authorities.length} yetki` }, { title: "", render: (_, user) => <Button onClick={() => openUser(user)}>Yetkileri düzenle</Button> }]} />
      <ul className="authorization__mobile">{users.map((user) => <li key={user.id}><div><strong>{user.email}</strong><span>{user.authorities.length} yetki · {user.enabled ? "Aktif" : "Pasif"}</span></div><Button onClick={() => openUser(user)}>Düzenle</Button></li>)}</ul>
    </Spin>
    {selected && catalog && <div className="authorization__editor">
      <Flex justify="space-between" align="start" gap={16} wrap><div><Typography.Title level={4}>{selected.email}</Typography.Title><Typography.Text type="secondary">Rol şablonu seçin veya yetkileri tek tek düzenleyin.</Typography.Text></div><Button onClick={() => setSelected(undefined)}>Kapat</Button></Flex>
      <label className="authorization__label">Rol şablonu</label>
      <Select aria-label="Rol şablonu" value={matchingRole ?? "CUSTOM"} options={[...Object.keys(catalog.roles).map((key) => ({ value: key, label: roleLabels[key] ?? key })), { value: "CUSTOM", label: roleLabels.CUSTOM, disabled: true }]} onChange={(role) => setDraft([...(catalog.roles[role] ?? [])])} />
      <Checkbox.Group className="authorization__permissions" value={draft} onChange={(values) => setDraft(values as string[])}>{catalog.authorities.map((authority) => <Checkbox key={authority} value={authority} disabled={selected.id === currentUser.id && authority === "user:permission:manage"}>{labels[authority] ?? authority}</Checkbox>)}</Checkbox.Group>
      <Flex justify="end"><Button type="primary" loading={saving} onClick={() => void save()}>Yetkileri güncelle</Button></Flex>
    </div>}
  </section>;
}
