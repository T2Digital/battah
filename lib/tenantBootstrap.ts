import { collection as fsCollection, doc as fsDoc, Firestore } from 'firebase/firestore';

export interface TenantBrandConfig {
  id: string;
  slug: string;
  name: string;
  slogan?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  adminEmail?: string;
  phone?: string;
  whatsapp?: string;
  businessType?: string;
  productsCatalog?: any[];
}

function applyDynamicPwaAndTheme(brand: TenantBrandConfig) {
  if (typeof document === 'undefined') return;
  const primary = brand.primaryColor || '#06b6d4';
  const accent = brand.accentColor || '#0f172a';

  document.documentElement.style.setProperty('--primary', primary);
  document.documentElement.style.setProperty('--brand-primary', primary);
  document.documentElement.style.setProperty('--brand-accent', accent);

  // Inject dynamic theme override so primary buttons, headers & badges match brand logo identity
  let styleEl = document.getElementById('tenant-theme-override');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'tenant-theme-override';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    .bg-primary, .bg-emerald-600, .bg-cyan-600, .bg-teal-600 { background-color: ${primary} !important; }
    .text-primary { color: ${primary} !important; }
    .border-primary { border-color: ${primary} !important; }
  `;

  let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = primary;

  if (brand.logoUrl) {
    let iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = brand.logoUrl;
  }

  try {
    const manifestObj = {
      name: brand.name,
      short_name: brand.name.slice(0, 14),
      description: brand.slogan || brand.businessType || brand.name,
      start_url: window.location.pathname + window.location.search,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: primary,
      icons: brand.logoUrl
        ? [
            { src: brand.logoUrl, sizes: '192x192', type: 'image/png' },
            { src: brand.logoUrl, sizes: '512x512', type: 'image/png' }
          ]
        : []
    };
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(manifestObj)], { type: 'application/manifest+json' }));
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = blobUrl;
  } catch {}
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
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EZZEL_API_URL) || 'https://ez-zel.onrender.com';
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
    applyDynamicPwaAndTheme(brand);
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
