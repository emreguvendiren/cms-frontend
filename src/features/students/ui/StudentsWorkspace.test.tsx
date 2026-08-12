import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../../app/providers/AppProviders";
import { StudentsWorkspace } from "./StudentsWorkspace";

const api = vi.hoisted(() => ({ loadStudents: vi.fn(), loadStudentEnrollments: vi.fn(), createStudent: vi.fn(), updateStudent: vi.fn(), removeStudent: vi.fn(), revealStudentPhone: vi.fn(), revealStudentIdentityNumber: vi.fn() }));
vi.mock("../api/studentApi", () => api);
const admin = { id: "admin", email: "admin@admin.com", authorities: ["student:delete", "student:phone:reveal", "student:identity-number:reveal"] };
const student = {
  id: "83f97d7d-9951-4759-a2e6-71155cb0a901",
  fullName: "Deniz Arslan",
  email: "deniz@example.com",
  phoneAvailable: true,
  phoneMasked: "*** *** ** **",
  identityNumberAvailable: true,
  identityNumberMasked: "***********",
  birthPlace: "Izmir",
  birthDate: "2001-05-20",
  fatherName: "Mehmet",
  motherName: "Ayse",
  gender: "MALE",
  status: "ACTIVE",
  activeCourse: "SolidWorks Profesyonel",
  registrationDate: "2026-08-06",
  source: "Web sitesi",
  kvkkConsent: true,
  inactiveReason: null,
  expectedStartDate: null,
  educationLevel: "Lise",
  schoolName: "Teknik Lise",
  profession: "Teknisyen",
  address: "Konak, Izmir",
  version: 0,
};
const enrollment = {
  classId: "class-1",
  classCode: "SNF-001",
  className: "Hafta ici aksam",
  courseId: "course-1",
  courseCode: "KRS-001",
  courseName: "SolidWorks Profesyonel",
  instructorName: "Murat Aydin",
  startDate: "2026-08-10",
  endDate: "2026-09-02",
  classStatus: "PLANNED",
  enrollmentId: "enrollment-1",
  enrollmentStatus: "ACTIVE",
  registrationFee: 24000,
  paymentPlan: "INSTALLMENT",
  installmentCount: 2,
  firstPaymentDate: "2026-08-15",
  paymentStatus: "PENDING",
  expectedPaymentDate: null,
  note: "Iki taksit",
  payments: [
    { id: "payment-1", installmentNumber: 1, installmentTotal: 2, amount: 12000, dueDate: "2026-08-15", status: "PENDING", paidAt: null, paymentMethod: null, version: 0 },
    { id: "payment-2", installmentNumber: 2, installmentTotal: 2, amount: 12000, dueDate: "2026-09-15", status: "PENDING", paidAt: null, paymentMethod: null, version: 0 },
  ],
  version: 0,
};
beforeEach(() => {
  api.loadStudents.mockResolvedValue({ content: [student], page: 0, size: 100, totalElements: 1, totalPages: 1, first: true, last: true });
  api.loadStudentEnrollments.mockResolvedValue([enrollment]);
  api.revealStudentPhone.mockResolvedValue("+905551234567");
  api.revealStudentIdentityNumber.mockResolvedValue("10000000146");
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const show = () => render(<AppProviders><StudentsWorkspace user={admin} /></AppProviders>);

describe("StudentsWorkspace", () => {
  it("öğrencileri API'den yükler ve hassas alanları maskeli gösterir", async () => {
    show();
    expect(await screen.findByText("Deniz Arslan")).toBeVisible();
    expect(screen.getByText("*** *** ** **")).toBeVisible();
    expect(screen.getByText("***********")).toBeVisible();
    expect(api.loadStudents).toHaveBeenCalled();
  });

  it("telefonu yetkili kullanıcıya tek tıkla gösterir", async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: "Görüntüle" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Telefon numarasını göster" }));
    expect(await within(dialog).findByText("+905551234567")).toBeInTheDocument();
    expect(api.revealStudentPhone).toHaveBeenCalledWith(student.id);
  }, 15000);

  it("TC kimlik noyu yetkili kullanıcıya tek tıkla gösterir", async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: "Görüntüle" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "TC kimlik numarasını göster" }));
    expect(await within(dialog).findByText("10000000146")).toBeInTheDocument();
    expect(api.revealStudentIdentityNumber).toHaveBeenCalledWith(student.id);
  });

  it("silme yetkisi olmayan kullanıcıya silme aksiyonu göstermez", async () => {
    render(<AppProviders><StudentsWorkspace user={{ ...admin, authorities: [] }} /></AppProviders>);
    await screen.findByText("Deniz Arslan");
    expect(screen.queryByRole("button", { name: "Sil" })).not.toBeInTheDocument();
  });

  it("ogrenci satiri acilinca kurs kayitlarini ve odeme planini collapsable gosterir", async () => {
    const user = userEvent.setup();
    show();
    await screen.findByText("Deniz Arslan");
    await user.click(screen.getByRole("button", { name: "Kurslari goster" }));
    expect(await screen.findByText("SolidWorks Profesyonel")).toBeVisible();
    expect(api.loadStudentEnrollments).toHaveBeenCalledWith(student.id);
    await user.click(screen.getByRole("button", { name: "Odemeleri goster" }));
    expect(await screen.findByText("Odeme ve taksit plani")).toBeVisible();
    expect(screen.getAllByText("₺12.000").length).toBeGreaterThan(0);
  }, 15000);

  it("yeni öğrenci kaydını modal yerine sayfa akışı olarak açar", async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: /Yeni öğrenci/ }));
    expect(screen.getByRole("heading", { name: "Yeni öğrenci kaydı" })).toBeVisible();
    expect(screen.getByText("Kimlik bilgileri")).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "Yeni ogrenci kaydi" })).not.toBeInTheDocument();
  });

  it("kaydet aksiyonunu öğrenci oluşturma API çağrısına bağlar", async () => {
    const user = userEvent.setup();
    api.createStudent.mockResolvedValue({ ...student, id: "new-student" });
    show();
    await user.click(await screen.findByRole("button", { name: /Yeni öğrenci/ }));
    await user.type(screen.getByLabelText("Ad soyad"), "Elif Yilmaz");
    await user.type(screen.getByLabelText("Telefon"), "0555 123 45 67");
    await user.type(screen.getByLabelText("E-posta"), "elif@example.com");
    await user.click(screen.getByRole("button", { name: "Devam et" }));
    await user.type(await screen.findByLabelText("TC kimlik no"), "10000000146");
    await user.click(screen.getByRole("button", { name: "Devam et" }));
    await user.click(await screen.findByRole("button", { name: /Kaydet/ }));
    expect(api.createStudent).toHaveBeenCalledWith(expect.objectContaining({
      fullName: "Elif Yilmaz",
      email: "elif@example.com",
      phone: "0555 123 45 67",
      identityNumber: "10000000146",
      gender: "NOT_SPECIFIED",
    }));
  }, 15000);
});
