import { kv } from '@vercel/kv';

const PAID_SESSION_PREFIX = 'waffo:paid:';
const PAID_EXPORT_PREFIX = 'waffo:paid:export:';
const TTL_SECONDS = 72 * 60 * 60;

/** Dev-only fallback when Vercel KV is not linked. */
const memoryPaidSessions = new Map<string, number>();
const memoryPaidExports = new Map<string, number>();

function kvEnabled(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function purgeExpiredMemory(map: Map<string, number>): void {
  const now = Date.now();
  for (const [key, expiresAt] of map) {
    if (expiresAt <= now) map.delete(key);
  }
}

export async function markSessionPaid(sessionId: string): Promise<void> {
  if (kvEnabled()) {
    await kv.set(`${PAID_SESSION_PREFIX}${sessionId}`, '1', { ex: TTL_SECONDS });
    return;
  }
  purgeExpiredMemory(memoryPaidSessions);
  memoryPaidSessions.set(sessionId, Date.now() + TTL_SECONDS * 1000);
}

export async function isSessionPaid(sessionId: string): Promise<boolean> {
  if (kvEnabled()) {
    const value = await kv.get<string>(`${PAID_SESSION_PREFIX}${sessionId}`);
    return value === '1';
  }
  purgeExpiredMemory(memoryPaidSessions);
  const expiresAt = memoryPaidSessions.get(sessionId);
  return expiresAt !== undefined && expiresAt > Date.now();
}

export async function markExportPaid(exportId: string): Promise<void> {
  if (kvEnabled()) {
    await kv.set(`${PAID_EXPORT_PREFIX}${exportId}`, '1', { ex: TTL_SECONDS });
    return;
  }
  purgeExpiredMemory(memoryPaidExports);
  memoryPaidExports.set(exportId, Date.now() + TTL_SECONDS * 1000);
}

export async function isExportPaid(exportId: string): Promise<boolean> {
  if (kvEnabled()) {
    const value = await kv.get<string>(`${PAID_EXPORT_PREFIX}${exportId}`);
    return value === '1';
  }
  purgeExpiredMemory(memoryPaidExports);
  const expiresAt = memoryPaidExports.get(exportId);
  return expiresAt !== undefined && expiresAt > Date.now();
}
