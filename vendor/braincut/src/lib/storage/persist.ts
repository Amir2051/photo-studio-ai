// Browser storage is evictable by default: the browser may drop an origin's
// IndexedDB/OPFS under storage pressure, and every proxy and converted copy
// would be gone with it. Proxies are derived data (they can be regenerated),
// but regenerating a multi-hour 4K proxy is expensive, so ask once, on
// startup, for persistent storage. The browser decides opaquely; nothing
// here depends on the answer.
let requested = false;

export async function requestPersistentStorage(): Promise<boolean> {
  if (requested) return true;
  requested = true;
  try {
    if (typeof navigator === 'undefined') return false;
    const storage = navigator.storage as StorageManager | undefined;
    if (!storage || typeof storage.persist !== 'function') return false;
    if (typeof storage.persisted === 'function' && (await storage.persisted())) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}
