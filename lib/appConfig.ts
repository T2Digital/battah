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

export function getMainCategories(
  appCustomization?: AppCustomization | null,
  products?: Product[]
): string[] {
  const tenantDefault = getTenantDefaultCustomization();
  const base =
    (Array.isArray(appCustomization?.mainCategories) && appCustomization.mainCategories.length > 0
      ? appCustomization.mainCategories
      : Array.isArray(tenantDefault?.mainCategories) && tenantDefault.mainCategories.length > 0
        ? tenantDefault.mainCategories
        : MAIN_CATEGORIES) || [];

  const result = new Set<string>(
    base.map((c) => String(c || '').trim()).filter(Boolean)
  );
  if (Array.isArray(products)) {
    for (const p of products) {
      if (p?.mainCategory && String(p.mainCategory).trim()) {
        result.add(String(p.mainCategory).trim());
      }
    }
  }
  return Array.from(result);
}

export function getSubCategoriesMap(
  appCustomization?: AppCustomization | null
): Record<string, string[]> {
  const tenantDefault = getTenantDefaultCustomization();
  const raw =
    (appCustomization?.subCategories && Object.keys(appCustomization.subCategories).length > 0
      ? appCustomization.subCategories
      : tenantDefault?.subCategories && Object.keys(tenantDefault.subCategories).length > 0
        ? tenantDefault.subCategories
        : SUB_CATEGORIES) || {};

  const out: Record<string, string[]> = {};
  for (const [k, list] of Object.entries(raw)) {
    if (Array.isArray(list)) {
      out[k] = list.map((s) => String(s || '').trim()).filter(Boolean);
    }
  }
  return out;
}

export function getStorefrontFiltersConfig(
  appCustomization?: AppCustomization | null
): Required<StorefrontFiltersConfig> {
  const tenantDefault = getTenantDefaultCustomization();
  const saved = appCustomization?.storefrontFilters || {};
  const fromBrand = tenantDefault?.storefrontFilters || {};
  const merged = { ...fromBrand, ...saved };

  return {
    showSearch: merged.showSearch !== false,
    showCategoryFilter: merged.showCategoryFilter !== false,
    showSubCategoryFilter: merged.showSubCategoryFilter !== false,
    showBrandFilter: merged.showBrandFilter !== false,
    brandFilterLabel: String(merged.brandFilterLabel || 'ماركة السيارة').trim() || 'ماركة السيارة',
    brandFilterOptions: Array.isArray(merged.brandFilterOptions)
      ? merged.brandFilterOptions.map((o) => String(o || '').trim()).filter(Boolean)
      : DEFAULT_CAR_BRANDS,
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
      (needle.includes('turbo') && c.provider === 'turbo')
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
  return [
    {
      id: 1,
      badge: slogan || 'المتجر الإلكتروني المعتمد',
      title: brandName || 'تشكيلة مميزة بانتظارك',
      subtitle: 'جودة عالية وأفضل قيمة مقابل سعر',
      description: slogan || 'تصفح أحدث المنتجات والعروض المتاحة الآن مع شحن سريع لجميع المحافظات.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&auto=format&fit=crop',
      category: cats[0] || 'all',
    },
    {
      id: 2,
      badge: 'عروض وتوصيل سريع',
      title: cats[1] || cats[0] || 'تسوق بسهولة وأمان',
      subtitle: 'اطلب أونلاين والدفع عند الاستلام أو إلكترونياً',
      description: 'اختر ما يناسبك وتابع حالة طلبك خطوة بخطوة بضمان معتمد وخدمة عملاء متميزة.',
      image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1600&auto=format&fit=crop',
      category: cats[1] || cats[0] || 'all',
    },
  ];
}
