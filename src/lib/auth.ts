import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

// 12 rounds matches the blueprint's security spec (Section 9).
// Higher = slower to crack but slower to compute. 12 is the standard
// sweet spot in 2026 for a project this size.
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export interface TokenPayload {
  userId: string;
  role: "student" | "admin" | "teacher";
  name?: string;
  tier?: string;
}

/**
 * Access token: short-lived (15 min). This is what gets sent with every
 * API request to prove who you are. Short lifetime = if it leaks, the
 * damage window is small.
 */
export function signAccessToken(payload: TokenPayload): string {
  if (!ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not set");
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

/**
 * Refresh token: long-lived (7 days). Stored in an httpOnly cookie so
 * client-side JS can never read it (protects against XSS token theft).
 * Used only to silently get a new access token when the old one expires.
 */
export function signRefreshToken(payload: TokenPayload): string {
  if (!REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET is not set");
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}
