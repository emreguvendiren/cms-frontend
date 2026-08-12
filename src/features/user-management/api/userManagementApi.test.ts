import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUser, loadManagedUsers } from "./userManagementApi";

const generatedApi = vi.hoisted(() => ({ createManagedUser: vi.fn(), listManagedUsers: vi.fn() }));
vi.mock("../../../shared/api/generated", () => generatedApi);
vi.mock("../../auth", () => ({ getAccessToken: () => "token" }));

beforeEach(() => { vi.clearAllMocks(); });

describe("userManagementApi", () => {
  it("loads managed users through generated API", async () => {
    generatedApi.listManagedUsers.mockResolvedValue({ data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true } });

    await loadManagedUsers("staff", 0, 10);

    expect(generatedApi.listManagedUsers).toHaveBeenCalledWith(expect.objectContaining({
      auth: "token",
      query: { search: "staff", page: 0, size: 10 },
    }));
  });

  it("creates managed users through generated API", async () => {
    const request = { fullName: "Staff User", email: "staff@example.com", password: "StrongPass1!", passwordConfirm: "StrongPass1!" };
    generatedApi.createManagedUser.mockResolvedValue({ data: { id: "user-1", email: request.email, fullName: request.fullName, enabled: true, authorities: ["profile:read"] } });

    await createUser(request);

    expect(generatedApi.createManagedUser).toHaveBeenCalledWith(expect.objectContaining({ body: request }));
  });
});
