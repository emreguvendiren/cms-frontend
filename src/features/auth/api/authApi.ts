import { apiRequest } from "../../../shared/api";
import { authSession } from "../model/authSession";
import type { LoginCredentials, LoginResult } from "../model/authTypes";

let refreshInFlight: Promise<LoginResult> | null = null;

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const csrf = parseCsrfResponse(await apiRequest("/api/auth/csrf"));
  const result = parseLoginResponse(await apiRequest("/api/auth/login", {
    method: "POST",
    headers: { "X-XSRF-TOKEN": csrf.token },
    body: credentials,
  }));
  authSession.setAccessToken(result.accessToken);
  return result;
}

export async function refreshSession(): Promise<LoginResult> {
  if (refreshInFlight !== null) return refreshInFlight;
  refreshInFlight = requestSessionRefresh();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function requestSessionRefresh(): Promise<LoginResult> {
  const csrf = parseCsrfResponse(await apiRequest("/api/auth/csrf"));
  const result = parseLoginResponse(await apiRequest("/api/auth/refresh", {
    method: "POST",
    headers: { "X-XSRF-TOKEN": csrf.token },
  }));
  authSession.setAccessToken(result.accessToken);
  return result;
}

function parseCsrfResponse(value: unknown): { token: string } {
  if (!isRecord(value) || typeof value.token !== "string") throw new Error("Geçersiz CSRF yanıtı.");
  return { token: value.token };
}

function parseLoginResponse(value: unknown): LoginResult {
  if (!isRecord(value) || typeof value.accessToken !== "string" || typeof value.tokenType !== "string" ||
      typeof value.expiresAt !== "string" || !isRecord(value.user) || typeof value.user.id !== "string" ||
      typeof value.user.email !== "string" || !Array.isArray(value.user.authorities) ||
      !value.user.authorities.every((item) => typeof item === "string")) {
    throw new Error("Geçersiz giriş yanıtı.");
  }
  return {
    accessToken: value.accessToken,
    tokenType: value.tokenType,
    expiresAt: value.expiresAt,
    user: { id: value.user.id, email: value.user.email, authorities: value.user.authorities },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
