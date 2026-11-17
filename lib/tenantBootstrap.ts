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
  subscriptionStatus?: 'active' | 'trial' | 'expired';
  trialEndsAt?: string;
  trialDaysLeft?: number | null;
  upgradeUrl?: string;
}

function renderTrialExpiredPaywall(brand: TenantBrandConfig) {
  if (typeof document === 'undefined' || document.getElementById('ezzel-trial-paywall')) return;
  const overlay = document.createElement('div');
  overlay.id = 'ezzel-trial-paywall';
  overlay.dir = 'rtl';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(2,6,23,0.96);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Cairo,sans-serif;color:#fff;';
  overlay.innerHTML = `
    <div style="max-width:480px;width:100%;background:#0f172a;border:2px solid #f59e0b;border-radius:24px;padding:32px;text-align:center;box-shadow:0 25px 70px rgba(245,158,11,0.25);">
      ${brand.logoUrl ? `<img src="${brand.logoUrl}" alt="${brand.name}" style="width:68px;height:68px;border-radius:16px;object-fit:cover;margin:0 auto 14px;border:2px solid #f59e0b;" />` : ''}
      <div style="font-size:12px;color:#fbbf24;font-weight:800;margin-bottom:6px;">انتهت فترة التجربة المجانية (7 أيام)</div>
      <h2 style="font-size:22px;font-weight:900;margin:0 0 10px;">تطبيق ${brand.name} متوقف مؤقتاً</h2>
      <p style="font-size:14px;color:#cbd5e1;line-height:1.8;margin:0 0 22px;">
        للاستمرار في تشغيل المتجر واستقبال الطلبات وإدارة المخازن، يرجى تفعيل <b>باقة النمو (5,000 ج.م) أو أي باقة أعلى</b> عبر منظومة الظل.
      </p>
      <a href="${brand.upgradeUrl || 'https://ez-zel.onrender.com/pricing'}" target="_blank" rel="noreferrer"
         style="display:inline-block;width:100%;padding:14px 20px;border-radius:14px;background:linear-gradient(90deg,#f59e0b,#10b981);color:#020617;font-weight:900;font-size:15px;text-decoration:none;">
        ⚡ تفعيل باقة 5,000 ج.م أو أعلى وإعادة تشغيل التطبيق
      </a>
    </div>
  `;
  document.body.appendChild(overlay);
}

export function applyDynamicPwaAndTheme(brand: Partial<TenantBrandConfig>) {
  if (typeof document === 'undefined') return;
  const rawPrimary = String(brand.primaryColor || '#0284c7').trim();
  const primary = rawPrimary.toLowerCase() === '#00f0ff' ? '#0284c7' : rawPrimary;
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

  // @ts-ignore
  const fromEnv = typeof import.meta !== 'undefined' && import.meta.env?.VITE_TENANT_BRAND_ID;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();

  const host = window.location.hostname || '';
  const parts = host.split('.');
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase().replace(/^t2-tenant-/, '');
    if (sub && !['www', 'battah', 'shop', 'store', 'app', 'apps', 'book', 't2digital', 'localhost', '127'].includes(sub)) {
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
  let brand: TenantBrandConfig | null = null;
  try {
    const res = await fetch(`${String(baseUrl).replace(/\/$/, '')}/api/public/brand/${encodeURIComponent(brandId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && data?.brand) brand = data.brand;
    }
  } catch {}

  try {
    const cfgRes = await fetch('/tenant-config.json');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (!brand && cfg?.name) {
        brand = {
          id: cfg.brandId || cfg.id || brandId,
          slug: cfg.slug || brandId,
          name: cfg.name,
          slogan: cfg.slogan || '',
          logoUrl: cfg.logoUrl || '',
          phone: cfg.phone || '',
          whatsapp: cfg.whatsapp || cfg.phone || '',
          adminEmail: cfg.adminEmail || '',
          productsCatalog: Array.isArray(cfg.productsCatalog) ? cfg.productsCatalog : [],
          primaryColor: cfg.primaryColor || '#00f0ff',
          accentColor: cfg.accentColor || '#0f172a',
        };
      } else if (brand && cfg) {
        if (!brand.adminEmail && cfg.adminEmail) brand.adminEmail = cfg.adminEmail;
        if ((!Array.isArray(brand.productsCatalog) || brand.productsCatalog.length === 0) && Array.isArray(cfg.productsCatalog)) {
          brand.productsCatalog = cfg.productsCatalog;
        }
      }
    }
  } catch {}

  if (!brand) return null;

  (window as any).__TENANT_BRAND__ = brand;
  try {
    localStorage.setItem('battah_active_tenant', JSON.stringify(brand));
  } catch {}
  document.title = `${brand.name} | المتجر ونظام الإدارة`;
  applyDynamicPwaAndTheme(brand);
  if (brand.subscriptionStatus === 'expired') {
    renderTrialExpiredPaywall(brand);
  }
  return brand;
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
