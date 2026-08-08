import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../../app/providers/AppProviders";
import { AuthorizationWorkspace } from "./AuthorizationWorkspace";
import * as api from "../api/authorizationApi";

vi.mock("../api/authorizationApi", () => ({ loadAuthorizationCatalog: vi.fn(), loadManagedUsers: vi.fn(), saveUserAuthorities: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const admin = { id: "11111111-1111-1111-1111-111111111111", email: "admin@admin.com", authorities: ["user:permission:manage"] };
const target = { id: "22222222-2222-2222-2222-222222222222", email: "staff@example.com", enabled: true, authorities: ["profile:read"] };

describe("AuthorizationWorkspace", () => {
  it("kullanıcıları yükler ve rol şablonuyla yetkileri günceller", async () => {
    vi.mocked(api.loadAuthorizationCatalog).mockResolvedValue({ authorities: ["profile:read", "course:read", "user:permission:manage"], roles: { VIEWER: ["profile:read", "course:read"] } });
    vi.mocked(api.loadManagedUsers).mockResolvedValue({ content: [target], page: 0, size: 10, totalElements: 1, totalPages: 1, first: true, last: true });
    vi.mocked(api.saveUserAuthorities).mockResolvedValue({ ...target, authorities: ["profile:read", "course:read"] });
    const user = userEvent.setup();
    render(<AppProviders><AuthorizationWorkspace currentUser={admin} /></AppProviders>);
    expect((await screen.findAllByText("staff@example.com"))[0]).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Yetkileri düzenle" }));
    await user.click(screen.getByRole("combobox", { name: "Rol şablonu" }));
    await user.click(await screen.findByText("Görüntüleyici"));
    await user.click(screen.getByRole("button", { name: "Yetkileri güncelle" }));
    await waitFor(() => expect(api.saveUserAuthorities).toHaveBeenCalledWith(target.id, ["profile:read", "course:read"]));
  });

  it("yükleme hatasında tekrar deneme sunar", async () => {
    vi.mocked(api.loadAuthorizationCatalog).mockRejectedValue(new Error("network"));
    vi.mocked(api.loadManagedUsers).mockRejectedValue(new Error("network"));
    render(<AppProviders><AuthorizationWorkspace currentUser={admin} /></AppProviders>);
    expect(await screen.findByText("Kullanıcılar yüklenemedi")).toBeVisible();
    expect(screen.getByRole("button", { name: "Tekrar dene" })).toBeEnabled();
  });
});
