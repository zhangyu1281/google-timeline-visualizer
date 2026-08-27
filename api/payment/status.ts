import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isExportPaid, isSessionPaid, markExportPaid, markSessionPaid } from '../_lib/payment-store';
import { isWaffoConfigured } from '../_lib/waffo';
import {
  sessionIdLookupKeys,
  verifyExportPaidWithWaffo,
  verifySessionPaidWithWaffo,
} from '../_lib/waffo-payment-verify';

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
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ configured: true, paid: true, bypass: true });
    return;
  }

  try {
    let paid = false;

    if (exportId.length > 0) {
      paid = await isExportPaid(exportId);
    }
    if (!paid && sessionId.startsWith('cs_')) {
      for (const key of sessionIdLookupKeys(sessionId)) {
        if (await isSessionPaid(key)) {
          paid = true;
          break;
        }
      }
    }

    if (!paid) {
      if (exportId.length > 0 && await verifyExportPaidWithWaffo(exportId)) {
        await markExportPaid(exportId);
        if (sessionId.startsWith('cs_')) {
          for (const key of sessionIdLookupKeys(sessionId)) {
            await markSessionPaid(key);
          }
        }
        paid = true;
      } else if (sessionId.startsWith('cs_') && await verifySessionPaidWithWaffo(sessionId)) {
        for (const key of sessionIdLookupKeys(sessionId)) {
          await markSessionPaid(key);
        }
        if (exportId.length > 0) await markExportPaid(exportId);
        paid = true;
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ configured: true, paid });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Status check failed';
    console.error('payment/status failed:', message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({ configured: true, paid: false, error: message });
  }
}
