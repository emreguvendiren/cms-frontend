let accessToken: string | null = null;

export const authSession = {
  getAccessToken: (): string | null => accessToken,
  setAccessToken(token: string): void { accessToken = token; },
  clear(): void { accessToken = null; },
};

export function getAccessToken(): string | null {
  return authSession.getAccessToken();
}
