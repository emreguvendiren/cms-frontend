import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../../app/layouts/AppShell";
import type { AuthenticatedUser } from "../../features/auth";
import { DashboardOverview } from "../../features/dashboard";
import { CoursesWorkspace } from "../../features/courses";
import { CalendarWorkspace } from "../../features/calendar";
import { PaymentCalendarWorkspace } from "../../features/payment-calendar";
import { AuthorizationWorkspace } from "../../features/authorization";
import { StudentsWorkspace } from "../../features/students";

type DashboardPageProps = {
  user: AuthenticatedUser;
  onLogout: () => void;
};

const dashboardPageKeys = ["dashboard", "students", "courses", "calendar", "paymentCalendar", "finance", "reports", "authorization"] as const;
type DashboardPageKey = (typeof dashboardPageKeys)[number];
const pageQueryKey = "page";

export function DashboardPage({ user, onLogout }: DashboardPageProps): JSX.Element {
  const availablePages = useMemo(() => new Set<DashboardPageKey>([
    "dashboard",
    "students",
    "courses",
    "calendar",
    ...(user.authorities.includes("class:enrollment:update") ? ["paymentCalendar" as const] : []),
    "finance",
    "reports",
    ...(user.authorities.includes("user:permission:manage") ? ["authorization" as const] : []),
  ]), [user.authorities]);
  const [activePage, setActivePage] = useState<DashboardPageKey>(() => pageFromUrl(availablePages));

  useEffect(() => {
    const syncPage = () => {
      const nextPage = pageFromUrl(availablePages);
      replaceInvalidPageInUrl(nextPage, availablePages);
      setActivePage(nextPage);
    };
    syncPage();
    window.addEventListener("popstate", syncPage);
    return () => window.removeEventListener("popstate", syncPage);
  }, [availablePages]);

  const navigate = (page: string) => {
    const nextPage = normalizePage(page, availablePages);
    const url = new URL(window.location.href);
    if (nextPage === "dashboard") url.searchParams.delete(pageQueryKey);
    else url.searchParams.set(pageQueryKey, nextPage);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setActivePage(nextPage);
  };

  return (
    <AppShell user={user} onLogout={onLogout} activePage={activePage} onNavigate={navigate}>
      {activePage === "students" ? <StudentsWorkspace user={user} /> : activePage === "courses" ? <CoursesWorkspace user={user} /> : activePage === "calendar" ? <CalendarWorkspace /> : activePage === "paymentCalendar" ? <PaymentCalendarWorkspace /> : activePage === "authorization" ? <AuthorizationWorkspace currentUser={user} /> : <DashboardOverview />}
    </AppShell>
  );
}

function pageFromUrl(availablePages: Set<DashboardPageKey>): DashboardPageKey {
  return normalizePage(new URL(window.location.href).searchParams.get(pageQueryKey), availablePages);
}

function normalizePage(page: string | null, availablePages: Set<DashboardPageKey>): DashboardPageKey {
  if (page && dashboardPageKeys.includes(page as DashboardPageKey) && availablePages.has(page as DashboardPageKey)) {
    return page as DashboardPageKey;
  }
  return "dashboard";
}

function replaceInvalidPageInUrl(page: DashboardPageKey, availablePages: Set<DashboardPageKey>) {
  const url = new URL(window.location.href);
  const rawPage = url.searchParams.get(pageQueryKey);
  if (!rawPage || (rawPage === page && page !== "dashboard" && availablePages.has(page))) return;
  if (page === "dashboard") url.searchParams.delete(pageQueryKey);
  else url.searchParams.set(pageQueryKey, page);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}
