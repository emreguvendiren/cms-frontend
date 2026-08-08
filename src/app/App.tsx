import type { JSX } from "react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Spin } from "antd";

import { refreshSession, type AuthenticatedUser } from "../features/auth";
import { LoginPage } from "../pages/login";

const DashboardPage = lazy(async () => {
  const dashboard = await import("../pages/dashboard");
  return { default: dashboard.DashboardPage };
});

export function App(): JSX.Element {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [restoringSession, setRestoringSession] = useState(true);

  useEffect(() => {
    let active = true;
    void refreshSession()
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setRestoringSession(false);
      });
    return () => { active = false; };
  }, []);

  if (restoringSession) {
    return <div className="app-loading" role="status" aria-label="Oturum kontrol ediliyor"><Spin size="large" /></div>;
  }

  if (user === null) {
    return <LoginPage onAuthenticated={setUser} />;
  }

  return (
    <Suspense fallback={<div className="app-loading" role="status" aria-label="Yönetim paneli yükleniyor"><Spin size="large" /></div>}>
      <DashboardPage user={user} onLogout={() => setUser(null)} />
    </Suspense>
  );
}
