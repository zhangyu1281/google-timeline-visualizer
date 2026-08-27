import { getWaffoClient } from './waffo';

/** Waffo may use underscores in cs IDs while URLs show hyphens. */
export function sessionIdLookupKeys(sessionId: string): string[] {
  const keys = new Set<string>([sessionId]);
  keys.add(sessionId.replace(/-/g, '_'));
  keys.add(sessionId.replace(/_/g, '-'));
  return [...keys];
}

interface PaymentsQueryResult {
  payments: Array<{ id: string; status: string }>;
}

interface CheckoutSessionQueryResult {
  checkoutSession: { id: string; status: string } | null;
}

interface OnetimeOrdersQueryResult {
  onetimeOrders: Array<{ id: string; status: string }>;
}

const COMPLETED_SESSION_STATUSES = new Set(['completed', 'complete', 'paid', 'succeeded']);

export async function verifyExportPaidWithWaffo(exportId: string): Promise<boolean> {
  const client = getWaffoClient();

  const paymentsResult = await client.graphql.query<PaymentsQueryResult>({
    query: `query VerifyExportPayment($ref: String!) {
      payments(
        filter: { orderMerchantExternalId: { eq: $ref }, status: { eq: "succeeded" } }
        limit: 1
      ) {
        id
        status
      }
    }`,
    variables: { ref: exportId },
  });
  if ((paymentsResult.data?.payments?.length ?? 0) > 0) return true;

  const ordersResult = await client.graphql.query<OnetimeOrdersQueryResult>({
    query: `query VerifyExportOrder($ref: String!) {
      onetimeOrders(
        filter: { orderMerchantExternalId: { eq: $ref }, status: { eq: "completed" } }
        limit: 1
      ) {
        id
        status
      }
    }`,
    variables: { ref: exportId },
  });
  return (ordersResult.data?.onetimeOrders?.length ?? 0) > 0;
}

export async function verifySessionPaidWithWaffo(sessionId: string): Promise<boolean> {
  const client = getWaffoClient();

  for (const id of sessionIdLookupKeys(sessionId)) {
    const result = await client.graphql.query<CheckoutSessionQueryResult>({
      query: `query VerifyCheckoutSession($sessionId: ID!) {
        checkoutSession(id: $sessionId) {
          id
          status
        }
      }`,
      variables: { sessionId: id },
    });
    const status = result.data?.checkoutSession?.status?.toLowerCase();
    if (status && COMPLETED_SESSION_STATUSES.has(status)) return true;
  }
  return false;
}
