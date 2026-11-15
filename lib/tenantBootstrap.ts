import { collection as fsCollection, doc as fsDoc, Firestore } from 'firebase/firestore';

export interface TenantBrandConfig {
  id: string;
  slug: string;
  name: string;
  slogan?: string;
  logoUrl?: string;
  primaryColor?: string;
  phone?: string;
  whatsapp?: string;
  businessType?: string;
  productsCatalog?: any[];
}

export function resolveTenantBrandId(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('brandId') || params.get('tenant');
  if (fromQuery) return fromQuery.trim();

  const host = window.location.hostname || '';
  const parts = host.split('.');
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    if (sub && !['www', 'battah', 'localhost', '127'].includes(sub)) {
      return sub;
    }
  }
  return null;
}

export async function bootstrapBattahTenant(): Promise<TenantBrandConfig | null> {
  const brandId = resolveTenantBrandId();
  if (!brandId) return null;

  // @ts-ignore
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EZZEL_API_URL) || 'https://the-shadow-sovereign-os.onrender.com';
  try {
    const res = await fetch(`${String(baseUrl).replace(/\/$/, '')}/api/public/brand/${encodeURIComponent(brandId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !data?.brand) return null;

    const brand: TenantBrandConfig = data.brand;
    (window as any).__TENANT_BRAND__ = brand;
    try {
      localStorage.setItem('battah_active_tenant', JSON.stringify(brand));
    } catch {}
    document.title = `${brand.name} | المتجر ونظام الإدارة`;
    if (brand.primaryColor) {
      document.documentElement.style.setProperty('--primary', brand.primaryColor);
    }
    return brand;
  } catch {
    return null;
  }
}

export function tenantCollection(db: Firestore, path: string, ...pathSegments: string[]) {
  const brandId = resolveTenantBrandId();
  if (!brandId || path === '_connection_test') {
    return fsCollection(db, path, ...pathSegments);
  }
  return fsCollection(db, 'tenants', brandId, path, ...pathSegments);
}

export function tenantDoc(db: Firestore, path: string, ...pathSegments: string[]) {
  const brandId = resolveTenantBrandId();
  if (!brandId || path === '_connection_test') {
    return fsDoc(db, path, ...pathSegments);
  }
  return fsDoc(db, 'tenants', brandId, path, ...pathSegments);
}
