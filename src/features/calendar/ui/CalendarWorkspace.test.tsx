import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "../../../app/providers/AppProviders";
import { CalendarWorkspace } from "./CalendarWorkspace";

const api = vi.hoisted(() => ({ loadCalendarClasses: vi.fn() }));
vi.mock("../api/calendarApi", () => api);

const currentDate = dayjs();
const currentClass = {
  id: "class-1",
  code: "SNF-041",
  name: "AutoCAD Hafta İçi Akşam",
  courseId: "course-1",
  courseCode: "KRS-001",
  courseName: "AutoCAD 2D Teknik Çizim",
  instructorName: "Murat Aydın",
  startDate: currentDate.subtract(1, "day").format("YYYY-MM-DD"),
  endDate: currentDate.add(5, "day").format("YYYY-MM-DD"),
  capacity: 14,
  enrolledCount: 8,
  status: "IN_PROGRESS",
  version: 0,
};

beforeEach(() => { api.loadCalendarClasses.mockResolvedValue([currentClass]); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function renderCalendar() {
  render(<AppProviders><CalendarWorkspace /></AppProviders>);
}

describe("CalendarWorkspace", () => {
  it("sınıfları ay takviminde ve seçili gün özetinde gösterir", async () => {
    renderCalendar();
    expect(await screen.findByRole("heading", { name: "Ders takvimi" })).toBeVisible();
    const selectedDay = await screen.findByRole("complementary");
    expect(within(selectedDay).getByText(currentClass.courseName)).toBeVisible();
    expect(within(selectedDay).getByText(currentClass.instructorName)).toBeVisible();
    expect(within(selectedDay).getByText("8/14")).toBeVisible();
    expect(screen.getAllByText(currentClass.name).length).toBeGreaterThan(1);
  });

  it("durum filtresine uymayan sınıfları takvimden kaldırır", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await screen.findByText(currentClass.courseName);
    await user.click(screen.getByRole("combobox", { name: "Sınıf durumuna göre filtrele" }));
    await user.click(await screen.findByText("Planlandı"));
    expect(await screen.findByText("Bu filtreye uygun sınıf bulunmuyor.")).toBeVisible();
    expect(screen.getByText("Bu tarihte devam eden sınıf yok.")).toBeVisible();
  });

  it("yükleme hatasında yeniden deneme olanağı sunar", async () => {
    const user = userEvent.setup();
    api.loadCalendarClasses.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([currentClass]);
    renderCalendar();
    expect(await screen.findByText("Ders takvimi yüklenemedi")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tekrar dene" }));
    expect(await screen.findByText(currentClass.courseName)).toBeVisible();
    expect(api.loadCalendarClasses).toHaveBeenCalledTimes(2);
  });
});
