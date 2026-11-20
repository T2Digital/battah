import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const FIRESTORE_PROJECT_ID = process.env.TITO_STUDIO_PROJECT_ID || 't2-content-studio';
const FIRESTORE_SETTINGS_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/agency_settings`;

const SHARD_KEYS = {
  catalog: [
    'products',
    'broadcasts',
    'discountCodes',
    'storefrontSettings',
    'settings',
    'counters',
    'appCustomization',
  ] as const,
  orders: ['orders', 'notifications'] as const,
  sales: ['dailySales', 'treasury', 'expenses', 'dailyReview'] as const,
  ops: [
    'employees',
    'advances',
    'attendance',
    'payroll',
    'suppliers',
    'purchaseOrders',
    'payments',
    'stockTransfers',
    'users',
  ] as const,
};

const DEFAULT_SETTINGS = {
  enableIPRestriction: false,
  enableTimeRestriction: false,
  workStartTime: '09:00',
  workEndTime: '23:00',
};

let cachedTenantConfig: Record<string, any> | null = null;

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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

async function loadTenantConfig(req: VercelRequest): Promise<Record<string, any>> {
  if (cachedTenantConfig) return cachedTenantConfig;

  const candidates = [
    path.join(process.cwd(), 'public', 'tenant-config.json'),
    path.join(process.cwd(), 'dist', 'tenant-config.json'),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          cachedTenantConfig = parsed;
          return parsed;
        }
      }
    } catch {}
  }

  try {
    const host = getParam(req.headers['x-forwarded-host'] || req.headers.host);
    if (host) {
      const proto = getParam(req.headers['x-forwarded-proto']) || (host.includes('localhost') ? 'http' : 'https');
      const res = await fetch(`${proto}://${host}/tenant-config.json`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const parsed: any = await res.json();
        if (parsed && typeof parsed === 'object') {
          cachedTenantConfig = parsed;
          return parsed;
        }
      }
    }
  } catch {}

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

function seedProductsFromConfig(cfg: Record<string, any>): any[] {
  const catalog = Array.isArray(cfg?.productsCatalog) ? cfg.productsCatalog : [];
  const defaultImg = String(cfg?.logoUrl || '').trim();
  const cfgBranches = Array.isArray(cfg?.appCustomization?.activeBranches) && cfg.appCustomization.activeBranches.length > 0
    ? cfg.appCustomization.activeBranches
    : null;
  const buildDefaultStock = () => {
    if (cfgBranches) {
      const s: Record<string, number> = {};
      cfgBranches.forEach((b: any, i: number) => {
        if (b?.key) s[b.key] = i === 0 ? 25 : 10;
      });
      return s;
    }
    return { main: 25 };
  };
  return catalog.map((item: any, idx: number) => {
    const price = Number(item.numericPrice || String(item.price || '').replace(/[^\d.]/g, '')) || 500;
    const images = Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : item.imageUrl
        ? [item.imageUrl]
        : defaultImg
          ? [defaultImg]
          : [];
    const cat = item.category || cfg?.businessType || 'عام';
    return {
      id: idx + 1,
      name: item.name || `منتج ${idx + 1}`,
      sku: item.sku || `SKU-${idx + 101}`,
      category: cat,
      subCategory: item.subCategory || cat,
      mainCategory: item.mainCategory || cat,
      brand: item.brand || cfg?.name || '',
      description: item.description || '',
      purchasePrice: Math.round(price * 0.7),
      sellingPrice: price,
      stock: item.stock || buildDefaultStock(),
      imageUrl: item.imageUrl || images[0] || defaultImg,
      images,
    };
  });
}

function normalizePhoneMatch(a: string, b: string): boolean {
  const trimA = String(a || '').trim();
  const trimB = String(b || '').trim();
  if (!trimA || !trimB) return false;
  if (trimA === trimB) return true;
  const digitsA = trimA.replace(/\D/g, '');
  const digitsB = trimB.replace(/\D/g, '');
  if (!digitsA || !digitsB) return false;
  if (digitsA === digitsB) return true;
  if (digitsA.length >= 10 && digitsB.length >= 10) {
    return digitsA.slice(-10) === digitsB.slice(-10);
  }
  return false;
}

function getCreatedAtMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return new Date(val).getTime() || 0;
  if (typeof val?.seconds === 'number') return val.seconds * 1000;
  return 0;
}

function pickKeys(source: Record<string, any>, keys: readonly string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of keys) {
    if (key in source && source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return out;
}

function sanitizePublicAppCustomization(raw: Record<string, any> | null | undefined): Record<string, any> | null {
  if (!raw || typeof raw !== 'object') return null;
  const clone: Record<string, any> = { ...raw };
  if (clone.shipping && typeof clone.shipping === 'object') {
    const s = { ...clone.shipping };
    if (s.carrierIntegration && typeof s.carrierIntegration === 'object') {
      s.carrierIntegration = {
        provider: s.carrierIntegration.provider || 'manual',
        enabled: Boolean(s.carrierIntegration.enabled),
      };
    }
    clone.shipping = s;
  }
  if (clone.paymentGateways && typeof clone.paymentGateways === 'object') {
    const pg = { ...clone.paymentGateways };
    if (pg.paymob && typeof pg.paymob === 'object') {
      const p = pg.paymob;
      pg.paymob = {
        enabled: Boolean(p.enabled),
        configured: Boolean(p.apiKey && p.integrationId && p.iframeId),
      };
    }
    clone.paymentGateways = pg;
  }
  return clone;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const cfg = await loadTenantConfig(req);
  const body = parseBody(req);
  const slugFallback = normalizeSlug(cfg.slug || cfg.id || 'default');
  const slug = normalizeSlug(getParam(req.query?.slug || body.slug), slugFallback);
  const action = String(req.query?.action || body.action || '').trim();

  if (req.method === 'GET') {
    if (action === 'my-orders') {
      const phone = getParam(req.query?.phone).trim();
      if (!phone) {
        return res.status(400).json({ ok: false, error: 'رقم الهاتف مطلوب' });
      }
      const ordersShard = await readShard(`t2_erp_${slug}__orders`);
      const allOrders: any[] = Array.isArray(ordersShard?.orders) ? ordersShard.orders : [];
      const matching = allOrders
        .filter((o) => normalizePhoneMatch(String(o?.customerPhone || ''), phone))
        .sort((a, b) => (getCreatedAtMs(b?.createdAt || b?.timestamp) - getCreatedAtMs(a?.createdAt || a?.timestamp)));
      return res.status(200).json({ ok: true, orders: matching });
    }

    const authHeader = getParam(req.headers.authorization);
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const decoded = token ? verifyTenantToken(token) : null;
    const isAuthorizedAdmin = Boolean(decoded && normalizeSlug(String(decoded.brandSlug || '')) === slug);

    if (!isAuthorizedAdmin) {
      const catalog = (await readShard(`t2_erp_${slug}__catalog`)) || {};
      const products =
        Array.isArray(catalog.products) && catalog.products.length > 0
          ? catalog.products
          : seedProductsFromConfig(cfg);
      const mergedCustomization = {
        ...(cfg.appCustomization || {}),
        ...(catalog.appCustomization || {}),
      };
      return res.status(200).json({
        ok: true,
        state: {
          products,
          broadcasts: Array.isArray(catalog.broadcasts) ? catalog.broadcasts : [],
          discountCodes: Array.isArray(catalog.discountCodes) ? catalog.discountCodes : [],
          storefrontSettings: catalog.storefrontSettings || {
            featuredProductIds: [],
            newArrivalProductIds: [],
          },
          settings: catalog.settings || DEFAULT_SETTINGS,
          appCustomization: Object.keys(mergedCustomization).length > 0
            ? sanitizePublicAppCustomization(mergedCustomization)
            : null,
        },
      });
    }

    const [catalogRaw, ordersRaw, salesRaw, opsRaw] = await Promise.all([
      readShard(`t2_erp_${slug}__catalog`),
      readShard(`t2_erp_${slug}__orders`),
      readShard(`t2_erp_${slug}__sales`),
      readShard(`t2_erp_${slug}__ops`),
    ]);

    const catalog = catalogRaw || {};
    const ordersShard = ordersRaw || {};
    const salesShard = salesRaw || {};
    const opsShard = opsRaw || {};

    const products =
      Array.isArray(catalog.products) && catalog.products.length > 0
        ? catalog.products
        : seedProductsFromConfig(cfg);
    const mergedAdminCustomization = {
      ...(cfg.appCustomization || {}),
      ...(catalog.appCustomization || {}),
    };

    return res.status(200).json({
      ok: true,
      state: {
        products,
        broadcasts: Array.isArray(catalog.broadcasts) ? catalog.broadcasts : [],
        discountCodes: Array.isArray(catalog.discountCodes) ? catalog.discountCodes : [],
        storefrontSettings: catalog.storefrontSettings || {
          featuredProductIds: [],
          newArrivalProductIds: [],
        },
        settings: catalog.settings || DEFAULT_SETTINGS,
        appCustomization: Object.keys(mergedAdminCustomization).length > 0 ? mergedAdminCustomization : null,
        counters: catalog.counters || { orderCount: 0 },
        orders: Array.isArray(ordersShard.orders) ? ordersShard.orders : [],
        notifications: Array.isArray(ordersShard.notifications) ? ordersShard.notifications : [],
        dailySales: Array.isArray(salesShard.dailySales) ? salesShard.dailySales : [],
        treasury: Array.isArray(salesShard.treasury) ? salesShard.treasury : [],
        expenses: Array.isArray(salesShard.expenses) ? salesShard.expenses : [],
        dailyReview: Array.isArray(salesShard.dailyReview) ? salesShard.dailyReview : [],
        employees: Array.isArray(opsShard.employees) ? opsShard.employees : [],
        advances: Array.isArray(opsShard.advances) ? opsShard.advances : [],
        attendance: Array.isArray(opsShard.attendance) ? opsShard.attendance : [],
        payroll: Array.isArray(opsShard.payroll) ? opsShard.payroll : [],
        suppliers: Array.isArray(opsShard.suppliers) ? opsShard.suppliers : [],
        purchaseOrders: Array.isArray(opsShard.purchaseOrders) ? opsShard.purchaseOrders : [],
        payments: Array.isArray(opsShard.payments) ? opsShard.payments : [],
        stockTransfers: Array.isArray(opsShard.stockTransfers) ? opsShard.stockTransfers : [],
        users: Array.isArray(opsShard.users) ? opsShard.users : [],
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  // Public storefront order creation
  if (action === 'create-order') {
    const customerDetails = body.customerDetails || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const paymentMethod =
      body.paymentMethod === 'electronic'
        ? 'electronic'
        : body.paymentMethod === 'paymob'
          ? 'paymob'
          : 'cod';
    const paymentProofUrl = body.paymentProofUrl ? String(body.paymentProofUrl) : undefined;
    const locationLink = body.locationLink ? String(body.locationLink) : undefined;
    const shippingZone = body.shippingZone ? String(body.shippingZone).trim() : undefined;
    const discountCodeInput = String(body.discountCode || '').trim().toUpperCase();
    const numericSubtotal = Number(body.subtotal ?? body.totalAmount ?? 0);

    if (!customerDetails?.name || !customerDetails?.phone || !customerDetails?.address || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'بيانات العميل والمنتجات مطلوبة لإتمام الطلب' });
    }

    const [catalogRaw, ordersRaw] = await Promise.all([
      readShard(`t2_erp_${slug}__catalog`),
      readShard(`t2_erp_${slug}__orders`),
    ]);

    const catalog = catalogRaw || {};
    const ordersShard = ordersRaw || {};
    const existingOrders: any[] = Array.isArray(ordersShard.orders) ? ordersShard.orders : [];
    const existingNotifications: any[] = Array.isArray(ordersShard.notifications) ? ordersShard.notifications : [];

    // Compute dynamic shipping fee from catalog/brand config
    const pg: any = catalog.appCustomization?.paymentGateways || cfg.appCustomization?.paymentGateways || {};
    if (paymentMethod === 'cod' && pg.enableCod === false) {
      return res.status(400).json({ ok: false, error: 'الدفع عند الاستلام غير متاح حالياً، يرجى اختيار طريقة دفع أخرى.' });
    }
    const shippingCfg: any = catalog.appCustomization?.shipping || cfg.appCustomization?.shipping || {};
    const defaultFee = Math.max(0, Number(shippingCfg.defaultFee ?? 50) || 0);
    const freeThreshold = Math.max(0, Number(shippingCfg.freeShippingThreshold ?? 0) || 0);
    let deliveryFee = defaultFee;
    if (freeThreshold > 0 && numericSubtotal >= freeThreshold) {
      deliveryFee = 0;
    } else if (shippingZone && Array.isArray(shippingCfg.zones)) {
      const matchedZone = shippingCfg.zones.find((z: any) => String(z?.name || '').trim() === shippingZone);
      if (matchedZone) deliveryFee = Math.max(0, Number(matchedZone.fee ?? defaultFee) || 0);
    }

    let discountAmount = 0;
    let validDiscountInfo: Record<string, any> = {};
    if (discountCodeInput) {
      const codes: any[] = Array.isArray(catalog.discountCodes) ? catalog.discountCodes : [];
      const found = codes.find((c) => String(c?.code || '').trim().toUpperCase() === discountCodeInput);
      const today = new Date().toISOString().split('T')[0];
      if (found && found.isActive && (!found.expiresAt || today <= found.expiresAt) && numericSubtotal >= Number(found.minPurchase || 0)) {
        discountAmount =
          found.type === 'fixed'
            ? Number(found.value || 0)
            : (numericSubtotal * Number(found.value || 0)) / 100;
        validDiscountInfo = { discountCode: discountCodeInput, discountAmount };
      }
    }
    const finalTotal = Math.max(0, numericSubtotal - discountAmount) + deliveryFee;

    const orderCount = Math.max(Number(catalog.counters?.orderCount || 0), existingOrders.length) + 1;
    const orderId = String(orderCount).padStart(3, '0');
    const todayDate = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const newOrder = {
      id: orderId,
      date: todayDate,
      timestamp: nowIso,
      createdAt: nowMs,
      customerName: String(customerDetails.name).trim(),
      customerPhone: String(customerDetails.phone).trim(),
      customerAddress: String(customerDetails.address).trim(),
      items,
      deliveryFee,
      ...(shippingZone ? { shippingZone } : {}),
      totalAmount: finalTotal,
      status: 'pending',
      paymentMethod,
      ...(paymentProofUrl ? { paymentProofUrl } : {}),
      ...(locationLink ? { locationLink } : {}),
      ...validDiscountInfo,
    };

    const newNotification = {
      id: `notif_${nowMs}_${orderId}`,
      date: todayDate,
      createdAt: nowMs,
      message: `طلب جديد #${orderId} من ${newOrder.customerName} بقيمة ${finalTotal.toLocaleString('ar-EG')} ج.م`,
      read: false,
      orderId,
      type: 'order',
      targetGroup: 'admin',
    };

    const nextOrders = [newOrder, ...existingOrders];
    const nextNotifications = [newNotification, ...existingNotifications];
    const nextCatalog = {
      ...catalog,
      ...(Array.isArray(catalog.products) && catalog.products.length > 0
        ? {}
        : { products: seedProductsFromConfig(cfg) }),
      counters: { ...(catalog.counters || {}), orderCount },
    };

    const [ordersOk, catalogOk] = await Promise.all([
      writeShard(`t2_erp_${slug}__orders`, slug, 'orders', {
        ...ordersShard,
        orders: nextOrders,
        notifications: nextNotifications,
      }),
      writeShard(`t2_erp_${slug}__catalog`, slug, 'catalog', nextCatalog),
    ]);

    if (!ordersOk || !catalogOk) {
      return res.status(500).json({ ok: false, error: 'تعذر حفظ الطلب في قاعدة البيانات' });
    }

    // Best-effort Jarvis webhook + direct T2 Agent fallback (non-fatal if Render is offline/suspended)
    const ezZelBase = String(process.env.VITE_EZZEL_API_URL || cfg.ezZelApiBase || 'https://ez-zel.onrender.com').replace(/\/$/, '');
    const agentBase = String(process.env.T2_AGENT_API_URL || cfg.t2AgentApiBase || '').replace(/\/$/, '');
    const eventPayload = {
      source: 'battah',
      eventType: 'order_created',
      brandId: slug,
      orderId,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      amountEgp: finalTotal,
      summary: `طلب شراء جديد من ${newOrder.customerName} بقيمة ${finalTotal} ج.م`,
    };
    let webhookDispatched = false;
    try {
      const hookRes = await fetch(`${ezZelBase}/api/webhooks/tenant-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
        signal: AbortSignal.timeout(1500),
      });
      if (hookRes.ok) webhookDispatched = true;
    } catch {}

    if (!webhookDispatched && agentBase) {
      try {
        const agentRes = await fetch(`${agentBase}/api/webhooks/order-created`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventPayload),
          signal: AbortSignal.timeout(1500),
        });
        if (agentRes.ok) webhookDispatched = true;
      } catch {}
    }

    try {
      const prevQueue: any[] = Array.isArray(ordersShard.pendingOrderWebhooks)
        ? ordersShard.pendingOrderWebhooks
        : [];
      const nextQueue = webhookDispatched
        ? prevQueue
        : [...prevQueue, { ...eventPayload, createdAt: nowIso }].slice(-50);
      await writeShard(`t2_erp_${slug}__orders`, slug, 'orders', {
        ...ordersShard,
        orders: nextOrders,
        notifications: nextNotifications,
        lastOrderWebhook: {
          orderId,
          customerName: newOrder.customerName,
          customerPhone: newOrder.customerPhone,
          amountEgp: finalTotal,
          dispatched: webhookDispatched,
          timestamp: nowIso,
        },
        pendingOrderWebhooks: nextQueue,
      });
    } catch {}

    return res.status(200).json({ ok: true, order: newOrder, notification: newNotification, webhookDispatched });
  }

  // Admin ERP state sync (Bearer required)
  const authHeader = getParam(req.headers.authorization);
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const decoded = verifyTenantToken(token);
  if (!decoded || normalizeSlug(String(decoded.brandSlug || '')) !== slug) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: valid tenant token required' });
  }

  const incoming = (body.state && typeof body.state === 'object' ? body.state : body) as Record<string, any>;
  const cleaned: Record<string, any> = { ...incoming };
  delete cleaned.toasts;

  const shardEntries: Array<{
    name: keyof typeof SHARD_KEYS;
    patch: Record<string, any>;
    alwaysPreserveCounters?: boolean;
  }> = [
    { name: 'catalog', patch: pickKeys(cleaned, SHARD_KEYS.catalog), alwaysPreserveCounters: true },
    { name: 'orders', patch: pickKeys(cleaned, SHARD_KEYS.orders) },
    { name: 'sales', patch: pickKeys(cleaned, SHARD_KEYS.sales) },
    { name: 'ops', patch: pickKeys(cleaned, SHARD_KEYS.ops) },
  ];

  const writes: Promise<boolean>[] = shardEntries
    .filter(({ patch }) => Object.keys(patch).length > 0)
    .map(async ({ name, patch, alwaysPreserveCounters }) => {
      const docId = `t2_erp_${slug}__${name}`;
      const isPartial = Object.keys(patch).length < SHARD_KEYS[name].length;
      if (isPartial || alwaysPreserveCounters) {
        const existing = (await readShard(docId)) || {};
        const merged = {
          ...existing,
          ...patch,
          ...(alwaysPreserveCounters && !('counters' in patch) && existing.counters
            ? { counters: existing.counters }
            : {}),
        };
        return writeShard(docId, slug, name, merged);
      }
      return writeShard(docId, slug, name, patch);
    });

  const results = await Promise.all(writes);
  if (results.some((ok) => !ok)) {
    return res.status(500).json({ ok: false, error: 'فشل حفظ بعض بيانات النظام في Firestore' });
  }

  return res.status(200).json({ ok: true, updatedAt: new Date().toISOString() });
}
