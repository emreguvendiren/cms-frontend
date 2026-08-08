import type { JSX, PropsWithChildren } from "react";
import { useState } from "react";
import AppstoreOutlined from "@ant-design/icons/AppstoreOutlined";
import BankOutlined from "@ant-design/icons/BankOutlined";
import BellOutlined from "@ant-design/icons/BellOutlined";
import BookOutlined from "@ant-design/icons/BookOutlined";
import CalendarOutlined from "@ant-design/icons/CalendarOutlined";
import DownOutlined from "@ant-design/icons/DownOutlined";
import MenuFoldOutlined from "@ant-design/icons/MenuFoldOutlined";
import MenuOutlined from "@ant-design/icons/MenuOutlined";
import MenuUnfoldOutlined from "@ant-design/icons/MenuUnfoldOutlined";
import PieChartOutlined from "@ant-design/icons/PieChartOutlined";
import SafetyCertificateOutlined from "@ant-design/icons/SafetyCertificateOutlined";
import TeamOutlined from "@ant-design/icons/TeamOutlined";
import UserOutlined from "@ant-design/icons/UserOutlined";
import { Avatar, Badge, Button, Drawer, Dropdown, Flex, Grid, Layout, Menu, Tooltip, Typography } from "antd";

import type { AuthenticatedUser } from "../../features/auth";
import "./appShell.css";

const navigationItems = [
  { key: "dashboard", icon: <AppstoreOutlined />, label: "Genel bakış" },
  { key: "students", icon: <TeamOutlined />, label: "Öğrenciler" },
  { key: "courses", icon: <BookOutlined />, label: "Kurslar ve sınıflar" },
  { key: "calendar", icon: <CalendarOutlined />, label: "Ders takvimi" },
  { key: "finance", icon: <BankOutlined />, label: "Finans" },
  { key: "reports", icon: <PieChartOutlined />, label: "Raporlar" },
  { key: "authorization", icon: <SafetyCertificateOutlined />, label: "Rol ve yetkiler", requiredAuthority: "user:permission:manage" },
];

type AppShellProps = PropsWithChildren<{
  user: AuthenticatedUser;
  onLogout: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
}>;

export function AppShell({ children, user, onLogout, activePage, onNavigate }: AppShellProps): JSX.Element {
  const screens = Grid.useBreakpoint();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const desktop = screens.lg === true;
  const compactNavigation = desktop && navigationCollapsed;
  const navigationToggleLabel = desktop
    ? navigationCollapsed ? "Navigasyonu genislet" : "Navigasyonu daralt"
    : "Navigasyonu ac";

  const navigation = (
    <div className={compactNavigation ? "app-shell__navigation app-shell__navigation--collapsed" : "app-shell__navigation"}>
      <div className="app-shell__brand" aria-label="İkiteknik Bilişim">
        <span className="app-shell__brand-mark" aria-hidden="true">İKİ</span>
        <span><strong>İkiteknik</strong><small>Eğitim Operasyonları</small></span>
      </div>
      <Typography.Text className="app-shell__nav-label">ÇALIŞMA ALANI</Typography.Text>
      <Menu
        className="app-shell__menu"
        theme="dark"
        mode="inline"
        selectedKeys={[activePage]}
        items={navigationItems.filter((item) => !item.requiredAuthority || user.authorities.includes(item.requiredAuthority))}
        onClick={({ key }) => {
          onNavigate(key);
          setNavigationOpen(false);
        }}
      />
      <div className="app-shell__sider-footer">
        <span className="app-shell__system-dot" aria-hidden="true" />
        <span><strong>Sistem aktif</strong><small>Son kontrol: şimdi</small></span>
      </div>
    </div>
  );

  return (
    <Layout className="app-shell">
      {desktop ? (
        <Layout.Sider
          width={256}
          collapsedWidth={80}
          collapsed={navigationCollapsed}
          trigger={null}
          className="app-shell__sider"
        >
          {navigation}
        </Layout.Sider>
      ) : (
        <Drawer
          className="app-shell__drawer"
          placement="left"
          size={280}
          open={navigationOpen}
          onClose={() => setNavigationOpen(false)}
          closable={false}
        >
          {navigation}
        </Drawer>
      )}
      <Layout>
        <Layout.Header className="app-shell__header">
          <Flex align="center" justify="space-between" gap={16}>
            <Flex className="app-shell__header-main" align="center" gap={12}>
              {!desktop && (
                <Button aria-label="Navigasyonu aç" type="text" icon={<MenuOutlined />}
                  onClick={() => setNavigationOpen(true)} />
              )}
              {desktop && (
                <Tooltip title={navigationToggleLabel}>
                  <Button
                    aria-label={navigationToggleLabel}
                    className="app-shell__navigation-toggle"
                    type="text"
                    icon={navigationCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={() => setNavigationCollapsed((collapsed) => !collapsed)}
                  />
                </Tooltip>
              )}
              <div className="app-shell__title-block">
                <Typography.Text className="app-shell__header-label">İKİTEKNİK BİLİŞİM</Typography.Text>
              </div>
            </Flex>
            <Flex className="app-shell__header-actions" align="center" gap={8}>
              <Badge count={3} size="small">
                <Button aria-label="Bildirimleri aç" type="text" icon={<BellOutlined />} />
              </Badge>
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    { key: "profile", icon: <UserOutlined />, label: "Profil ve hesap" },
                    { type: "divider" },
                    { key: "logout", danger: true, label: "Oturumu kapat", onClick: onLogout },
                  ],
                }}
              >
                <Button className="app-shell__profile" type="text">
                  <Avatar size={32}>{user.email.slice(0, 1).toLocaleUpperCase("tr-TR")}</Avatar>
                  {desktop && <span>{user.email}</span>}
                  <DownOutlined />
                </Button>
              </Dropdown>
            </Flex>
          </Flex>
        </Layout.Header>
        <Layout.Content className="app-shell__content">{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
