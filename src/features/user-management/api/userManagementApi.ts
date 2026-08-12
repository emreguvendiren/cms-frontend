import { getAccessToken } from "../../auth";
import { environment } from "../../../shared/config/environment";
import {
  createManagedUser,
  listManagedUsers,
  type CreateManagedUserRequest,
  type ManagedUser,
  type ManagedUserPage,
} from "../../../shared/api/generated";

function options() {
  return {
    auth: getAccessToken() ?? undefined,
    baseUrl: environment.apiBaseUrl,
    credentials: "include" as const,
    throwOnError: true as const,
  };
}

export async function loadManagedUsers(search: string, page: number, size: number): Promise<ManagedUserPage> {
  return (await listManagedUsers({ ...options(), query: { search, page, size } })).data;
}

export async function createUser(request: CreateManagedUserRequest): Promise<ManagedUser> {
  return (await createManagedUser({ ...options(), body: request })).data;
}

export type { CreateManagedUserRequest, ManagedUser, ManagedUserPage } from "../../../shared/api/generated";
