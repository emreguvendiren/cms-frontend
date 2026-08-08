import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../../app/providers/AppProviders";
import { CoursesWorkspace } from "./CoursesWorkspace";

const api = vi.hoisted(() => ({ loadCourses: vi.fn(), loadClasses: vi.fn(), loadClassDetail: vi.fn(), loadEnrollmentCandidates: vi.fn(), enrollStudent: vi.fn(), updateEnrollment: vi.fn(), receivePayment: vi.fn(), removeEnrollment: vi.fn(), createCourse: vi.fn(), createClass: vi.fn(), updateCourse: vi.fn(), updateClass: vi.fn(), removeCourse: vi.fn(), removeClass: vi.fn() }));
vi.mock("../api/trainingApi", () => api);

const admin = { id: "admin", email: "admin@admin.com", authorities: ["course:create", "course:update", "course:delete", "class:create", "class:update", "class:delete", "class:enrollment:create", "class:enrollment:update", "class:enrollment:delete"] };
const course = { id: "56d11b06-09d2-4fdf-a286-35f499c4fd50", code: "KRS-001", name: "AutoCAD 2D Teknik Çizim", category: "Teknik Tasarım", durationHours: 48, listPrice: 12500, status: "ACTIVE", version: 0 };
const courseClass = { id: "50286120-df69-49c8-b803-5dfdd9a98287", code: "SNF-041", name: "AutoCAD Hafta İçi Akşam", courseId: course.id, courseCode: course.code, courseName: course.name, instructorName: "Murat Aydın", startDate: "2026-08-10", endDate: "2026-09-02", capacity: 14, enrolledCount: 1, status: "ENROLLMENT_OPEN", version: 0 };
const page = <T,>(content: T[]) => ({ content, page: 0, size: 8, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true });

beforeEach(() => {
  api.loadCourses.mockResolvedValue(page([course])); api.loadClasses.mockResolvedValue(page([courseClass]));
  api.loadClassDetail.mockResolvedValue({ classInfo: courseClass, students: [{ id: "student-1", enrollmentId: "enrollment-1", fullName: "Deniz Arslan", email: "deniz@example.com", phoneMasked: "••• ••• •• ••", enrollmentStatus: "ACTIVE", registrationFee: 12500, paymentPlan: "CASH", installmentCount: null, firstPaymentDate: null, paymentStatus: "PENDING", expectedPaymentDate: "2026-08-20", note: null, payments: [{ id: "payment-1", installmentNumber: 1, installmentTotal: 1, amount: 12500, dueDate: "2026-08-20", status: "PENDING", paidAt: null, version: 0 }], version: 0 }] });
  api.loadEnrollmentCandidates.mockResolvedValue([{ id: "student-2", fullName: "Elif Yılmaz", email: "elif@example.com", phoneAvailable: true, phoneMasked: "•••", status: "PROSPECTIVE", activeCourse: null, registrationDate: "2026-08-01", source: "Web sitesi", kvkkConsent: true, inactiveReason: null, expectedStartDate: "2026-08-10", version: 0 }]);
  api.enrollStudent.mockResolvedValue({ id: "student-2", enrollmentId: "enrollment-2", fullName: "Elif Yılmaz", email: "elif@example.com", phoneMasked: "•••", enrollmentStatus: "ACTIVE", registrationFee: 18500, paymentPlan: "CASH", installmentCount: null, firstPaymentDate: null, paymentStatus: "PENDING", expectedPaymentDate: "2026-08-20", note: "Ön kayıt görüşmesi yapıldı.", payments: [{ id: "payment-2", installmentNumber: 1, installmentTotal: 1, amount: 18500, dueDate: "2026-08-20", status: "PENDING", paidAt: null, version: 0 }], version: 0 });
  api.updateEnrollment.mockResolvedValue({ id: "student-1", enrollmentId: "enrollment-1", fullName: "Deniz Arslan", email: "deniz@example.com", phoneMasked: "•••", enrollmentStatus: "ACTIVE", registrationFee: 15000, paymentPlan: "CASH", installmentCount: null, firstPaymentDate: null, paymentStatus: "PENDING", expectedPaymentDate: "2026-08-20", note: null, payments: [{ id: "payment-1", installmentNumber: 1, installmentTotal: 1, amount: 15000, dueDate: "2026-08-20", status: "PENDING", paidAt: null, version: 1 }], version: 1 });
  api.receivePayment.mockResolvedValue({ id: "student-1", enrollmentId: "enrollment-1", fullName: "Deniz Arslan", email: "deniz@example.com", phoneMasked: "•••", enrollmentStatus: "ACTIVE", registrationFee: 12500, paymentPlan: "CASH", installmentCount: null, firstPaymentDate: null, paymentStatus: "COMPLETED", expectedPaymentDate: "2026-08-20", note: null, payments: [{ id: "payment-1", installmentNumber: 1, installmentTotal: 1, amount: 12500, dueDate: "2026-08-20", status: "COMPLETED", paidAt: "2026-08-08", version: 1 }], version: 1 });
  api.removeEnrollment.mockResolvedValue(undefined);
  api.createCourse.mockResolvedValue(undefined); api.createClass.mockResolvedValue(undefined); api.updateCourse.mockResolvedValue(undefined); api.updateClass.mockResolvedValue(undefined); api.removeCourse.mockResolvedValue(undefined); api.removeClass.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function renderWorkspace() { render(<AppProviders><CoursesWorkspace user={admin} /></AppProviders>); }

describe("CoursesWorkspace", () => {
  it("kurs oluşturma formunda kod istemez ve durum seçtirir", async () => {
    const user = userEvent.setup(); renderWorkspace();
    expect(await screen.findByText(course.name)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Yeni kurs/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText("Kurs kodu")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Durum")).toBeInTheDocument();
  });

  it("kurs düzenleme aksiyonunu gerçek endpoint wrapperına bağlar", async () => {
    const user = userEvent.setup(); renderWorkspace(); await screen.findByText(course.name);
    await user.click(screen.getByRole("button", { name: "Düzenle" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("kaydını düzenle");
    expect(within(dialog).getByDisplayValue(course.name)).toBeInTheDocument();
  });

  it("sınıf satırından detay ve kayıtlı öğrencileri açar", async () => {
    const user = userEvent.setup(); renderWorkspace(); await user.click(screen.getByRole("tab", { name: /Sınıflar/ }));
    await screen.findByText(courseClass.name);
    await user.click(screen.getByRole("button", { name: /Öğrencileri göster/ }));
    expect(await screen.findByText("Deniz Arslan")).toBeInTheDocument();
    expect(api.loadClassDetail).toHaveBeenCalledWith(courseClass.id);
    await user.click(screen.getByRole("button", { name: "Deniz Arslan ödeme detayları" }));
    expect(await screen.findByText("Deniz Arslan · Ödeme detayları")).toBeInTheDocument();
    expect(screen.getByText("Ödeme ve taksit planı")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ödeme alındı" }));
    await user.click((await screen.findAllByRole("button", { name: "Ödeme alındı" })).at(-1)!);
    expect(api.receivePayment).toHaveBeenCalledWith(courseClass.id, "enrollment-1", "payment-1", { version: 0 });
    expect((await screen.findAllByText("Ödeme tamamlandı")).length).toBeGreaterThan(0);
  }, 30000);

  it("sınıf formunda kod ve ders programı yerine tarih aralığı kullanır", async () => {
    const user = userEvent.setup(); renderWorkspace(); await user.click(screen.getByRole("tab", { name: /Sınıflar/ })); await user.click(screen.getByRole("button", { name: /Yeni sınıf/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText("Sınıf kodu")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Başlangıç ve bitiş tarihi")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Ders programı")).not.toBeInTheDocument();
  });

  it("öğrenciyi peşin ödeme bilgileriyle gerçek kayıt servisine gönderir", async () => {
    const user = userEvent.setup(); renderWorkspace();
    await user.click(screen.getByRole("tab", { name: /Sınıflar/ }));
    await screen.findByText(courseClass.name);
    await user.click(screen.getByRole("button", { name: /Öğrenci kaydet/ }));
    expect(await screen.findByText(/Aday öğrenci kayıtla birlikte aktifleşir/)).toBeInTheDocument();
    await user.click(await screen.findByText("Elif Yılmaz"));
    await user.type(screen.getByLabelText("Kayıt ücreti"), "18500");
    await user.click(screen.getByLabelText("Tahmini ödeme tarihi"));
    await user.click(screen.getByTitle("2026-08-20"));
    await user.type(screen.getByPlaceholderText("Ödeme anlaşması veya kayıtla ilgili önemli açıklama"), "Ön kayıt görüşmesi yapıldı.");
    await user.click(screen.getByRole("button", { name: /Öğrenciyi sınıfa kaydet/ }));
    expect(api.enrollStudent).toHaveBeenCalledWith(courseClass.id, expect.objectContaining({ studentId: "student-2", registrationFee: 18500, paymentPlan: "CASH", paymentStatus: "PENDING", installmentCount: null, firstPaymentDate: null, expectedPaymentDate: "2026-08-20" }));
    expect((await screen.findAllByText("Ödeme bekliyor")).length).toBeGreaterThan(0);
  }, 15000);

  it("taksitli ödemede taksit sayısı ve ilk ödeme tarihini gösterir", async () => {
    const user = userEvent.setup(); renderWorkspace();
    await user.click(screen.getByRole("tab", { name: /Sınıflar/ }));
    await screen.findByText(courseClass.name);
    await user.click(screen.getByRole("button", { name: /Öğrenci kaydet/ }));
    await screen.findByText("Elif Yılmaz");
    await user.click(screen.getByText("Taksitli"));
    expect(screen.getByLabelText("Taksit sayısı")).toBeInTheDocument();
    expect(screen.getByLabelText("İlk ödeme tarihi")).toBeInTheDocument();
  });

  it("sınıf işlemlerinde öğrenci kaydet, düzenle ve sil aksiyonlarını yan yana gösterir", async () => {
    const user = userEvent.setup(); renderWorkspace();
    await user.click(screen.getByRole("tab", { name: /Sınıflar/ }));
    await screen.findByText(courseClass.name);
    expect(screen.getByRole("button", { name: /Öğrenci kaydet/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Düzenle" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sil" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Kayıtları yönet/ })).not.toBeInTheDocument();
  });
});
