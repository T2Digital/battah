import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const FIRESTORE_PROJECT_ID = process.env.TITO_STUDIO_PROJECT_ID || 't2-content-studio';
const FIRESTORE_SETTINGS_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/agency_settings`;

const CARRIER_TEMPLATES: Record<string, { label: string; trackingTemplate: string }> = {
  manual: { label: 'شحن يدوي / مندوب خاص', trackingTemplate: '' },
  bosta: {
    label: 'بوسطة (Bosta)',
    trackingTemplate: 'https://bosta.co/tracking-shipment/?shipment-num={tracking}',
  },
  aramex: {
    label: 'أرامكس (Aramex)',
    trackingTemplate: 'https://www.aramex.com/track/results?ShipmentNumber={tracking}',
  },
  mylerz: {
    label: 'مايلرز (Mylerz)',
    trackingTemplate: 'https://mylerz.com/track?id={tracking}',
  },
  r2s: {
    label: 'R2S Logistics',
    trackingTemplate: 'https://r2slogistics.com/tracking?awb={tracking}',
  },
  turbo: {
    label: 'تربو (Turbo)',
    trackingTemplate: 'https://turbo-eg.com/track/{tracking}',
  },
};

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

function getSecret(): string {
  return (
    process.env.TENANT_AUTH_SECRET ||
    process.env.ADMIN_API_SECRET ||
    process.env.T2_REMOTE_API_KEY ||
    't2os-sovereign-tenant-secret-2026'
  );
}

function verifyTenantToken(token: string): Record<string, any> | null {
  try {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.exp || Date.now() > Number(data.exp)) return null;
    return data;
  } catch {
    return null;
  }
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
  const action = String(req.query?.action || body.action || 'create-shipment').trim();

  const authHeader = getParam(req.headers.authorization);
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const decoded = token ? verifyTenantToken(token) : null;
  if (!decoded || normalizeSlug(String(decoded.brandSlug || '')) !== slug) {
    return res.status(401).json({ ok: false, error: 'جلسة غير مصرح بها لشحن الطلبات' });
  }

  if (action !== 'create-shipment') {
    return res.status(400).json({ ok: false, error: 'إجراء شحن غير مدعوم' });
  }

  const orderId = String(body.orderId || '').trim();
  if (!orderId) {
    return res.status(400).json({ ok: false, error: 'رقم الطلب مطلوب' });
  }

  const [catalogRaw, ordersRaw] = await Promise.all([
    readShard(`t2_erp_${slug}__catalog`),
    readShard(`t2_erp_${slug}__orders`),
  ]);

  const catalog = catalogRaw || {};
  const ordersShard = ordersRaw || {};
  const ordersList: any[] = Array.isArray(ordersShard.orders) ? ordersShard.orders : [];
  const orderIdx = ordersList.findIndex((o) => String(o?.id) === orderId);
  if (orderIdx < 0) {
    return res.status(404).json({ ok: false, error: 'الطلب غير موجود' });
  }

  const order = ordersList[orderIdx];
  const carrierCfg = catalog.appCustomization?.shipping?.carrierIntegration || {};
  const provider = String(body.provider || carrierCfg.provider || 'manual').trim().toLowerCase();
  const carrierMeta = CARRIER_TEMPLATES[provider] || CARRIER_TEMPLATES.manual;
  const requestedCompany = String(body.shippingCompany || carrierMeta.label || '').trim();
  const manualTracking = String(body.trackingNumber || '').trim();
  const notes = String(body.notes ?? order.shippingNotes ?? '').trim();

  let trackingNumber = manualTracking;
  let mode: 'bosta_api' | 'manual_dispatch' = 'manual_dispatch';

  // Live Bosta API v2 creation when configured & enabled (and no manual tracking override passed)
  if (provider === 'bosta' && carrierCfg.enabled && carrierCfg.apiKey && !manualTracking) {
    try {
      const bostaPayload = {
        type: 10,
        specs: {
          packageType: 'Parcel',
          size: 'MEDIUM',
          packageDetails: {
            itemsCount: Array.isArray(order.items)
              ? order.items.reduce((sum: number, i: any) => sum + Number(i?.quantity || 1), 0)
              : 1,
            description: Array.isArray(order.items)
              ? order.items.map((i: any) => `${i?.productName} x${i?.quantity}`).join(', ').slice(0, 200)
              : `Order #${orderId}`,
          },
        },
        cod: order.paymentMethod === 'cod' ? Math.max(0, Number(order.totalAmount) || 0) : 0,
        dropOffAddress: {
          firstLine: String(order.customerAddress || 'العنوان غير محدد').slice(0, 250),
          city: String(order.shippingZone || 'Cairo'),
        },
        receiver: {
          firstName: String(order.customerName || 'عميل').split(/\s+/)[0] || 'عميل',
          lastName: String(order.customerName || 'المتجر').split(/\s+/).slice(1).join(' ') || 'المتجر',
          phone: String(order.customerPhone || ''),
        },
        businessReference: String(order.id),
        notes: notes || `طلب متجر #${order.id}`,
      };

      const bostaRes = await fetch('https://app.bosta.co/api/v2/deliveries', {
        method: 'POST',
        headers: {
          Authorization: String(carrierCfg.apiKey).trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bostaPayload),
        signal: AbortSignal.timeout(9000),
      });
      const bostaData: any = await bostaRes.json().catch(() => ({}));
      if (!bostaRes.ok) {
        return res.status(502).json({
          ok: false,
          error: bostaData?.message || 'فشل إنشاء البوليصة عبر بوسطة API — تحقق من المفتاح والبيانات.',
        });
      }
      trackingNumber = String(bostaData?.trackingNumber || bostaData?.data?.trackingNumber || bostaData?._id || '');
      mode = 'bosta_api';
    } catch (err: any) {
      return res.status(502).json({
        ok: false,
        error: err?.message || 'تعذر الاتصال بخادم بوسطة حالياً',
      });
    }
  }

  const trackingUrl =
    trackingNumber && carrierMeta.trackingTemplate
      ? carrierMeta.trackingTemplate.replace('{tracking}', encodeURIComponent(trackingNumber))
      : '';

  const updatedOrder = {
    ...order,
    status: 'shipped',
    carrierProvider: provider,
    shippingCompany: requestedCompany,
    trackingNumber: trackingNumber || order.trackingNumber || '',
    ...(trackingUrl ? { trackingUrl } : {}),
    shippingNotes: notes,
  };

  const nextOrders = [...ordersList];
  nextOrders[orderIdx] = updatedOrder;

  const saved = await writeShard(`t2_erp_${slug}__orders`, slug, 'orders', {
    ...ordersShard,
    orders: nextOrders,
  });

  if (!saved) {
    return res.status(500).json({ ok: false, error: 'تعذر تحديث بيانات الشحن في قاعدة البيانات' });
  }

  return res.status(200).json({ ok: true, mode, order: updatedOrder });
}
