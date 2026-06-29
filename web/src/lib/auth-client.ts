import axios from "axios";

export interface AuthUser {
  name: string;
  role?: string;
  userId?: string;
  tier?: string;
}

function b64Decode(b64: string): string {
  return decodeURIComponent(
    Array.from(atob(b64), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
  );
}

function decodeToken(token: string): AuthUser & { exp?: number } | null {
  try {
    const payload = JSON.parse(b64Decode(token.split(".")[1]));
    return {
      name: payload.name || "طالب",
      role: payload.role,
      userId: payload.userId || payload.id,
      tier: payload.tier,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

function isExpired(payload: { exp?: number }): boolean {
  if (!payload.exp) return false;
  return payload.exp < Date.now() / 1000;
}

export function getStoredAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("accessToken");
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  if (isExpired(payload)) return null;
  return { name: payload.name, role: payload.role, userId: payload.userId, tier: payload.tier };
}

export async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await axios.post("/api/auth/refresh", {}, {
      withCredentials: true,
    });
    const { accessToken } = res.data.data;
    localStorage.setItem("accessToken", accessToken);
    return true;
  } catch {
    localStorage.removeItem("accessToken");
    return false;
  }
}

export function clearAuth(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export async function getAuthOrRefresh(): Promise<AuthUser | null> {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) {
    localStorage.removeItem("accessToken");
    return null;
  }

  if (!isExpired(payload)) {
    return { name: payload.name, role: payload.role, userId: payload.userId, tier: payload.tier };
  }

  const refreshed = await tryRefreshToken();
  if (!refreshed) return null;

  const newToken = localStorage.getItem("accessToken");
  if (!newToken) return null;
  const newPayload = decodeToken(newToken);
  if (!newPayload) return null;
  return { name: newPayload.name, role: newPayload.role, userId: newPayload.userId, tier: newPayload.tier };
}
