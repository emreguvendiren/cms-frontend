import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadPaymentCalendar } from "./paymentCalendarApi";

const generatedApi = vi.hoisted(() => ({ getPaymentCalendar: vi.fn() }));
vi.mock("../../../shared/api/generated", () => generatedApi);
vi.mock("../../auth", () => ({ getAccessToken: () => "token" }));

beforeEach(() => { vi.clearAllMocks(); });

describe("loadPaymentCalendar", () => {
  it("requests the selected month from the generated API", async () => {
    generatedApi.getPaymentCalendar.mockResolvedValue({ data: { month: "2026-08", items: [] } });

    await expect(loadPaymentCalendar("2026-08")).resolves.toEqual({ month: "2026-08", items: [] });
    expect(generatedApi.getPaymentCalendar).toHaveBeenCalledWith(expect.objectContaining({
      auth: "token",
      query: { month: "2026-08" },
      credentials: "include",
      throwOnError: true,
    }));
  });
});
