import { getAccessToken } from "../../auth";
import { environment } from "../../../shared/config/environment";
import { createStudent as createRequest, deleteStudent as deleteRequest, listStudents as listRequest,
  revealStudentPhone as revealRequest, updateStudent as updateRequest,
  type CreateStudentRequest, type Student, type StudentPage, type StudentStatus, type UpdateStudentRequest,
} from "../../../shared/api/generated";

function options() { return { auth: getAccessToken() ?? undefined, baseUrl: environment.apiBaseUrl,
  credentials: "include" as const, throwOnError: true as const }; }
export async function loadStudents(search = "", status?: StudentStatus): Promise<StudentPage> {
  return (await listRequest({ ...options(), query: { search, status, page: 0, size: 100 } })).data;
}
export async function createStudent(body: CreateStudentRequest): Promise<Student> {
  return (await createRequest({ ...options(), body })).data;
}
export async function updateStudent(id: string, body: UpdateStudentRequest): Promise<Student> {
  return (await updateRequest({ ...options(), path: { studentId: id }, body })).data;
}
export async function removeStudent(id: string): Promise<void> { await deleteRequest({ ...options(), path: { studentId: id } }); }
export async function revealStudentPhone(id: string): Promise<string> {
  return (await revealRequest({ ...options(), path: { studentId: id } })).data.phone;
}
export type { CreateStudentRequest, Student, StudentStatus, UpdateStudentRequest } from "../../../shared/api/generated";
