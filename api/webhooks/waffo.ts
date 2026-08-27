import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyWebhook, WebhookEventType } from '@waffo/pancake-ts';
import { markExportPaid, markSessionPaid } from '../_lib/payment-store';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sessionIdFromPayload(data: Record<string, unknown>): string | null {
  const candidates = [
    data.checkoutSessionId,
    data.sessionId,
    data.checkout_session_id,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.startsWith('cs_')) return value;
  }
  return null;
}

function exportIdFromPayload(data: Record<string, unknown>): string | null {
  if (typeof data.orderMerchantExternalId === 'string' && data.orderMerchantExternalId.length > 0) {
    return data.orderMerchantExternalId;
  }
  const metadata = data.orderMetadata ?? data.metadata;
  if (metadata && typeof metadata === 'object' && metadata !== null) {
    const exportId = (metadata as Record<string, unknown>).exportId;
    if (typeof exportId === 'string' && exportId.length > 0) return exportId;
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const signature = req.headers['x-waffo-signature'];
  const rawBody = await readRawBody(req);

  try {
    const event = verifyWebhook(rawBody, typeof signature === 'string' ? signature : null);
    const data = (event.data ?? {}) as Record<string, unknown>;

    if (event.eventType === WebhookEventType.OrderCompleted) {
      const sessionId = sessionIdFromPayload(data);
      const exportId = exportIdFromPayload(data);
      if (sessionId) {
        await markSessionPaid(sessionId);
      }
      if (exportId) {
        await markExportPaid(exportId);
      }
      if (!sessionId && !exportId) {
        console.warn('webhooks/waffo: order.completed missing sessionId and exportId', data);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook verification failed';
    console.error('webhooks/waffo failed:', message);
    res.status(401).json({ error: message });
  }
}
