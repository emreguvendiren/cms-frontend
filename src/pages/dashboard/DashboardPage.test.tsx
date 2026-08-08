import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "../../app/providers/AppProviders";
import { DashboardPage } from "./DashboardPage";

afterEach(() => cleanup());

const administrator = {
  id: "user-1",
  email: "admin@ikiteknik.com",
  authorities: ["ROLE_ADMIN"],
};

describe("DashboardPage", () => {
  it("eğitim operasyon özetini ve kritik aksiyonu gösterir", () => {
    render(
      <AppProviders>
        <DashboardPage user={administrator} onLogout={vi.fn()} />
      </AppProviders>,
    );

    expect(screen.getByRole("heading", { name: "Günaydın, operasyon özeti hazır." })).toBeVisible();
    expect(screen.getByRole("button", { name: /Yeni öğrenci kaydı/ })).toBeEnabled();
    expect(screen.getByText("Aktif öğrenci")).toBeVisible();
    expect(screen.getByText("Gelir ve gider eğilimi")).toBeVisible();
    expect(screen.getAllByText("SolidWorks Profesyonel").length).toBeGreaterThan(0);
    expect(screen.getByText("Deniz Arslan")).toBeVisible();
  });

  it("dar görünümde navigasyon drawerını erişilebilir düğmeyle açar", async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <DashboardPage user={administrator} onLogout={vi.fn()} />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Navigasyonu aç" }));

    expect(await screen.findByText("Öğrenciler")).toBeVisible();
    expect(screen.getByText("Finans")).toBeVisible();
  });

  it("Öğrenciler navigasyonundan öğrenci modülünü açar", async () => {
    const user = userEvent.setup();
    render(<AppProviders><DashboardPage user={administrator} onLogout={vi.fn()} /></AppProviders>);
    await user.click(screen.getByRole("button", { name: "Navigasyonu aç" }));
    await user.click(await screen.findByText("Öğrenciler"));
    expect(await screen.findByRole("heading", { name: "Öğrenciler" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Yeni öğrenci/ })).toBeVisible();
  });
});
