import { MAIN_CATEGORIES, SUB_CATEGORIES } from '../constants';
import {
  AppCustomization,
  BranchConfig,
  CashierConfig,
  HeroSlideConfig,
  PaymentGatewaysConfig,
  Product,
  ShippingCarrierConfig,
  ShippingCarrierProvider,
  ShippingConfig,
  StorefrontFiltersConfig,
  StorefrontSettings,
} from '../types';
import { resolveTenantBrandId } from './tenantBootstrap';

export const DEFAULT_TENANT_BRANCHES: BranchConfig[] = [
  { key: 'main', label: 'الفرع الرئيسي' },
];

export const LEGACY_BRANCHES: BranchConfig[] = [
  { key: 'main', label: 'المخزن' },
  { key: 'branch1', label: 'الرئيسي' },
  { key: 'branch2', label: 'فرع 1' },
  { key: 'branch3', label: 'فرع 2' },
];

export const DEFAULT_TENANT_CASHIERS: CashierConfig[] = [
  { value: 'main', label: 'الكاشير الرئيسي' },
];

export const LEGACY_CASHIERS: CashierConfig[] = [
  { value: 'تحت', label: 'كاشير تحت' },
  { value: 'فوق', label: 'كاشير فوق' },
];

export const DEFAULT_CAR_BRANDS: string[] = [
  'Toyota',
  'Hyundai',
  'Kia',
  'Chevrolet',
  'Nissan',
  'Renault',
  'Peugeot',
  'Fiat',
  'Suzuki',
  'Mitsubishi',
  'Honda',
  'Skoda',
  'Volkswagen',
  'Opel',
  'BMW',
  'Mercedes-Benz',
  'Chery',
  'MG',
  'Lada',
  'BYD',
  'Jeep',
  'Ford',
  'Mazda',
  'Seat',
  'Geely',
  'Daewoo',
  'Speranza',
  'Audi',
  'Subaru',
  'Volvo',
];

export function getTenantDefaultCustomization(): AppCustomization | null {
  if (typeof window === 'undefined') return null;
  const brand = (window as any).__TENANT_BRAND__;
  if (brand?.appCustomization && typeof brand.appCustomization === 'object') {
    return brand.appCustomization as AppCustomization;
  }
  return null;
}

export function getActiveBranches(appCustomization?: AppCustomization | null): BranchConfig[] {
  if (Array.isArray(appCustomization?.activeBranches) && appCustomization.activeBranches.length > 0) {
    return appCustomization.activeBranches;
  }
  const tenantDefault = getTenantDefaultCustomization();
  if (Array.isArray(tenantDefault?.activeBranches) && tenantDefault.activeBranches.length > 0) {
    return tenantDefault.activeBranches;
  }
  if (resolveTenantBrandId()) {
    return DEFAULT_TENANT_BRANCHES;
  }
  return LEGACY_BRANCHES;
}

export function getBranchLabelMap(branches: BranchConfig[]): Record<string, string> {
  const map: Record<string, string> = {
    main: 'المخزن',
    branch1: 'الرئيسي',
    branch2: 'فرع 1',
    branch3: 'فرع 2',
  };
  for (const b of branches) {
    if (b?.key && b?.label) {
      map[b.key] = b.label;
    }
  }
  return map;
}

export function getBranchLabel(branchKey: string, branches: BranchConfig[]): string {
  const map = getBranchLabelMap(branches);
  return map[branchKey] || branchKey;
}

export function getActiveCashiers(appCustomization?: AppCustomization | null): CashierConfig[] {
  if (Array.isArray(appCustomization?.cashiers) && appCustomization.cashiers.length > 0) {
    return appCustomization.cashiers;
  }
  const tenantDefault = getTenantDefaultCustomization();
  if (Array.isArray(tenantDefault?.cashiers) && tenantDefault.cashiers.length > 0) {
    return tenantDefault.cashiers;
  }
  if (resolveTenantBrandId()) {
    return DEFAULT_TENANT_CASHIERS;
  }
  return LEGACY_CASHIERS;
}

export const DEFAULT_PRODUCT_PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 320'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%230f172a'/%3E%3Cstop offset='100%25' stop-color='%231e293b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='320' rx='24' fill='url(%23g)'/%3E%3Crect x='95' y='88' width='130' height='110' rx='18' fill='none' stroke='%2338bdf8' stroke-width='6' opacity='0.75'/%3E%3Ccircle cx='135' cy='125' r='12' fill='%2338bdf8' opacity='0.8'/%3E%3Cpath d='M108 184l38-36 28 24 22-20 18 32z' fill='%2338bdf8' opacity='0.55'/%3E%3Ctext x='160' y='246' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='18' font-weight='bold'%3ET2OS Store%3C/text%3E%3C/svg%3E";

export const DEFAULT_STORE_LOGO_SVG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Cdefs%3E%3ClinearGradient id='lg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%230284c7'/%3E%3Cstop offset='100%25' stop-color='%230f172a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='96' height='96' rx='24' fill='url(%23lg)'/%3E%3Cpath d='M28 36h40l-4 32H32z' fill='none' stroke='%23fff' stroke-width='5' stroke-linejoin='round'/%3E%3Cpath d='M38 36v-6a10 10 0 0 1 20 0v6' fill='none' stroke='%2338bdf8' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E";

export function extractCategoryLabel(cat: any): string {
  if (typeof cat === 'string') return cat.trim();
  if (cat && typeof cat === 'object') {
    return String(cat.name || cat.title || cat.label || cat.ar || cat.value || '').trim();
  }
  return '';
}

export function isAutomotiveTenant(brandOverride?: any): boolean {
  const slug = String(resolveTenantBrandId() || '').trim().toLowerCase();
  if (!slug || ['battah', 'captaincar-eg', 'al-genedy', 'auto-house'].includes(slug)) {
    return true;
  }
  const b = brandOverride || (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || {};
  const haystack = `${b.name || ''} ${b.businessType || ''} ${b.slogan || ''}`;
  return /سيارات|قطع غيار|اطارات|إطارات|بطاريات|زيوت|auto|car|spare/i.test(haystack);
}

export function getMainCategories(
  appCustomization?: AppCustomization | null,
  products?: Product[]
): string[] {
  const tenantDefault = getTenantDefaultCustomization();
  const isAuto = isAutomotiveTenant();
  const base =
    (Array.isArray(appCustomization?.mainCategories) && appCustomization.mainCategories.length > 0
      ? appCustomization.mainCategories
      : Array.isArray(tenantDefault?.mainCategories) && tenantDefault.mainCategories.length > 0
        ? tenantDefault.mainCategories
        : isAuto
          ? MAIN_CATEGORIES
          : []) || [];

  const result = new Set<string>(
    base.map(extractCategoryLabel).filter(Boolean)
  );
  if (Array.isArray(products)) {
    for (const p of products) {
      const cat = extractCategoryLabel(p?.mainCategory || p?.category);
      if (cat && (isAuto || !['قطع غيار', 'بطاريات', 'زيوت وشحومات', 'إطارات'].includes(cat))) {
        result.add(cat);
      }
    }
  }
  if (result.size === 0 && Array.isArray(products)) {
    for (const p of products) {
      const cat = extractCategoryLabel(p?.mainCategory || p?.category);
      if (cat) result.add(cat);
    }
  }
  return result.size > 0 ? Array.from(result) : ['كل المنتجات'];
}

export function getSubCategoriesMap(
  appCustomization?: AppCustomization | null
): Record<string, string[]> {
  const tenantDefault = getTenantDefaultCustomization();
  const isAuto = isAutomotiveTenant();
  const raw =
    (appCustomization?.subCategories && Object.keys(appCustomization.subCategories).length > 0
      ? appCustomization.subCategories
      : tenantDefault?.subCategories && Object.keys(tenantDefault.subCategories).length > 0
        ? tenantDefault.subCategories
        : isAuto
          ? SUB_CATEGORIES
          : {}) || {};

  const out: Record<string, string[]> = {};
  for (const [k, list] of Object.entries(raw)) {
    if (Array.isArray(list)) {
      out[k] = list.map(extractCategoryLabel).filter(Boolean);
    }
  }
  return out;
}

export function getStorefrontFiltersConfig(
  appCustomization?: AppCustomization | null
): Required<StorefrontFiltersConfig> {
  const tenantDefault = getTenantDefaultCustomization();
  const isAuto = isAutomotiveTenant();
  const saved = appCustomization?.storefrontFilters || {};
  const fromBrand = tenantDefault?.storefrontFilters || {};
  const merged = { ...fromBrand, ...saved };

  return {
    showSearch: merged.showSearch !== false,
    showCategoryFilter: merged.showCategoryFilter !== false,
    showSubCategoryFilter: merged.showSubCategoryFilter !== false,
    showBrandFilter: isAuto ? merged.showBrandFilter !== false : merged.showBrandFilter === true,
    brandFilterLabel:
      String(merged.brandFilterLabel || (isAuto ? 'ماركة السيارة' : 'الماركة / التصنيف')).trim() ||
      (isAuto ? 'ماركة السيارة' : 'الماركة / التصنيف'),
    brandFilterOptions: Array.isArray(merged.brandFilterOptions)
      ? merged.brandFilterOptions.map(extractCategoryLabel).filter(Boolean)
      : isAuto
        ? DEFAULT_CAR_BRANDS
        : [],
    showPriceFilter: Boolean(merged.showPriceFilter),
    showInStockOnlyFilter: Boolean(merged.showInStockOnlyFilter),
  };
}

export function getProductTotalStock(
  product: Pick<Product, 'stock'> | null | undefined,
  activeBranches?: BranchConfig[]
): number {
  const stock = product?.stock;
  if (!stock || typeof stock !== 'object') return 0;
  if (Array.isArray(activeBranches) && activeBranches.length > 0) {
    return activeBranches.reduce((sum, b) => sum + Number((stock as Record<string, any>)[b.key] || 0), 0);
  }
  return Object.values(stock).reduce((sum, val) => sum + Number(val || 0), 0);
}

export function createEmptyStockForBranches(
  branches: BranchConfig[],
  defaultQty = 0
): Record<string, number> {
  const list = branches.length > 0 ? branches : DEFAULT_TENANT_BRANCHES;
  const stock: Record<string, number> = {};
  for (const b of list) {
    stock[b.key] = defaultQty;
  }
  return stock;
}

export interface StoreFilters {
  category: string;
  subCategory: string;
  brand: string;
  search: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
}

export const DEFAULT_STORE_FILTERS: StoreFilters = {
  category: 'all',
  subCategory: 'all',
  brand: 'all',
  search: '',
  minPrice: '',
  maxPrice: '',
  inStockOnly: false,
};

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  defaultFee: 50,
  freeShippingThreshold: 0,
  zones: [
    { name: 'القاهرة والجيزة', fee: 50 },
    { name: 'الإسكندرية والدلتا', fee: 65 },
    { name: 'الصعيد ومدن القناة', fee: 85 },
  ],
};

export function formatWhatsAppNumber(rawPhone?: string): string {
  const digits = String(rawPhone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('01') && digits.length === 11) return `2${digits}`;
  if (digits.startsWith('0') && digits.length >= 10) return `2${digits}`;
  return digits;
}

export interface StoreBrandingInfo {
  companyName: string;
  slogan: string;
  logoUrl: string;
  contactPhone: string;
  whatsappPhone: string;
  whatsappFormatted: string;
  contactEmail: string;
  address: string;
  primaryColor: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  commercialRegister: string;
  taxCardNumber: string;
}

export function getStoreBranding(
  storefrontSettings?: StorefrontSettings | null,
  fallbackName = 'المتجر الإلكتروني'
): StoreBrandingInfo {
  const s: any = storefrontSettings || {};
  const brand: any = (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || {};
  const companyName = String(s.companyName || brand.name || fallbackName).trim() || fallbackName;
  const slogan = String(s.slogan || brand.slogan || 'الجودة الأصلية بأفضل سعر').trim();
  const logoUrl = String(s.logoUrl || brand.logoUrl || '').trim();
  const contactPhone = String(s.contactPhone || brand.phone || '').trim();
  const whatsappPhone = String(s.whatsappPhone || brand.whatsapp || contactPhone || '').trim();
  const whatsappFormatted = formatWhatsAppNumber(whatsappPhone);
  const contactEmail = String(s.contactEmail || brand.email || brand.adminEmail || '').trim();
  const address = String(s.address || brand.address || '').trim();
  const rawColor = String(s.primaryColor || brand.primaryColor || '#0284c7').trim();
  const primaryColor = rawColor.toLowerCase() === '#00f0ff' ? '#0284c7' : rawColor || '#0284c7';

  return {
    companyName,
    slogan,
    logoUrl,
    contactPhone,
    whatsappPhone,
    whatsappFormatted,
    contactEmail,
    address,
    primaryColor,
    facebookUrl: String(s.facebookUrl || brand.facebookUrl || '').trim(),
    instagramUrl: String(s.instagramUrl || brand.instagramUrl || '').trim(),
    tiktokUrl: String(s.tiktokUrl || brand.tiktokUrl || '').trim(),
    commercialRegister: String(s.commercialRegister || brand.commercialRegister || '').trim(),
    taxCardNumber: String(s.taxCardNumber || brand.taxCardNumber || '').trim(),
  };
}

export function getShippingConfig(appCustomization?: AppCustomization | null): ShippingConfig {
  const tenantDefault = getTenantDefaultCustomization();
  const raw: any =
    (appCustomization?.shipping && typeof appCustomization.shipping === 'object'
      ? appCustomization.shipping
      : tenantDefault?.shipping && typeof tenantDefault.shipping === 'object'
        ? tenantDefault.shipping
        : DEFAULT_SHIPPING_CONFIG) || DEFAULT_SHIPPING_CONFIG;

  const zones = Array.isArray(raw.zones) && raw.zones.length > 0
    ? raw.zones
        .map((z: any) => ({ name: String(z?.name || '').trim(), fee: Math.max(0, Number(z?.fee ?? 0) || 0) }))
        .filter((z: any) => z.name)
    : DEFAULT_SHIPPING_CONFIG.zones;

  const carrierIntegration: ShippingCarrierConfig = raw.carrierIntegration && typeof raw.carrierIntegration === 'object'
    ? {
        provider: (raw.carrierIntegration.provider || 'manual') as ShippingCarrierProvider,
        enabled: Boolean(raw.carrierIntegration.enabled),
        apiKey: raw.carrierIntegration.apiKey ? String(raw.carrierIntegration.apiKey) : undefined,
        accountNumber: raw.carrierIntegration.accountNumber ? String(raw.carrierIntegration.accountNumber) : undefined,
        businessLocationId: raw.carrierIntegration.businessLocationId ? String(raw.carrierIntegration.businessLocationId) : undefined,
        senderName: raw.carrierIntegration.senderName ? String(raw.carrierIntegration.senderName) : undefined,
        senderPhone: raw.carrierIntegration.senderPhone ? String(raw.carrierIntegration.senderPhone) : undefined,
        senderAddress: raw.carrierIntegration.senderAddress ? String(raw.carrierIntegration.senderAddress) : undefined,
      }
    : { provider: 'manual', enabled: false };

  return {
    defaultFee: Math.max(0, Number(raw.defaultFee ?? DEFAULT_SHIPPING_CONFIG.defaultFee) || 0),
    freeShippingThreshold: Math.max(0, Number(raw.freeShippingThreshold ?? 0) || 0),
    zones,
    carrierIntegration,
  };
}

export const SHIPPING_CARRIERS: Array<{
  provider: ShippingCarrierProvider;
  label: string;
  trackingTemplate: string;
}> = [
  { provider: 'manual', label: 'شحن يدوي / مندوب خاص', trackingTemplate: '' },
  {
    provider: 'bosta',
    label: 'بوسطة (Bosta)',
    trackingTemplate: 'https://bosta.co/tracking-shipment/?shipment-num={tracking}',
  },
  {
    provider: 'aramex',
    label: 'أرامكس (Aramex)',
    trackingTemplate: 'https://www.aramex.com/track/results?ShipmentNumber={tracking}',
  },
  {
    provider: 'mylerz',
    label: 'مايلرز (Mylerz)',
    trackingTemplate: 'https://mylerz.com/track?id={tracking}',
  },
  {
    provider: 'r2s',
    label: 'R2S Logistics',
    trackingTemplate: 'https://r2slogistics.com/tracking?awb={tracking}',
  },
  {
    provider: 'turbo',
    label: 'تربو (Turbo)',
    trackingTemplate: 'https://turbo-eg.com/track/{tracking}',
  },
  {
    provider: 'oto',
    label: 'OTO / Aramex MENA Gateway',
    trackingTemplate: 'https://track.tryoto.com/{tracking}',
  },
  {
    provider: 'cj_auto',
    label: 'CJ Dropshipping Auto-Fulfillment',
    trackingTemplate: 'https://cjpacket.com/?trackingNumber={tracking}',
  },
];

export function getCarrierLabel(provider?: ShippingCarrierProvider): string {
  const found = SHIPPING_CARRIERS.find((c) => c.provider === provider);
  return found?.label || 'شحن يدوي / مندوب خاص';
}

export function buildCarrierTrackingUrl(providerOrCompany?: string, trackingNumber?: string): string {
  const tracking = String(trackingNumber || '').trim();
  const needle = String(providerOrCompany || '').trim().toLowerCase();
  if (!tracking || !needle) return '';

  const matched = SHIPPING_CARRIERS.find(
    (c) =>
      c.provider === needle ||
      c.label.toLowerCase().includes(needle) ||
      (needle.includes('بوسطة') && c.provider === 'bosta') ||
      (needle.includes('aramex') && c.provider === 'aramex') ||
      (needle.includes('أرامكس') && c.provider === 'aramex') ||
      (needle.includes('ارامكس') && c.provider === 'aramex') ||
      (needle.includes('مايلرز') && c.provider === 'mylerz') ||
      (needle.includes('mylerz') && c.provider === 'mylerz') ||
      (needle.includes('r2s') && c.provider === 'r2s') ||
      (needle.includes('تربو') && c.provider === 'turbo') ||
      (needle.includes('turbo') && c.provider === 'turbo') ||
      (needle.includes('oto') && c.provider === 'oto') ||
      (needle.includes('cj') && c.provider === 'cj_auto')
  );
  if (!matched || !matched.trackingTemplate) return '';
  return matched.trackingTemplate.replace('{tracking}', encodeURIComponent(tracking));
}

export function getPaymentGatewaysConfig(
  appCustomization?: AppCustomization | null
): Required<PaymentGatewaysConfig> {
  const tenantDefault = getTenantDefaultCustomization();
  const raw = appCustomization?.paymentGateways || tenantDefault?.paymentGateways || {};
  const paymobRaw: any = raw.paymob || {};
  return {
    enableCod: raw.enableCod !== false,
    enableManualElectronic: raw.enableManualElectronic !== false,
    paymob: {
      enabled: Boolean(paymobRaw.enabled),
      configured: Boolean(
        paymobRaw.configured ||
          (paymobRaw.apiKey && paymobRaw.integrationId && paymobRaw.iframeId)
      ),
      apiKey: paymobRaw.apiKey || '',
      integrationId: paymobRaw.integrationId || '',
      iframeId: paymobRaw.iframeId || '',
      hmacSecret: paymobRaw.hmacSecret || '',
    },
  };
}

export function calculateShippingFee(
  subtotal: number,
  shippingConfig: ShippingConfig,
  zoneName?: string
): number {
  if (shippingConfig.freeShippingThreshold > 0 && subtotal >= shippingConfig.freeShippingThreshold) {
    return 0;
  }
  if (zoneName) {
    const zone = shippingConfig.zones.find((z) => z.name === zoneName);
    if (zone) return Math.max(0, Number(zone.fee) || 0);
  }
  return Math.max(0, Number(shippingConfig.defaultFee) || 0);
}

export function getHeroSlides(
  appCustomization?: AppCustomization | null,
  brandName?: string,
  slogan?: string,
  mainCategories?: string[]
): HeroSlideConfig[] {
  const tenantDefault = getTenantDefaultCustomization();
  const saved = Array.isArray(appCustomization?.heroSlides) && appCustomization.heroSlides.length > 0
    ? appCustomization.heroSlides
    : Array.isArray(tenantDefault?.heroSlides) && tenantDefault.heroSlides.length > 0
      ? tenantDefault.heroSlides
      : null;

  if (saved) {
    return saved
      .filter((s) => s && (s.title || s.subtitle || s.image))
      .map((s, i) => ({
        id: s.id ?? i + 1,
        badge: s.badge || '',
        title: String(s.title || '').trim(),
        subtitle: String(s.subtitle || '').trim(),
        description: String(s.description || '').trim(),
        image: String(s.image || '').trim() || 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1600&auto=format&fit=crop',
        category: String(s.category || 'all').trim() || 'all',
      }));
  }

  const cats = Array.isArray(mainCategories) && mainCategories.length > 0 ? mainCategories : ['all'];
  const tenantBrand = typeof window !== 'undefined' ? (window as any).__TENANT_BRAND__ : null;
  const fallbackHeroImg =
    String(tenantBrand?.heroImage || '').trim() ||
    String(tenantBrand?.productsCatalog?.[0]?.imageUrl || tenantBrand?.productsCatalog?.[0]?.image || '').trim() ||
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1600&auto=format&fit=crop';
  const secondaryHeroImg =
    String(tenantBrand?.productsCatalog?.[1]?.imageUrl || tenantBrand?.productsCatalog?.[1]?.image || '').trim() ||
    fallbackHeroImg;
  const cleanBadge = cats[0] && cats[0] !== 'all' ? cats[0] : 'المتجر الإلكتروني المعتمد';
  const cleanSubtitle = slogan && slogan !== brandName ? slogan : 'جودة أصلية وتجربة تسوق موثوقة';
  return [
    {
      id: 1,
      badge: cleanBadge,
      title: brandName || 'تشكيلة مميزة بانتظارك',
      subtitle: cleanSubtitle,
      description: 'تصفح أحدث المنتجات والعروض المتاحة الآن مع شحن سريع لجميع المحافظات.',
      image: fallbackHeroImg,
      category: cats[0] || 'all',
    },
    {
      id: 2,
      badge: 'عروض وتوصيل سريع',
      title: cats[1] || cats[0] || 'تسوق بسهولة وأمان',
      subtitle: 'اطلب أونلاين والدفع عند الاستلام أو إلكترونياً',
      description: 'اختر ما يناسبك وتابع حالة طلبك خطوة بخطوة بضمان معتمد وخدمة عملاء متميزة.',
      image: secondaryHeroImg,
      category: cats[1] || cats[0] || 'all',
    },
  ];
}
