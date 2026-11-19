import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const FIRESTORE_PROJECT_ID = process.env.TITO_STUDIO_PROJECT_ID || 't2-content-studio';
const FIRESTORE_SETTINGS_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/agency_settings`;

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return String(val[0] || '');
  return String(val || '');
}

function parseBody(req: VercelRequest): Record<string, any> {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return typeof req.body === 'object' ? req.body : {};
}

function normalizeSlug(raw: string, fallback = 'default'): string {
  const cleaned = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

async function loadTenantConfig(): Promise<Record<string, any>> {
  const candidates = [
    path.join(process.cwd(), 'public', 'tenant-config.json'),
    path.join(process.cwd(), 'dist', 'tenant-config.json'),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
  }
  return {};
}

async function readShard(docId: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${FIRESTORE_SETTINGS_URL}/${encodeURIComponent(docId)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const doc: any = await res.json();
    const raw = doc?.fields?.stateJson?.stringValue;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeShard(docId: string, slug: string, shard: string, data: Record<string, any>): Promise<boolean> {
  try {
    const res = await fetch(`${FIRESTORE_SETTINGS_URL}/${encodeURIComponent(docId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          slug: { stringValue: slug },
          shard: { stringValue: shard },
          updatedAt: { stringValue: new Date().toISOString() },
          stateJson: { stringValue: JSON.stringify(data) },
        },
      }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const cfg = await loadTenantConfig();
  const body = parseBody(req);
  const slugFallback = normalizeSlug(cfg.slug || cfg.id || 'default');
  const slug = normalizeSlug(getParam(req.query?.slug || body.slug), slugFallback);
  const action = String(req.query?.action || body.action || 'init').trim();

  const catalog = (await readShard(`t2_erp_${slug}__catalog`)) || {};
  const paymobCfg = catalog.appCustomization?.paymentGateways?.paymob || {};

  if (action === 'init') {
    if (!paymobCfg.enabled || !paymobCfg.apiKey || !paymobCfg.integrationId || !paymobCfg.iframeId) {
      return res.status(400).json({
        ok: false,
        error: 'بوابة الدفع Paymob غير مفعلة أو غير مكتملة البيانات في الإعدادات.',
      });
    }

    const orderId = String(body.orderId || '').trim();
    const amountCents = Math.max(100, Math.round(Number(body.amountEgp || 0) * 100));
    const customer = body.customerDetails || {};
    const fullName = String(customer.name || 'Store Customer').trim();
    const firstName = fullName.split(/\s+/)[0] || 'Customer';
    const lastName = fullName.split(/\s+/).slice(1).join(' ') || 'Store';

    if (!orderId || !amountCents) {
      return res.status(400).json({ ok: false, error: 'بيانات الطلب والمبلغ مطلوبة' });
    }

    try {
      // 1. Auth Token
      const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: String(paymobCfg.apiKey).trim() }),
        signal: AbortSignal.timeout(7000),
      });
      const authData: any = await authRes.json().catch(() => ({}));
      if (!authRes.ok || !authData?.token) {
        return res.status(502).json({ ok: false, error: 'فشل مصادقة Paymob API Key' });
      }

      // 2. Order Registration
      const merchantOrderId = `${slug}__${orderId}__${Date.now()}`;
      const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authData.token,
          delivery_needed: false,
          amount_cents: amountCents,
          currency: 'EGP',
          merchant_order_id: merchantOrderId,
          items: [],
        }),
        signal: AbortSignal.timeout(7000),
      });
      const orderData: any = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok || !orderData?.id) {
        return res.status(502).json({ ok: false, error: 'تعذر تسجيل الطلب لدى Paymob' });
      }

      // 3. Payment Key
      const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authData.token,
          amount_cents: amountCents,
          expiration: 3600,
          order_id: orderData.id,
          billing_data: {
            apartment: 'NA',
            email: String(customer.email || 'customer@t2-store.app'),
            floor: 'NA',
            first_name: firstName,
            street: String(customer.address || 'Egypt').slice(0, 80),
            building: 'NA',
            phone_number: String(customer.phone || '01000000000'),
            shipping_method: 'PKG',
            postal_code: '00000',
            city: String(customer.shippingZone || 'Cairo'),
            country: 'EG',
            last_name: lastName,
            state: 'EG',
          },
          currency: 'EGP',
          integration_id: Number(paymobCfg.integrationId),
          lock_order_when_paid: true,
        }),
        signal: AbortSignal.timeout(7000),
      });
      const keyData: any = await keyRes.json().catch(() => ({}));
      if (!keyRes.ok || !keyData?.token) {
        return res.status(502).json({ ok: false, error: 'فشل إنشاء رابط الدفع من Paymob' });
      }

      const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${encodeURIComponent(
        String(paymobCfg.iframeId).trim()
      )}?payment_token=${encodeURIComponent(keyData.token)}`;

      return res.status(200).json({
        ok: true,
        iframeUrl,
        paymobOrderId: orderData.id,
      });
    } catch (err: any) {
      return res.status(502).json({ ok: false, error: err?.message || 'تعذر الاتصال ببوابة Paymob' });
    }
  }

  // Optional Paymob processed callback
  if (action === 'callback') {
    const obj = body?.obj || body;
    const receivedHmac = getParam(req.query?.hmac) || String(body?.hmac || '');
    if (paymobCfg.hmacSecret && receivedHmac && obj) {
      const concat = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order?.id,
        obj.owner,
        obj.pending,
        obj.source_data?.pan,
        obj.source_data?.sub_type,
        obj.source_data?.type,
        obj.success,
      ]
        .map((v) => String(v ?? ''))
        .join('');
      const expected = crypto
        .createHmac('sha512', String(paymobCfg.hmacSecret).trim())
        .update(concat)
        .digest('hex');
      if (expected !== receivedHmac) {
        return res.status(401).json({ ok: false, error: 'Invalid Paymob HMAC' });
      }
    }

    const merchantOrderId = String(obj?.order?.merchant_order_id || '');
    const orderIdPart = merchantOrderId.split('__')[1] || '';
    if (obj?.success === true && orderIdPart) {
      const ordersShard = (await readShard(`t2_erp_${slug}__orders`)) || {};
      const ordersList: any[] = Array.isArray(ordersShard.orders) ? ordersShard.orders : [];
      const updated = ordersList.map((o) =>
        String(o?.id) === orderIdPart ? { ...o, status: 'confirmed' } : o
      );
      await writeShard(`t2_erp_${slug}__orders`, slug, 'orders', {
        ...ordersShard,
        orders: updated,
      });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ ok: false, error: 'Unsupported Paymob action' });
}
