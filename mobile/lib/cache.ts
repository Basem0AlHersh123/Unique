import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Generic cache ─────────────────────────────────────────────────────────────
// Keys are stored as "cache__{key}". Data never expires automatically because
// offline users should always see their last-known data.
// Uses AsyncStorage instead of SecureStore to avoid the 2048 byte value limit.

export async function cacheSet<T>(key: string, data: T): Promise<void> {
  try {
    const value = JSON.stringify({ data, savedAt: Date.now() });
    await AsyncStorage.setItem(`cache__${key}`, value);
  } catch {
    // Cache write failure is non-fatal — silently ignore
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache__${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data as T;
  } catch {
    return null;
  }
}

export async function cacheRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`cache__${key}`);
  } catch {}
}

// ─── Offline note sync queue ───────────────────────────────────────────────────
// When the user creates or edits a note while offline, we store it in a pending
// queue. When the app comes back online, the queue is flushed automatically.

export interface PendingNoteOp {
  id: string;                  // UUID generated client-side
  serverId?: string;           // set after first successful sync
  method: "POST" | "PATCH" | "DELETE";
  endpoint: string;
  body: Record<string, unknown>;
  createdAt: number;
}

const PENDING_NOTES_KEY = "offline__pending_notes";

export async function getPendingNoteOps(): Promise<PendingNoteOp[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_NOTES_KEY);
    return raw ? (JSON.parse(raw) as PendingNoteOp[]) : [];
  } catch {
    return [];
  }
}

export async function addPendingNoteOp(op: PendingNoteOp): Promise<void> {
  try {
    const existing = await getPendingNoteOps();
    // If editing the same note again while still offline, replace the pending edit
    const filtered = existing.filter(
      (e) => !(e.id === op.id && e.method === "PATCH")
    );
    await AsyncStorage.setItem(
      PENDING_NOTES_KEY,
      JSON.stringify([...filtered, op])
    );
  } catch {}
}

export async function clearPendingNoteOp(id: string): Promise<void> {
  try {
    const existing = await getPendingNoteOps();
    const filtered = existing.filter((e) => e.id !== id);
    await AsyncStorage.setItem(PENDING_NOTES_KEY, JSON.stringify(filtered));
  } catch {}
}

export async function clearAllPendingNoteOps(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_NOTES_KEY);
  } catch {}
}
