import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import SearchOutlined from "@ant-design/icons/SearchOutlined";
import UserAddOutlined from "@ant-design/icons/UserAddOutlined";
import { App, Button, Empty, Flex, Form, Input, Spin, Table, Tag, Typography } from "antd";

import { StatusLine } from "../../../shared/ui/StatusLine";
import { createUser, loadManagedUsers, type CreateManagedUserRequest, type ManagedUser } from "../api/userManagementApi";
import "./userManagementWorkspace.css";

type FormValues = CreateManagedUserRequest;

export function UserManagementWorkspace(): JSX.Element {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const nextUsers = await loadManagedUsers(search, page, 10);
      setUsers(nextUsers.content);
      setTotal(nextUsers.totalElements);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const id = window.setTimeout(() => void reload(), 250);
    return () => window.clearTimeout(id);
  }, [reload]);

  const submit = async (values: FormValues) => {
    setCreating(true);
    try {
      const created = await createUser(values);
      form.resetFields();
      setSearch("");
      setPage(0);
      setUsers((items) => [created, ...items.filter((item) => item.id !== created.id)].slice(0, 10));
      setTotal((value) => value + 1);
      message.success(`${created.email} kullanicisi olusturuldu.`);
    } catch {
      message.error("Kullanici olusturulamadi. E-posta adresini ve sifre alanlarini kontrol edin.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="user-management">
      <Flex className="user-management__header" justify="space-between" align="start" gap={16} wrap>
        <div>
          <Typography.Title level={2}>Kullanici Yonetimi</Typography.Title>
          <Typography.Text type="secondary">Sisteme giris yapacak kullanicilari olusturun ve mevcut hesaplari izleyin.</Typography.Text>
        </div>
      </Flex>

      <div className="user-management__layout">
        <section className="user-management__form-panel" aria-labelledby="create-user-title">
          <Typography.Title id="create-user-title" level={4}>Yeni kullanici</Typography.Title>
          <Form form={form} layout="vertical" onFinish={(values) => void submit(values)} requiredMark="optional">
            <Form.Item name="fullName" label="Full name" rules={[{ required: true, message: "Full name zorunludur." }, { max: 160, message: "Full name en fazla 160 karakter olabilir." }]}>
              <Input autoComplete="name" />
            </Form.Item>
            <Form.Item name="email" label="Mail" rules={[{ required: true, message: "Mail zorunludur." }, { type: "email", message: "Gecerli bir mail adresi girin." }, { max: 254, message: "Mail en fazla 254 karakter olabilir." }]}>
              <Input autoComplete="email" />
            </Form.Item>
            <Form.Item name="password" label="Sifre" rules={[{ required: true, message: "Sifre zorunludur." }, { min: 8, message: "Sifre en az 8 karakter olmalidir." }, { max: 100, message: "Sifre en fazla 100 karakter olabilir." }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item name="passwordConfirm" label="Sifreyi dogrula" dependencies={["password"]} rules={[
              { required: true, message: "Sifre dogrulama zorunludur." },
              ({ getFieldValue }) => ({
                validator(_, value: string | undefined) {
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error("Sifreler eslesmiyor."));
                },
              }),
            ]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={creating} icon={<UserAddOutlined aria-hidden="true" />}>Kullanici olustur</Button>
          </Form>
        </section>

        <section className="user-management__list-panel" aria-labelledby="users-title">
          <Flex justify="space-between" align="center" gap={16} wrap>
            <Typography.Title id="users-title" level={4}>Kullanicilar</Typography.Title>
            <Input className="user-management__search" aria-label="Kullanici ara" prefix={<SearchOutlined />} placeholder="E-posta ile ara" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} allowClear />
          </Flex>
          {error && <StatusLine tone="error" title="Kullanicilar yuklenemedi" description="Baglantiyi kontrol edip yeniden deneyin." action={<Button onClick={() => void reload()}>Tekrar dene</Button>} />}
          <Spin spinning={loading}>
            <Table className="user-management__table" rowKey="id" dataSource={users} pagination={{ current: page + 1, pageSize: 10, total, showSizeChanger: false, onChange: (value) => setPage(value - 1) }}
              locale={{ emptyText: <Empty description={search ? "Aramayla eslesen kullanici yok." : "Henuz kullanici yok."} /> }}
              columns={[
                { title: "Ad soyad", dataIndex: "fullName" },
                { title: "Mail", dataIndex: "email" },
                { title: "Durum", render: (_, user) => <Tag>{user.enabled ? "Aktif" : "Pasif"}</Tag> },
                { title: "Yetki", render: (_, user) => `${user.authorities.length} yetki` },
              ]} />
            <ul className="user-management__mobile">{users.map((user) => <li key={user.id}><div><strong>{user.fullName}</strong><span>{user.email}</span><small>{user.authorities.length} yetki - {user.enabled ? "Aktif" : "Pasif"}</small></div></li>)}</ul>
          </Spin>
        </section>
      </div>
    </section>
  );
}
