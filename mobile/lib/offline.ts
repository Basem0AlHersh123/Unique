import NetInfo from "@react-native-community/netinfo";
import { getPendingNoteOps, clearPendingNoteOp } from "@/lib/cache";
import { apiFetch } from "@/lib/api";

/**
 * Returns true if the device currently has internet access.
 * This is a one-shot check, not a subscription.
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return true; // fail-open: assume online if detection fails
  }
}

/**
 * Subscribe to network changes. Returns an unsubscribe function.
 * Call this once from the root layout.
 */
export function subscribeToNetwork(onChange: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => {
    const online = !!(state.isConnected && state.isInternetReachable !== false);
    onChange(online);
  });
}

/**
 * Flush all pending offline note operations to the server.
 * Call this whenever the app comes back online.
 */
export async function flushPendingNotes(): Promise<void> {
  const ops = await getPendingNoteOps();
  if (ops.length === 0) return;

  for (const op of ops) {
    try {
      const res = await apiFetch(op.endpoint, {
        method: op.method,
        body: op.body,
      });
      if (res.success) {
        await clearPendingNoteOp(op.id);
      }
    } catch {
      // Keep in queue — will retry next time we come online
    }
  }
}
