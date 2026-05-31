export interface IAuthProvider {
  validateToken(token: string): Promise<{ userId: string }>;
  issueToken(userId: string): Promise<{ access_token: string; expires_in: number }>;
  verifyCredentials(email: string, password: string): Promise<{ userId: string }>;
  register(email: string, password: string): Promise<{ userId: string }>;
}
