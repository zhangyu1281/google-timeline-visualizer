import { kv } from '@vercel/kv';

const PAID_PREFIX = 'waffo:paid:';
const TTL_SECONDS = 72 * 60 * 60;

/** Dev-only fallback when Vercel KV is not linked. */
const memoryPaid = new Map<string, number>();

function kvEnabled(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function purgeExpiredMemory(): void {
  const now = Date.now();
  for (const [key, expiresAt] of memoryPaid) {
    if (expiresAt <= now) memoryPaid.delete(key);
  }
}

export async function markSessionPaid(sessionId: string): Promise<void> {
  if (kvEnabled()) {
    await kv.set(`${PAID_PREFIX}${sessionId}`, '1', { ex: TTL_SECONDS });
    return;
  }
  purgeExpiredMemory();
  memoryPaid.set(sessionId, Date.now() + TTL_SECONDS * 1000);
}

export async function isSessionPaid(sessionId: string): Promise<boolean> {
  if (kvEnabled()) {
    const value = await kv.get<string>(`${PAID_PREFIX}${sessionId}`);
    return value === '1';
  }
  purgeExpiredMemory();
  const expiresAt = memoryPaid.get(sessionId);
  return expiresAt !== undefined && expiresAt > Date.now();
}
