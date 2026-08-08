export type LoginCredentials = { email: string; password: string; rememberMe: boolean };

export type AuthenticatedUser = {
  id: string;
  email: string;
  authorities: string[];
};

export type LoginResult = {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  user: AuthenticatedUser;
};
