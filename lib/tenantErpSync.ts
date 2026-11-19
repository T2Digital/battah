export function getEzZelBaseUrl(): string {
  try {
    // @ts-ignore
    const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_EZZEL_API_URL;
    if (envUrl) return String(envUrl).replace(/\/$/, '');
  } catch {}
  return 'https://ez-zel.onrender.com';
}

export function getTenantSessionToken(brandSlug: string): string | null {
  try {
    const raw = localStorage.getItem(`t2_tenant_session_${brandSlug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

export function saveLocalErpCache(brandSlug: string, data: Record<string, any> | null | undefined): void {
  if (!brandSlug || !data || typeof data !== 'object') return;
  try {
    const clean = { ...data };
    delete clean.toasts;
    localStorage.setItem(`t2_erp_cache_${brandSlug}`, JSON.stringify(clean));
  } catch {}
}

export function loadLocalErpCache(brandSlug: string): Record<string, any> | null {
  if (!brandSlug) return null;
  try {
    const raw = localStorage.getItem(`t2_erp_cache_${brandSlug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function loginTenantAdmin(
  brandSlug: string,
  email: string,
  password: string
): Promise<{ ok: boolean; token?: string; user?: any; error?: string }> {
  try {
    const res = await fetch('/api/tenant-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        brandSlug,
        email: email.trim(),
        password,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.token || !data?.user) {
      return { ok: false, error: data?.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    }
    return { ok: true, token: data.token, user: data.user };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بخدمة المصادقة' };
  }
}

export async function verifyTenantSession(
  brandSlug: string,
  token: string
): Promise<{ valid: boolean; unauthorized?: boolean; user?: any }> {
  if (!token) return { valid: false, unauthorized: true };
  try {
    const res = await fetch(
      `/api/tenant-auth?action=verify&brandSlug=${encodeURIComponent(brandSlug)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 401 || res.status === 403) {
      return { valid: false, unauthorized: true };
    }
    if (!res.ok) {
      return { valid: false, unauthorized: false };
    }
    const data = await res.json().catch(() => ({}));
    if (data?.ok && data?.user) {
      return { valid: true, user: data.user };
    }
    return { valid: false, unauthorized: false };
  } catch {
    return { valid: false, unauthorized: false };
  }
}

export async function fetchTenantErpState(
  brandSlug: string,
  token?: string | null
): Promise<Record<string, any> | null> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/tenant-erp?slug=${encodeURIComponent(brandSlug)}`, { headers });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data?.ok && data?.state ? data.state : null;
  } catch {
    return null;
  }
}

export async function pushTenantErpState(
  brandSlug: string,
  statePayload: Record<string, any>
): Promise<boolean> {
  const token = getTenantSessionToken(brandSlug);
  if (!token || !statePayload || typeof statePayload !== 'object') return false;
  const cleanPayload = { ...statePayload };
  delete cleanPayload.toasts;
  if (Object.keys(cleanPayload).length === 0) return true;
  try {
    const res = await fetch(`/api/tenant-erp?slug=${encodeURIComponent(brandSlug)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ state: cleanPayload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

let syncTimer: any = null;
let isSyncInFlight = false;
let pendingResync = false;
let pendingBrandSlug = '';
let latestAppData: Record<string, any> | null = null;
let syncAllKeys = false;
const pendingDirtyKeys = new Set<string>();

export function hasPendingErpSync(): boolean {
  return Boolean(syncTimer || isSyncInFlight || pendingResync);
}

async function flushQueuedSync(): Promise<void> {
  if (isSyncInFlight) {
    pendingResync = true;
    return;
  }
  const slug = pendingBrandSlug;
  const snapshot = latestAppData;
  if (!slug || !snapshot) return;

  const keysToSend = syncAllKeys ? Object.keys(snapshot) : Array.from(pendingDirtyKeys);
  pendingDirtyKeys.clear();
  syncAllKeys = false;

  const partialPayload: Record<string, any> = {};
  for (const key of keysToSend) {
    if (key === 'toasts') continue;
    if (key in snapshot && snapshot[key] !== undefined) {
      partialPayload[key] = snapshot[key];
    }
  }
  if (Object.keys(partialPayload).length === 0) return;

  isSyncInFlight = true;
  try {
    await pushTenantErpState(slug, partialPayload);
  } finally {
    isSyncInFlight = false;
    if (pendingResync) {
      pendingResync = false;
      void flushQueuedSync();
    }
  }
}

export function queueTenantErpSync(
  brandSlug: string,
  appData: Record<string, any>,
  dirtyKeys?: string[]
) {
  saveLocalErpCache(brandSlug, appData);
  const token = getTenantSessionToken(brandSlug);
  if (!token) return;

  pendingBrandSlug = brandSlug;
  latestAppData = appData;

  if (Array.isArray(dirtyKeys) && dirtyKeys.length > 0) {
    dirtyKeys.forEach((k) => {
      if (k !== 'toasts') pendingDirtyKeys.add(k);
    });
  } else {
    syncAllKeys = true;
  }

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void flushQueuedSync();
  }, 400);
}

export async function createTenantPublicOrder(
  brandSlug: string,
  payload: {
    customerDetails: { name: string; phone: string; address: string };
    items: any[];
    subtotal: number;
    paymentMethod: string;
    paymentProofUrl?: string;
    discountCode?: string;
    locationLink?: string;
    shippingZone?: string;
  }
): Promise<{ ok: boolean; order?: any; notification?: any; error?: string }> {
  try {
    const res = await fetch(
      `/api/tenant-erp?slug=${encodeURIComponent(brandSlug)}&action=create-order`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'تعذر حفظ الطلب' };
    }
    return { ok: true, order: data.order, notification: data.notification };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالسيرفر لحفظ الطلب' };
  }
}

export async function fetchTenantOrdersByPhone(
  brandSlug: string,
  phone: string
): Promise<{ ok: boolean; orders?: any[]; error?: string }> {
  try {
    const res = await fetch(
      `/api/tenant-erp?slug=${encodeURIComponent(brandSlug)}&action=my-orders&phone=${encodeURIComponent(phone)}`
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'تعذر البحث عن الطلبات' };
    }
    return { ok: true, orders: Array.isArray(data.orders) ? data.orders : [] };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالسيرفر للبحث عن الطلبات' };
  }
}

export async function changeTenantAdminPassword(
  brandSlug: string,
  oldPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const token = getTenantSessionToken(brandSlug);
  if (!token) return { ok: false, error: 'يجب تسجيل الدخول أولاً' };
  try {
    const res = await fetch('/api/tenant-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'change-password',
        brandSlug,
        oldPassword,
        newPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'تعذر تحديث كلمة المرور' };
    }
    return { ok: true, message: data?.message || 'تم تحديث كلمة المرور بنجاح' };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالسيرفر' };
  }
}
