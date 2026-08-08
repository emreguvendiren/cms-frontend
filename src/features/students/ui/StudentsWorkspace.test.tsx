import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../../app/providers/AppProviders";
import { StudentsWorkspace } from "./StudentsWorkspace";

const api = vi.hoisted(() => ({ loadStudents: vi.fn(), createStudent: vi.fn(), updateStudent: vi.fn(), removeStudent: vi.fn(), revealStudentPhone: vi.fn() }));
vi.mock("../api/studentApi", () => api);
const admin = { id: "admin", email: "admin@admin.com", authorities: ["student:delete", "student:phone:reveal"] };
const student = { id: "83f97d7d-9951-4759-a2e6-71155cb0a901", fullName: "Deniz Arslan", email: "deniz@example.com",
  phoneAvailable: true, phoneMasked: "••• ••• •• ••", status: "ACTIVE", activeCourse: "SolidWorks Profesyonel",
  registrationDate: "2026-08-06", source: "Web sitesi", kvkkConsent: true, inactiveReason: null, expectedStartDate: null, version: 0 };
beforeEach(() => { api.loadStudents.mockResolvedValue({ content: [student], page: 0, size: 100, totalElements: 1, totalPages: 1, first: true, last: true }); api.revealStudentPhone.mockResolvedValue("+905551234567"); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const show = () => render(<AppProviders><StudentsWorkspace user={admin} /></AppProviders>);

describe("StudentsWorkspace", () => {
  it("öğrencileri API'den yükler ve telefonu maskeli gösterir", async () => { show(); expect(await screen.findByText("Deniz Arslan")).toBeVisible(); expect(screen.getByText("••• ••• •• ••")).toBeVisible(); expect(api.loadStudents).toHaveBeenCalled(); });
  it("telefonu yetkili kullanıcıya tek tıkla gösterir", async () => { const user = userEvent.setup(); show(); await user.click(await screen.findByRole("button", { name: "Görüntüle" })); const dialog = screen.getByRole("dialog"); await user.click(within(dialog).getByRole("button", { name: "Telefon numarasını göster" })); expect(await within(dialog).findByText("+905551234567")).toBeInTheDocument(); expect(api.revealStudentPhone).toHaveBeenCalledWith(student.id); });
  it("silme yetkisi olmayan kullanıcıya silme aksiyonu göstermez", async () => { render(<AppProviders><StudentsWorkspace user={{...admin,authorities:[]}} /></AppProviders>); await screen.findByText("Deniz Arslan"); expect(screen.queryByRole("button", { name: "Sil" })).not.toBeInTheDocument(); });
});
