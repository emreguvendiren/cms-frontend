import { getAccessToken } from "../../auth";
import { environment } from "../../../shared/config/environment";
import { getAuthorizationCatalog, listManagedUsers, replaceUserAuthorities, type AuthorizationCatalog, type ManagedUser, type ManagedUserPage } from "../../../shared/api/generated";

function options() { return { auth: getAccessToken() ?? undefined, baseUrl: environment.apiBaseUrl, credentials: "include" as const, throwOnError: true as const }; }
export async function loadAuthorizationCatalog(): Promise<AuthorizationCatalog> { return (await getAuthorizationCatalog(options())).data; }
export async function loadManagedUsers(search: string, page: number, size: number): Promise<ManagedUserPage> { return (await listManagedUsers({ ...options(), query: { search, page, size } })).data; }
export async function saveUserAuthorities(userId: string, authorities: string[]): Promise<ManagedUser> { return (await replaceUserAuthorities({ ...options(), path: { userId }, body: { authorities } })).data; }
export type { AuthorizationCatalog, ManagedUser, ManagedUserPage };
