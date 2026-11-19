import { MAIN_CATEGORIES, SUB_CATEGORIES } from '../constants';
import {
  AppCustomization,
  BranchConfig,
  CashierConfig,
  Product,
  StorefrontFiltersConfig,
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
