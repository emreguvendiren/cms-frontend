import { environment } from "../config/environment";
import { ApiError } from "./apiError";

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiRequest(path: string, options: ApiRequestOptions = {}): Promise<unknown> {
  const response = await fetch(`${environment.apiBaseUrl}${path}`, {
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  return response.status === 204 ? undefined : (response.json() as Promise<unknown>);
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string") {
      return payload.message;
    }
  } catch {
    // The status code is the fallback when the response has no JSON body.
  }
  return "İstek tamamlanamadı.";
}
