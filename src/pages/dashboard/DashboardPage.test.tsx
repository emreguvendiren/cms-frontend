import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "../../app/providers/AppProviders";
import { DashboardPage } from "./DashboardPage";

beforeEach(() => {
  window.history.pushState({}, "", "/");
});
afterEach(() => cleanup());

const administrator = {
  id: "user-1",
  email: "admin@ikiteknik.com",
  fullName: "Admin User",
  authorities: ["ROLE_ADMIN"],
};

describe("DashboardPage", () => {
  it("egitim operasyon ozetini ve kritik aksiyonu gosterir", () => {
    render(
      <AppProviders>
        <DashboardPage user={administrator} onLogout={vi.fn()} />
      </AppProviders>,
    );

    expect(screen.getByRole("heading", { name: /operasyon .*zeti/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Yeni .*renci kayd/i })).toBeEnabled();
    expect(screen.getByText(/Aktif .*renci/i)).toBeVisible();
    expect(screen.getAllByText(/Gelir ve gider/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("SolidWorks Profesyonel").length).toBeGreaterThan(0);
    expect(screen.getByText("Deniz Arslan")).toBeVisible();
  });

  it("dar gorunumde navigasyon drawerini erisilebilir dugmeyle acar", async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <DashboardPage user={administrator} onLogout={vi.fn()} />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: /Navigasyonu a./i }));

    expect(await screen.findByText(/renciler/i)).toBeVisible();
    expect(screen.getByText("Finans")).toBeVisible();
  });

  it("Ogrenciler navigasyonundan ogrenci modulunu acar ve URL'i gunceller", async () => {
    const user = userEvent.setup();
    render(<AppProviders><DashboardPage user={administrator} onLogout={vi.fn()} /></AppProviders>);
    await user.click(screen.getByRole("button", { name: /Navigasyonu a./i }));
    await user.click(await screen.findByText(/renciler/i));
    expect(await screen.findByRole("heading", { name: /renciler/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Yeni .*renci/i })).toBeVisible();
    expect(window.location.search).toBe("?page=students");
  });

  it("URL'deki gecerli navigasyon degeriyle refresh sonrasi ayni modulu acar", async () => {
    window.history.pushState({}, "", "/?page=students");
    render(<AppProviders><DashboardPage user={administrator} onLogout={vi.fn()} /></AppProviders>);
    expect(await screen.findByRole("heading", { name: /renciler/i })).toBeVisible();
  });

  it("URL'deki bilinmeyen navigasyon degerinde genel bakisa doner", () => {
    window.history.pushState({}, "", "/?page=unknown");
    render(<AppProviders><DashboardPage user={administrator} onLogout={vi.fn()} /></AppProviders>);
    expect(screen.getByRole("heading", { name: /operasyon .*zeti/i })).toBeVisible();
    expect(window.location.search).toBe("");
  });
});
