import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { AppProviders } from "./providers/AppProviders";

const refreshSession = vi.hoisted(() => vi.fn());

vi.mock("../features/auth", () => ({
  refreshSession,
}));

vi.mock("../pages/dashboard", () => ({
  DashboardPage: ({ onLogout }: { onLogout: () => void }) => (
    <button type="button" onClick={onLogout}>Oturumu kapat</button>
  ),
}));

vi.mock("../pages/login", () => ({
  LoginPage: () => <main>Giriş ekranı</main>,
}));

describe("App", () => {
  it("çıkış yapıldığında page parametresini URL'den siler", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/?page=userManagement&foo=bar#panel");
    refreshSession.mockResolvedValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: "2026-08-12T18:00:00Z",
      user: {
        id: "user-1",
        email: "admin@ikiteknik.com",
        fullName: "Admin User",
        authorities: ["user:permission:manage"],
      },
    });

    render(<AppProviders><App /></AppProviders>);

    await user.click(await screen.findByRole("button", { name: "Oturumu kapat" }));

    await waitFor(() => expect(screen.getByText("Giriş ekranı")).toBeInTheDocument());
    expect(window.location.search).toBe("?foo=bar");
    expect(window.location.hash).toBe("#panel");
  });
});
