import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, ENDPOINTS } from "@/constants/config";
import { getRefreshToken, saveRefreshToken } from "@/lib/auth";

type AuthListener = () => void;
const authListeners: AuthListener[] = [];
export function onAuthExpired(fn: AuthListener) {
  authListeners.push(fn);
  return () => {
    const i = authListeners.indexOf(fn);
    if (i > -1) authListeners.splice(i, 1);
  };
}
function notifyAuthExpired() {
  authListeners.forEach((fn) => fn());
}

const ACCESS_TOKEN_KEY = "unique_access_token";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "X-Mobile-Key": process.env.EXPO_PUBLIC_MOBILE_API_KEY ?? "",
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (
      err.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes(ENDPOINTS.REFRESH)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await getRefreshToken();
        const res = await axios.post(
          `${API_BASE_URL}${ENDPOINTS.REFRESH}`,
          {},
          {
            headers: storedRefreshToken
              ? { Authorization: `Refresh ${storedRefreshToken}` }
              : {},
          }
        );
        const { accessToken } = res.data.data;
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
        if (res.data.data.refreshToken) {
          await saveRefreshToken(res.data.data.refreshToken);
        }
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        const { clearTokens } = await import("@/lib/auth");
        await clearTokens();
        notifyAuthExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(
  url: string,
  options?: ApiFetchOptions
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await apiClient({
      url,
      method: options?.method ?? "GET",
      data: options?.body,
      headers: options?.headers,
    });
    return res.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.error) {
      throw new Error(err.response.data.error);
    }
    throw new Error("حدث خطأ في الاتصال بالخادم");
  }
}

export default apiClient;
