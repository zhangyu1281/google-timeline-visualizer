import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWaffoClient, isWaffoConfigured, siteOrigin, waffoCheckoutLanguage } from '../_lib/waffo';

interface CreateCheckoutBody {
  exportId?: string;
  locale?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isWaffoConfigured()) {
    res.status(503).json({ error: 'Payment is not configured', configured: false });
    return;
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as CreateCheckoutBody;
  const exportId = typeof body.exportId === 'string' && body.exportId.length > 0
    ? body.exportId.slice(0, 128)
    : crypto.randomUUID();

  try {
    const client = getWaffoClient();
    const session = await client.checkout.createSession({
      productId: process.env.WAFFO_PRODUCT_ID!,
      currency: 'USD',
      language: waffoCheckoutLanguage(body.locale),
      successUrl: `${siteOrigin()}/payment/complete.html?exportId=${encodeURIComponent(exportId)}`,
      orderMerchantExternalId: exportId,
      metadata: { exportId, source: 'timeline-visualizer-web' },
      expiresInSeconds: 2700,
    });

    res.status(200).json({
      configured: true,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      exportId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    console.error('checkout/create failed:', message);
    res.status(500).json({ error: message, configured: true });
  }
}
