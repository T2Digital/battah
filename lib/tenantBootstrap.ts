import {
  collection as fsCollection,
  doc as fsDoc,
  Firestore,
  DocumentData,
  DocumentReference,
  CollectionReference,
} from 'firebase/firestore';

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
  appAccessMode?: 'full_app' | 'landing_page';
  studioLandingPageUrl?: string;
  planId?: string;
  planNameAr?: string;
  trialEndsAt?: string;
  trialDaysLeft?: number | null;
  upgradeUrl?: string;
}

function renderStarterLandingPageGate(brand: TenantBrandConfig) {
  if (typeof document === 'undefined' || document.getElementById('ezzel-landing-gate')) return;
  const waNum = String(brand.whatsapp || brand.phone || '01013373634').replace(/[^0-9]/g, '');
  const waHref = `https://wa.me/${waNum.startsWith('0') ? `2${waNum}` : waNum}?text=${encodeURIComponent(`مرحباً ${brand.name}، أريد الاستفسار والطلب الآن`)}`;
  const itemsHtml = (Array.isArray(brand.productsCatalog) ? brand.productsCatalog : []).slice(0, 4).map((p: any) => `
    <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div style="text-align:right;">
        <div style="font-size:14px;font-weight:800;color:#fff;">${p?.name || 'عرض مميز'}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${p?.price || (p?.numericPrice ? `${p.numericPrice} ج.م` : 'تواصل للسعر')}</div>
      </div>
      <a href="${waHref}" target="_blank" rel="noreferrer" style="background:#10b981;color:#020617;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:900;text-decoration:none;white-space:nowrap;">اطلب واتساب</a>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.id = 'ezzel-landing-gate';
  overlay.dir = 'rtl';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999998;overflow:auto;background:#020617;padding:24px 16px;font-family:Cairo,sans-serif;color:#fff;';
  overlay.innerHTML = `
    <div style="max-width:620px;margin:0 auto;">
      <div style="background:linear-gradient(180deg,rgba(16,185,129,0.14),rgba(15,23,42,0.9));border:1px solid rgba(16,185,129,0.4);border-radius:24px;padding:26px;text-align:center;margin-bottom:18px;">
        <div style="display:inline-block;padding:4px 12px;border-radius:999px;background:rgba(16,185,129,0.15);color:#34d399;font-size:11px;font-weight:800;margin-bottom:10px;">Landing Page • ${brand.planNameAr || 'باقة الانطلاق 2,500 ج.م'}</div>
        ${brand.logoUrl ? `<img src="${brand.logoUrl}" alt="${brand.name}" style="width:72px;height:72px;border-radius:18px;object-fit:cover;margin:0 auto 12px;display:block;border:2px solid #10b981;" />` : ''}
        <h1 style="margin:0 0 6px;font-size:24px;font-weight:900;">${brand.name}</h1>
        <p style="margin:0 0 18px;font-size:13.5px;color:#cbd5e1;line-height:1.7;">${brand.slogan || brand.businessType || 'تواصل مباشرة للطلب والاستفسار السريع عبر واتساب'}</p>
        <a href="${waHref}" target="_blank" rel="noreferrer" style="display:block;width:100%;padding:13px;border-radius:14px;background:#25D366;color:#020617;font-weight:900;font-size:15px;text-decoration:none;">💬 اطلب الآن عبر واتساب مباشرة</a>
      </div>
      ${itemsHtml ? `<div style="display:grid;gap:10px;margin-bottom:18px;">${itemsHtml}</div>` : ''}
      <div style="background:#0f172a;border:1px solid #334155;border-radius:18px;padding:16px;text-align:center;">
        <div style="font-size:13px;font-weight:800;color:#38bdf8;margin-bottom:6px;">🚀 الترقية للمتجر الكامل + سلة المشتريات + فواتير ERP</div>
        <a href="${brand.upgradeUrl || 'https://ez-zel.onrender.com/pricing'}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;padding:10px 20px;border-radius:12px;background:#38bdf8;color:#020617;font-weight:900;font-size:13px;text-decoration:none;">ترقية إلى باقة النمو 5,000 ج.م</a>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
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

  const cachedBrandSlug = (window as any).__TENANT_BRAND__?.slug;
  if (cachedBrandSlug && String(cachedBrandSlug).trim()) return String(cachedBrandSlug).trim();

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

function applyBrandToEnvironment(brand: TenantBrandConfig) {
  (window as any).__TENANT_BRAND__ = brand;
  try {
    localStorage.setItem('battah_active_tenant', JSON.stringify(brand));
  } catch {}
  document.title = `${brand.name} | المتجر ونظام الإدارة`;
  applyDynamicPwaAndTheme(brand);
  if (brand.subscriptionStatus === 'expired') {
    renderTrialExpiredPaywall(brand);
  } else if (brand.appAccessMode === 'landing_page') {
    if (brand.studioLandingPageUrl && !window.location.href.startsWith(brand.studioLandingPageUrl)) {
      window.location.replace(brand.studioLandingPageUrl);
    } else {
      renderStarterLandingPageGate(brand);
    }
  }
}

export async function bootstrapBattahTenant(): Promise<TenantBrandConfig | null> {
  const brandId = resolveTenantBrandId();
  if (!brandId) return null;

  let brand: TenantBrandConfig | null = null;
  try {
    const cfgRes = await fetch('/tenant-config.json');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (cfg?.name) {
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
          primaryColor: cfg.primaryColor || '#0284c7',
          accentColor: cfg.accentColor || '#0f172a',
        };
      }
    }
  } catch {}

  if (brand) {
    applyBrandToEnvironment(brand);
  }

  // @ts-ignore
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EZZEL_API_URL) || 'https://ez-zel.onrender.com';
  const liveSyncPromise = (async (): Promise<TenantBrandConfig | null> => {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 2000) : null;
      const res = await fetch(`${String(baseUrl).replace(/\/$/, '')}/api/public/brand/${encodeURIComponent(brandId)}`, {
        signal: controller?.signal,
      });
      if (timer) clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.ok || !data?.brand) return null;
      const liveBrand: TenantBrandConfig = {
        ...data.brand,
        adminEmail: data.brand.adminEmail || brand?.adminEmail || '',
        productsCatalog:
          Array.isArray(data.brand.productsCatalog) && data.brand.productsCatalog.length > 0
            ? data.brand.productsCatalog
            : brand?.productsCatalog || [],
      };
      brand = liveBrand;
      applyBrandToEnvironment(liveBrand);
      return liveBrand;
    } catch {
      return null;
    }
  })();

  if (!brand) {
    return await liveSyncPromise;
  }

  void liveSyncPromise;
  return brand;
}

export function tenantCollection(db: Firestore, path: string, ...pathSegments: string[]) {
  const brandId = resolveTenantBrandId();
  if (!brandId || path === '_connection_test') {
    return fsCollection(db, path, ...pathSegments);
  }
  return fsCollection(db, 'tenants', brandId, path, ...pathSegments);
}

export function tenantDoc(
  dbOrRef: Firestore | CollectionReference<DocumentData>,
  path?: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData> {
  if (!path) {
    return fsDoc(dbOrRef as CollectionReference<DocumentData>);
  }
  const brandId = resolveTenantBrandId();
  if (!brandId || path === '_connection_test') {
    return fsDoc(dbOrRef as Firestore, path, ...pathSegments);
  }
  return fsDoc(dbOrRef as Firestore, 'tenants', brandId, path, ...pathSegments);
}
