import type { JSX } from "react";
import { useState } from "react";

import { AppShell } from "../../app/layouts/AppShell";
import type { AuthenticatedUser } from "../../features/auth";
import { DashboardOverview } from "../../features/dashboard";
import { CoursesWorkspace } from "../../features/courses";
import { CalendarWorkspace } from "../../features/calendar";
import { AuthorizationWorkspace } from "../../features/authorization";
import { StudentsWorkspace } from "../../features/students";

type DashboardPageProps = {
  user: AuthenticatedUser;
  onLogout: () => void;
};

export function DashboardPage({ user, onLogout }: DashboardPageProps): JSX.Element {
  const [activePage, setActivePage] = useState("dashboard");

  return (
    <AppShell user={user} onLogout={onLogout} activePage={activePage} onNavigate={setActivePage}>
      {activePage === "students" ? <StudentsWorkspace user={user} /> : activePage === "courses" ? <CoursesWorkspace user={user} /> : activePage === "calendar" ? <CalendarWorkspace /> : activePage === "authorization" ? <AuthorizationWorkspace currentUser={user} /> : <DashboardOverview />}
    </AppShell>
  );
}
