import AsyncStorage from "@react-native-async-storage/async-storage";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const DEFAULT_TTL = 1000 * 60 * 60; // 1 hour

export async function cacheSet<T>(key: string, data: T, ttl = DEFAULT_TTL): Promise<void> {
  const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
  await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache_${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > entry.ttl) {
      await AsyncStorage.removeItem(`cache_${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheRemove(key: string): Promise<void> {
  await AsyncStorage.removeItem(`cache_${key}`);
}

export async function cacheClear(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k) => k.startsWith("cache_"));
  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys);
  }
}

// Offline lesson storage
export async function saveLessonOffline(lessonId: string, data: unknown): Promise<void> {
  await AsyncStorage.setItem(`offline_lesson_${lessonId}`, JSON.stringify(data));
}

export async function getOfflineLesson(lessonId: string): Promise<unknown | null> {
  try {
    const raw = await AsyncStorage.getItem(`offline_lesson_${lessonId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function removeOfflineLesson(lessonId: string): Promise<void> {
  await AsyncStorage.removeItem(`offline_lesson_${lessonId}`);
}

export async function getOfflineLessonIds(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys
    .filter((k) => k.startsWith("offline_lesson_"))
    .map((k) => k.replace("offline_lesson_", ""));
}

export async function clearOfflineLessons(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const offlineKeys = keys.filter((k) => k.startsWith("offline_lesson_"));
  if (offlineKeys.length > 0) {
    await AsyncStorage.multiRemove(offlineKeys);
  }
}
