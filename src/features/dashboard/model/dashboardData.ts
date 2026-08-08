export type DashboardMetric = {
  key: "students" | "courses" | "collections" | "receivables";
  label: string;
  value: string;
  change: string;
  trend: "positive" | "attention" | "neutral";
  detail: string;
};

export type FinancialPoint = {
  month: string;
  income: number;
  expense: number;
};

export type CourseOccupancy = {
  key: string;
  name: string;
  schedule: string;
  instructor: string;
  enrolled: number;
  capacity: number;
};

export type RecentEnrollment = {
  id: string;
  student: string;
  course: string;
  registeredAt: string;
  payment: "Tamamlandı" | "Taksitli" | "Bekliyor";
  amount: number;
};

export const dashboardMetrics: readonly DashboardMetric[] = [
  { key: "students", label: "Aktif öğrenci", value: "428", change: "+32", trend: "positive", detail: "Bu ay yeni kayıt" },
  { key: "courses", label: "Aktif sınıf", value: "18", change: "5", trend: "neutral", detail: "Bu hafta başlayacak" },
  { key: "collections", label: "Aylık tahsilat", value: "₺846.200", change: "%12,4", trend: "positive", detail: "Geçen aya göre" },
  { key: "receivables", label: "Bekleyen alacak", value: "₺128.500", change: "23", trend: "attention", detail: "Açık ödeme planı" },
];

export const financialTrend: readonly FinancialPoint[] = [
  { month: "Şub", income: 520, expense: 310 },
  { month: "Mar", income: 610, expense: 350 },
  { month: "Nis", income: 580, expense: 330 },
  { month: "May", income: 720, expense: 390 },
  { month: "Haz", income: 760, expense: 430 },
  { month: "Tem", income: 846, expense: 452 },
];

export const courseOccupancy: readonly CourseOccupancy[] = [
  { key: "solidworks", name: "SolidWorks Profesyonel", schedule: "5 Ağustos · 19.00", instructor: "M. Yılmaz", enrolled: 14, capacity: 16 },
  { key: "autocad", name: "AutoCAD 2D Teknik Çizim", schedule: "7 Ağustos · 18.30", instructor: "E. Kaya", enrolled: 11, capacity: 16 },
  { key: "catia", name: "CATIA Mekanik Tasarım", schedule: "12 Ağustos · 19.00", instructor: "S. Demir", enrolled: 8, capacity: 12 },
  { key: "revit", name: "Revit Architecture", schedule: "16 Ağustos · 10.00", instructor: "A. Çelik", enrolled: 6, capacity: 14 },
];

export const recentEnrollments: readonly RecentEnrollment[] = [
  { id: "IK-2026-0842", student: "Deniz Arslan", course: "SolidWorks Profesyonel", registeredAt: "Bugün, 14.42", payment: "Tamamlandı", amount: 18500 },
  { id: "IK-2026-0841", student: "Selin Korkmaz", course: "AutoCAD 2D Teknik Çizim", registeredAt: "Bugün, 11.18", payment: "Taksitli", amount: 14200 },
  { id: "IK-2026-0840", student: "Emre Aksoy", course: "CATIA Mekanik Tasarım", registeredAt: "Dün, 17.05", payment: "Bekliyor", amount: 21000 },
  { id: "IK-2026-0839", student: "Buse Aydın", course: "Revit Architecture", registeredAt: "Dün, 13.26", payment: "Tamamlandı", amount: 16800 },
];
