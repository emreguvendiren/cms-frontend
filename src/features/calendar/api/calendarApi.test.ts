import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadCalendarClasses } from "./calendarApi";

const trainingApi = vi.hoisted(() => ({ loadClasses: vi.fn() }));
vi.mock("../../courses/api/trainingApi", () => trainingApi);

beforeEach(() => { vi.clearAllMocks(); });

describe("loadCalendarClasses", () => {
  it("takvim için tüm sınıf sayfalarını birleştirir", async () => {
    const firstClass = { id: "class-1" };
    const secondClass = { id: "class-2" };
    trainingApi.loadClasses
      .mockResolvedValueOnce({ content: [firstClass], last: false })
      .mockResolvedValueOnce({ content: [secondClass], last: true });

    await expect(loadCalendarClasses()).resolves.toEqual([firstClass, secondClass]);
    expect(trainingApi.loadClasses).toHaveBeenNthCalledWith(1, { search: "", page: 0, size: 100 });
    expect(trainingApi.loadClasses).toHaveBeenNthCalledWith(2, { search: "", page: 1, size: 100 });
  });
});
