import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "../../../app/providers/AppProviders";
import { UserManagementWorkspace } from "./UserManagementWorkspace";
import * as api from "../api/userManagementApi";

vi.mock("../api/userManagementApi", () => ({ createUser: vi.fn(), loadManagedUsers: vi.fn() }));

const page = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };
const created = { id: "user-1", email: "staff@example.com", fullName: "Staff User", enabled: true, authorities: ["profile:read"] };

beforeEach(() => {
  vi.mocked(api.loadManagedUsers).mockResolvedValue(page);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function renderWorkspace() {
  render(<AppProviders><UserManagementWorkspace /></AppProviders>);
}

describe("UserManagementWorkspace", () => {
  it("creates a user and adds it to the list", async () => {
    const user = userEvent.setup();
    vi.mocked(api.createUser).mockResolvedValue(created);

    renderWorkspace();

    await user.type(await screen.findByLabelText("Full name"), "Staff User");
    await user.type(screen.getByLabelText("Mail"), "staff@example.com");
    await user.type(screen.getByLabelText("Sifre"), "StrongPass1!");
    await user.type(screen.getByLabelText("Sifreyi dogrula"), "StrongPass1!");
    await user.click(screen.getByRole("button", { name: "Kullanici olustur" }));

    await waitFor(() => expect(api.createUser).toHaveBeenCalledWith({
      fullName: "Staff User",
      email: "staff@example.com",
      password: "StrongPass1!",
      passwordConfirm: "StrongPass1!",
    }));
    await waitFor(() => expect(screen.getAllByText("staff@example.com").length).toBeGreaterThan(0));
  });

  it("validates matching passwords before submit", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.type(await screen.findByLabelText("Full name"), "Staff User");
    await user.type(screen.getByLabelText("Mail"), "staff@example.com");
    await user.type(screen.getByLabelText("Sifre"), "StrongPass1!");
    await user.type(screen.getByLabelText("Sifreyi dogrula"), "Different1!");
    await user.click(screen.getByRole("button", { name: "Kullanici olustur" }));

    expect(await screen.findByText("Sifreler eslesmiyor.")).toBeInTheDocument();
    expect(api.createUser).not.toHaveBeenCalled();
  });
});
