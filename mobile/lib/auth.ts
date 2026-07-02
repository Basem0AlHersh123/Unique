// import * as SecureStore from "expo-secure-store";

// const ACCESS_TOKEN_KEY = "unique_access_token";
// const REFRESH_TOKEN_KEY = "unique_refresh_token";
// const USER_KEY = "unique_user";

// export interface AuthUser {
//   userId: string;
//   id?: string;
//   name: string;
//   email?: string;
//   role: "student" | "admin" | "teacher";
//   tier: "free" | "paid";
//   exp: number;
// }

// export async function saveToken(token: string): Promise<void> {
//   await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
// }

// export async function getToken(): Promise<string | null> {
//   return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
// }

// export async function saveRefreshToken(token: string): Promise<void> {
//   await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
// }

// export async function getRefreshToken(): Promise<string | null> {
//   return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
// }

// export async function clearToken(): Promise<void> {
//   await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
//   await SecureStore.deleteItemAsync(USER_KEY);
// }

// export async function clearTokens(): Promise<void> {
//   await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
//   await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
//   await SecureStore.deleteItemAsync(USER_KEY);
// }

// function decodeToken(token: string): AuthUser | null {
//   try {
//     const base64 = token.split(".")[1];
//     const b64 = base64.replace(/-/g, "+").replace(/_/g, "/");
//     const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
//     const decoded = JSON.parse(atob(padded));
//     return {
//       userId: decoded.userId || decoded.id,
//       name: decoded.name || "",
//       role: decoded.role || "student",
//       tier: decoded.tier || "free",
//       exp: decoded.exp || 0,
//     };
//   } catch {
//     return null;
//   }
// }

// export async function getStoredUser(): Promise<AuthUser | null> {
//   const token = await getToken();
//   if (!token) return null;
//   const user = decodeToken(token);
//   if (!user) return null;
//   if (user.exp * 1000 < Date.now()) return null;

//   try {
//     const saved = await SecureStore.getItemAsync(USER_KEY);
//     if (saved) {
//       const parsed = JSON.parse(saved);
//       return { ...user, name: parsed.name || user.name, email: parsed.email || user.email };
//     }
//   } catch {}

//   return user;
// }

// export async function saveUser(user: Record<string, unknown>): Promise<void> {
//   await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
// }
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "unique_access_token";
const REFRESH_TOKEN_KEY = "unique_refresh_token";
const USER_KEY = "unique_user";

export interface AuthUser {
  userId: string;
  id?: string;
  name: string;
  email?: string;
  role: "student" | "admin" | "teacher";
  tier: "free" | "paid";
  exp: number;
  streak?: number;       // days in a row the student has logged in
  profileImage?: string; // cloudinary URL
  collegeId?: string;
  diamonds?: number;     // for future gem system
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

function decodeToken(token: string): Partial<AuthUser> | null {
  try {
    const base64 = token.split(".")[1];
    const b64 = base64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    return {
      userId: decoded.userId || decoded.id,
      name: decoded.name || "",
      role: decoded.role || "student",
      tier: decoded.tier || "free",
      exp: decoded.exp || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Returns the current user by merging:
 *   1. The JWT payload (userId, role, tier, exp)
 *   2. The extra fields saved in SecureStore at login (name, email, streak,
 *      profileImage, collegeId, diamonds)
 *
 * This means streak is always up to date as long as you call saveUser()
 * with the full user object returned by the login API.
 */
export async function getStoredUser(): Promise<AuthUser | null> {
  const token = await getToken();
  if (!token) return null;

  const fromJwt = decodeToken(token);
  if (!fromJwt || !fromJwt.userId) return null;

  // Token expired
  if (fromJwt.exp && fromJwt.exp * 1000 < Date.now()) return null;

  let extra: Partial<AuthUser> = {};
  try {
    const saved = await SecureStore.getItemAsync(USER_KEY);
    if (saved) extra = JSON.parse(saved) as Partial<AuthUser>;
  } catch {}

  return {
    userId: fromJwt.userId!,
    name: extra.name || fromJwt.name || "",
    email: extra.email,
    role: fromJwt.role || "student",
    tier: fromJwt.tier || "free",
    exp: fromJwt.exp || 0,
    streak: extra.streak ?? 0,
    profileImage: extra.profileImage,
    collegeId: extra.collegeId,
    diamonds: extra.diamonds ?? 0,
  };
}

export async function saveUser(user: Record<string, unknown>): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}