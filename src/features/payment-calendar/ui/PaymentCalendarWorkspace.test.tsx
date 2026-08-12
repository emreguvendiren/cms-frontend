import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "../../../app/providers/AppProviders";
import { PaymentCalendarWorkspace } from "./PaymentCalendarWorkspace";

const api = vi.hoisted(() => ({ loadPaymentCalendar: vi.fn() }));
vi.mock("../api/paymentCalendarApi", () => api);

const currentDate = dayjs();
const today = currentDate.format("YYYY-MM-DD");
const items = [
  {
    paymentId: "payment-1",
    enrollmentId: "enrollment-1",
    classId: "class-1",
    classCode: "SNF-001",
    className: "AutoCAD Aksam",
    courseName: "AutoCAD 2D",
    studentId: "student-1",
    studentFullName: "Elif Yilmaz",
    paymentPlan: "CASH",
    installmentNumber: 1,
    installmentTotal: 1,
    amount: 1500,
    dueDate: null,
    status: "COMPLETED",
    paidAt: today,
    paymentMethod: "CASH",
  },
  {
    paymentId: "payment-2",
    enrollmentId: "enrollment-2",
    classId: "class-1",
    classCode: "SNF-001",
    className: "AutoCAD Aksam",
    courseName: "AutoCAD 2D",
    studentId: "student-2",
    studentFullName: "Deniz Arslan",
    paymentPlan: "INSTALLMENT",
    installmentNumber: 2,
    installmentTotal: 4,
    amount: 2000,
    dueDate: today,
    status: "PENDING",
    paidAt: null,
    paymentMethod: null,
  },
  {
    paymentId: "payment-3",
    enrollmentId: "enrollment-3",
    classId: "class-2",
    classCode: "SNF-002",
    className: "CNC Gunu",
    courseName: "CNC",
    studentId: "student-3",
    studentFullName: "Mert Kaya",
    paymentPlan: "PROMISSORY_NOTE",
    installmentNumber: 1,
    installmentTotal: 2,
    amount: 3000,
    dueDate: today,
    status: "PENDING",
    paidAt: null,
    paymentMethod: null,
  },
];

beforeEach(() => {
  api.loadPaymentCalendar.mockResolvedValue({ month: currentDate.format("YYYY-MM"), items });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function renderPaymentCalendar() {
  render(<AppProviders><PaymentCalendarWorkspace /></AppProviders>);
}

describe("PaymentCalendarWorkspace", () => {
  it("shows monthly summary cards and selected day payments", async () => {
    renderPaymentCalendar();

    expect(await screen.findByRole("heading", { name: "Odeme Takvimi" })).toBeVisible();
    expect(screen.getByText("Tamamlanan odemeler")).toBeVisible();
    expect(screen.getByText("Beklenen taksitler")).toBeVisible();
    expect(screen.getByText("Beklenen senetler")).toBeVisible();

    const selectedDay = await screen.findByRole("complementary");
    expect(within(selectedDay).getByText("Elif Yilmaz")).toBeVisible();
    expect(within(selectedDay).getByText("Deniz Arslan")).toBeVisible();
    expect(within(selectedDay).getByText("Mert Kaya")).toBeVisible();
    expect(within(selectedDay).getByText("Tahsil edildi")).toBeVisible();
    expect(within(selectedDay).getByText("Taksit vadesi")).toBeVisible();
    expect(within(selectedDay).getByText("Senet vadesi")).toBeVisible();
  });

  it("offers retry when loading fails", async () => {
    const user = userEvent.setup();
    api.loadPaymentCalendar.mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ month: currentDate.format("YYYY-MM"), items });

    renderPaymentCalendar();
    expect(await screen.findByText("Odeme takvimi yuklenemedi")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tekrar dene" }));
    expect(await screen.findByText("Elif Yilmaz")).toBeVisible();
    expect(api.loadPaymentCalendar).toHaveBeenCalledTimes(2);
  });
});
