import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "../../../app/providers/AppProviders";
import { LoginForm } from "./LoginForm";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LoginForm", () => {
  it("beni hatırla tercihini varsayılan kapalı gönderir ve kullanıcı açabilir", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-token" }))
      .mockResolvedValueOnce(jsonResponse(loginResponse()));

    render(
      <AppProviders>
        <LoginForm onSuccess={vi.fn()} />
      </AppProviders>,
    );

    const rememberMe = screen.getByRole("checkbox", { name: "Beni hatırla" });
    expect(rememberMe).not.toBeChecked();
    rememberMe.focus();
    await user.keyboard(" ");
    expect(rememberMe).toBeChecked();
    await user.type(screen.getByLabelText("E-posta adresi"), "user@example.com");
    await user.type(screen.getByLabelText("Şifre"), "Correct-Horse-42");
    await user.click(screen.getByRole("button", { name: "Giriş yap" }));

    expect(fetchSpy).toHaveBeenNthCalledWith(2, expect.stringContaining("/api/auth/login"),
      expect.objectContaining({ body: JSON.stringify({
        email: "user@example.com",
        password: "Correct-Horse-42",
        rememberMe: true,
      }) }));
  });

  it("boş gönderimde alanlara düzeltilebilir doğrulama mesajları gösterir", async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <LoginForm onSuccess={vi.fn()} />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Giriş yap" }));

    expect(await screen.findByText("E-posta adresinizi girin.")).toBeInTheDocument();
    expect(screen.getByText("Şifrenizi girin.")).toBeInTheDocument();
  });

  it("geçersiz e-posta adresini API çağrısından önce reddeder", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <AppProviders>
        <LoginForm onSuccess={vi.fn()} />
      </AppProviders>,
    );

    await user.type(screen.getByLabelText("E-posta adresi"), "gecersiz");
    await user.type(screen.getByLabelText("Şifre"), "admin");
    await user.click(screen.getByRole("button", { name: "Giriş yap" }));

    expect(await screen.findByText("Geçerli bir e-posta adresi girin.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("hatalı giriş bilgilerinde kurumsal hata bildirimi gösterir", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ token: "csrf-token" }))
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401));

    render(
      <AppProviders>
        <LoginForm onSuccess={onSuccess} />
      </AppProviders>,
    );

    await user.type(screen.getByLabelText("E-posta adresi"), "user@example.com");
    await user.type(screen.getByLabelText("Şifre"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Giriş yap" }));

    expect(await screen.findByText("Giriş bilgileri doğrulanamadı")).toBeInTheDocument();
    expect(screen.getAllByText(/E-posta adresi veya şifre hatalı/).length).toBeGreaterThan(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function loginResponse(): unknown {
  return {
    accessToken: "access-token",
    tokenType: "Bearer",
    expiresAt: "2026-08-05T12:00:00Z",
    user: { id: "user-id", email: "user@example.com", authorities: [] },
  };
}
