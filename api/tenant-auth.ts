import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const FIRESTORE_PROJECT_ID = process.env.TITO_STUDIO_PROJECT_ID || 't2-content-studio';
const FIRESTORE_SETTINGS_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/agency_settings`;

const FULL_ADMIN_PERMISSIONS = [
  'daily-sales',
  'store-management',
  'treasury',
  'expenses',
  'employees',
  'payroll',
  'advances',
  'attendance',
  'suppliers',
  'purchasing',
  'daily-review',
  'orders',
];

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

export function normalizeSlug(raw: string, fallback = 'default'): string {
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

function signTenantToken(payloadObj: Record<string, any>): string {
  const payload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
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

function safeEqualText(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function hashPasswordScrypt(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, s, 64).toString('hex');
  return { hash, salt: s };
}

function verifyPasswordScrypt(password: string, hash: string, salt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const stored = Buffer.from(hash, 'hex');
    return derived.length === stored.length && crypto.timingSafeEqual(derived, stored);
  } catch {
    return false;
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

function getBearerToken(req: VercelRequest): string {
  const authHeader = getParam(req.headers.authorization);
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
  return getParam(req.query?.token).trim();
}

function resolveExpectedCredentials(cfg: Record<string, any>, slug: string) {
  const expectedEmail = String(cfg.adminEmail || `owner@${slug}.t2.app`).trim().toLowerCase();
  const phoneDigits = String(cfg.phone || cfg.whatsapp || '').replace(/\D/g, '');
  const adminPin = String(cfg.adminPin || (phoneDigits.length >= 6 ? phoneDigits.slice(-6) : '')).trim();
  const defaultPass = process.env.TENANT_ADMIN_PASSWORD || (adminPin ? `T2@${adminPin}` : '');
  return { expectedEmail, defaultPass };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const body = parseBody(req);
  const action = String(req.query?.action || body.action || (req.method === 'GET' ? 'verify' : 'login')).trim();

  if (req.method === 'GET' || action === 'verify') {
    const token = getBearerToken(req);
    const decoded = verifyTenantToken(token);
    if (!decoded) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
    }
    const requestedSlug = getParam(req.query?.brandSlug || body.brandSlug);
    if (requestedSlug) {
      const cfg = await loadTenantConfig(req);
      const normReq = normalizeSlug(requestedSlug, normalizeSlug(cfg.slug || 'default'));
      const normTok = normalizeSlug(String(decoded.brandSlug || ''));
      if (normReq !== normTok) {
        return res.status(403).json({ ok: false, error: 'Token not scoped to this brand' });
      }
    }
    return res.status(200).json({ ok: true, user: decoded });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const cfg = await loadTenantConfig(req);

  if (action === 'change-password') {
    const token = getBearerToken(req);
    const decoded = verifyTenantToken(token);
    if (!decoded?.brandSlug) {
      return res.status(401).json({ ok: false, error: 'جلسة غير صالحة أو منتهية' });
    }
    const slug = normalizeSlug(String(decoded.brandSlug), normalizeSlug(cfg.slug || 'default'));
    const requestedSlug = body.brandSlug ? normalizeSlug(String(body.brandSlug), slug) : slug;
    if (requestedSlug !== slug) {
      return res.status(403).json({ ok: false, error: 'Token not scoped to this brand' });
    }

    const oldPassword = String(body.oldPassword || '');
    const newPassword = String(body.newPassword || '');
    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    const authDocId = `t2_erp_${slug}__auth`;
    const customRec = await readShard(authDocId);
    const { defaultPass } = resolveExpectedCredentials(cfg, slug);

    if (customRec?.hash && customRec?.salt) {
      if (!verifyPasswordScrypt(oldPassword, String(customRec.hash), String(customRec.salt))) {
        return res.status(403).json({ ok: false, error: 'كلمة المرور الحالية غير صحيحة' });
      }
    } else if (!defaultPass || !safeEqualText(oldPassword, defaultPass)) {
      return res.status(403).json({ ok: false, error: 'كلمة المرور الحالية غير صحيحة' });
    }

    const nextAuth = {
      ...hashPasswordScrypt(newPassword),
      updatedAt: new Date().toISOString(),
    };
    const saved = await writeShard(authDocId, slug, 'auth', nextAuth);
    if (!saved) {
      return res.status(500).json({ ok: false, error: 'تعذر حفظ كلمة المرور السحابية' });
    }

    // Best-effort sync to Ez-Zel if online; never fails local update when Render is suspended
    const ezZelBase = String(process.env.VITE_EZZEL_API_URL || cfg.ezZelApiBase || 'https://ez-zel.onrender.com').replace(/\/$/, '');
    try {
      await fetch(`${ezZelBase}/api/tenant-auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
        signal: AbortSignal.timeout(1800),
      });
    } catch {}

    return res.status(200).json({ ok: true, message: 'تم تحديث كلمة المرور وتشفيرها بنجاح' });
  }

  // Default action: login
  try {
    const slugFallback = normalizeSlug(cfg.slug || cfg.id || 'default');
    const slug = normalizeSlug(String(body.brandSlug || ''), slugFallback);
    const emailInput = String(body.email || '').trim().toLowerCase();
    const passInput = String(body.password || '');

    if (!emailInput || !passInput) {
      return res.status(400).json({ ok: false, error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
    }

    const { expectedEmail, defaultPass } = resolveExpectedCredentials(cfg, slug);

    // Path A: Brand Owner Admin
    if (safeEqualText(emailInput, expectedEmail)) {
      const authRec = await readShard(`t2_erp_${slug}__auth`);
      const passMatch = authRec?.hash && authRec?.salt
        ? verifyPasswordScrypt(passInput, String(authRec.hash), String(authRec.salt))
        : defaultPass.length > 0 && safeEqualText(passInput, defaultPass);

      if (!passMatch) {
        return res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة لهذا البراند' });
      }

      const brandName = String(cfg.name || slug);
      const userObj = {
        id: `admin_${slug}`,
        username: expectedEmail,
        email: expectedEmail,
        name: `مدير ${brandName}`,
        role: 'admin',
        branch: 'main',
        allowedBranches: ['main', 'branch1', 'branch2', 'branch3'],
        brandSlug: slug,
        permissions: FULL_ADMIN_PERMISSIONS,
      };
      const token = signTenantToken({ ...userObj, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      return res.status(200).json({ ok: true, token, user: userObj });
    }

    // Path B: Staff Users created inside ERP ops shard
    const opsRec = await readShard(`t2_erp_${slug}__ops`);
    const staffList = Array.isArray(opsRec?.users) ? opsRec.users : [];
    const staffUser = staffList.find(
      (u: any) => String(u?.username || u?.email || '').trim().toLowerCase() === emailInput
    );

    if (staffUser) {
      const staffMatch =
        staffUser.passwordHash && staffUser.passwordSalt
          ? verifyPasswordScrypt(passInput, String(staffUser.passwordHash), String(staffUser.passwordSalt))
          : Boolean(staffUser.password) && safeEqualText(passInput, String(staffUser.password));

      if (!staffMatch) {
        return res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة لهذا البراند' });
      }

      const userObj = {
        id: String(staffUser.id || `staff_${slug}`),
        username: String(staffUser.username || emailInput).toLowerCase(),
        email: String(staffUser.username || emailInput).toLowerCase(),
        name: String(staffUser.name || emailInput),
        role: staffUser.role || 'seller',
        branch: staffUser.branch || 'main',
        allowedBranches: Array.isArray(staffUser.allowedBranches) ? staffUser.allowedBranches : [staffUser.branch || 'main'],
        brandSlug: slug,
        permissions: Array.isArray(staffUser.permissions) ? staffUser.permissions : [],
      };
      const token = signTenantToken({ ...userObj, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      return res.status(200).json({ ok: true, token, user: userObj });
    }

    return res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة لهذا البراند' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'Tenant auth error' });
  }
}
