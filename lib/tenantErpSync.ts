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

export async function fetchTenantErpState(brandSlug: string, token?: string | null): Promise<Record<string, any> | null> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${getEzZelBaseUrl()}/api/tenant-erp/${encodeURIComponent(brandSlug)}/state`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ok && data?.state ? data.state : null;
  } catch {
    return null;
  }
}

let syncTimer: any = null;
export function queueTenantErpSync(brandSlug: string, appData: Record<string, any>) {
  const token = getTenantSessionToken(brandSlug);
  if (!token) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      await fetch(`${getEzZelBaseUrl()}/api/tenant-erp/${encodeURIComponent(brandSlug)}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ state: appData })
      });
    } catch {}
  }, 600);
}

export async function changeTenantAdminPassword(brandSlug: string, oldPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string; message?: string }> {
  const token = getTenantSessionToken(brandSlug);
  if (!token) return { ok: false, error: 'يجب تسجيل الدخول أولاً' };
  try {
    const res = await fetch(`${getEzZelBaseUrl()}/api/tenant-auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ oldPassword, newPassword })
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
