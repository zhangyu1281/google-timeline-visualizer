import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isWaffoConfigured } from '../_lib/waffo';
import { isExportPaid, isSessionPaid } from '../_lib/payment-store';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isWaffoConfigured()) {
    res.status(503).json({ configured: false, paid: false });
    return;
  }

  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
  const exportId = typeof req.query.exportId === 'string' ? req.query.exportId : '';

  if (!sessionId.startsWith('cs_') && exportId.length === 0) {
    res.status(400).json({ configured: true, paid: false, error: 'Missing sessionId or exportId' });
    return;
  }

  if (process.env.PAYMENT_BYPASS === 'true') {
    res.status(200).json({ configured: true, paid: true, bypass: true });
    return;
  }

  try {
    let paid = false;
    if (exportId.length > 0) {
      paid = await isExportPaid(exportId);
    }
    if (!paid && sessionId.startsWith('cs_')) {
      paid = await isSessionPaid(sessionId);
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ configured: true, paid });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Status check failed';
    console.error('payment/status failed:', message);
    res.status(500).json({ configured: true, paid: false, error: message });
  }
}
