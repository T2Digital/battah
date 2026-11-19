import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../../types';
import useStore from '../../lib/store';
import {
    StoreFilters,
    DEFAULT_STORE_FILTERS,
    getActiveBranches,
    getMainCategories,
    getProductTotalStock,
} from '../../lib/appConfig';
import StoreProductCard from './StoreProductCard';
import StoreSidebar from './StoreSidebar';

interface StoreProductsProps {
    products: Product[];
    onProductClick: (product: Product) => void;
    addToCart: (product: Product, quantity: number) => void;
    filters: StoreFilters;
    setFilters: React.Dispatch<React.SetStateAction<StoreFilters>>;
    loading?: boolean;
    wishlistIds?: number[];
    onToggleWishlist?: (product: Product) => void;
    showWishlistOnly?: boolean;
    setShowWishlistOnly?: (v: boolean) => void;
    onlyDiscounted?: boolean;
    setOnlyDiscounted?: (v: boolean) => void;
    onQuickShare?: (product: Product) => void;
}

const SkeletonCard = () => (
    <div className="bg-white dark:bg-[#0d1323] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col h-full border border-slate-200/75 dark:border-white/[0.07]">
        <div className="h-36 sm:h-52 shimmer-skeleton" />
        <div className="p-3 sm:p-4 flex flex-col flex-grow gap-2.5">
            <div className="h-4 shimmer-skeleton rounded-full w-3/4" />
            <div className="h-3 shimmer-skeleton rounded-full w-1/2" />
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
                <div className="h-5 shimmer-skeleton rounded-full w-1/3" />
                <div className="h-9 shimmer-skeleton rounded-xl w-full" />
            </div>
        </div>
    </div>
);

const StoreProducts: React.FC<StoreProductsProps> = ({
    products,
    onProductClick,
    addToCart,
    filters,
    setFilters,
    loading,
    wishlistIds = [],
    onToggleWishlist,
    showWishlistOnly = false,
    setShowWishlistOnly,
    onlyDiscounted = false,
    setOnlyDiscounted,
    onQuickShare,
}) => {
    const { appCustomization, globalLoading, allStoreProducts } = useStore(state => ({
        appCustomization: state.appData?.appCustomization,
        globalLoading: state.isLoading,
        allStoreProducts: state.appData?.products || [],
    }));
    const activeBranches = getActiveBranches(appCustomization);
    const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'discount'>('default');
    const [gridCols, setGridCols] = useState<3 | 4>(3);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    useEffect(() => {
        if (!isMobileFiltersOpen || typeof document === 'undefined') return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isMobileFiltersOpen]);

    const catalogPool = allStoreProducts.length > 0 ? allStoreProducts : products;
    const quickCategories = useMemo(() => {
        const cats = getMainCategories(appCustomization, catalogPool);
        return cats.map(cat => ({
            name: cat,
            count: catalogPool.filter(p => p.mainCategory === cat).length,
        }));
    }, [appCustomization, catalogPool]);

    const filteredProducts = useMemo(() => {
        const list = products.filter(p => {
            const matchesCategory = filters.category === 'all' || p.mainCategory === filters.category;
            const matchesSubCategory =
                !filters.subCategory ||
                filters.subCategory === 'all' ||
                p.subCategory === filters.subCategory ||
                p.category === filters.subCategory;
            const matchesBrand =
                filters.brand === 'all' ||
                Boolean(
                    p.compatibility &&
                        p.compatibility.some(c => c.toLowerCase().includes(filters.brand.toLowerCase()))
                ) ||
                String(p.brand || '').toLowerCase() === filters.brand.toLowerCase();
            const searchLower = filters.search.toLowerCase();
            const matchesSearch =
                !searchLower ||
                String(p.name || '').toLowerCase().includes(searchLower) ||
                String(p.sku || '').toLowerCase().includes(searchLower) ||
                String(p.category || '').toLowerCase().includes(searchLower) ||
                String(p.subCategory || '').toLowerCase().includes(searchLower) ||
                String(p.brand || '').toLowerCase().includes(searchLower);
            const price = Number(p.sellingPrice || 0);
            const matchesMinPrice = !filters.minPrice || price >= Number(filters.minPrice);
            const matchesMaxPrice = !filters.maxPrice || price <= Number(filters.maxPrice);
            const matchesStock = !filters.inStockOnly || getProductTotalStock(p, activeBranches) > 0;
            const matchesDiscount = !onlyDiscounted || Number(p.discount || 0) > 0;
            const matchesWishlist = !showWishlistOnly || wishlistIds.includes(p.id);
            return (
                matchesCategory &&
                matchesSubCategory &&
                matchesBrand &&
                matchesSearch &&
                matchesMinPrice &&
                matchesMaxPrice &&
                matchesStock &&
                matchesDiscount &&
                matchesWishlist
            );
        });

        if (sortBy === 'price_asc') {
            return [...list].sort((a, b) => Number(a.sellingPrice || 0) - Number(b.sellingPrice || 0));
        }
        if (sortBy === 'price_desc') {
            return [...list].sort((a, b) => Number(b.sellingPrice || 0) - Number(a.sellingPrice || 0));
        }
        if (sortBy === 'discount') {
            return [...list].sort((a, b) => Number(b.discount || 0) - Number(a.discount || 0));
        }
        return list;
    }, [products, filters, sortBy, activeBranches, onlyDiscounted, showWishlistOnly, wishlistIds]);

    const activeChips = useMemo(() => {
        const chips: { key: string; label: string; onClear: () => void }[] = [];
        if (filters.category !== 'all') {
            chips.push({
                key: 'cat',
                label: `القسم: ${filters.category}`,
                onClear: () => setFilters(prev => ({ ...prev, category: 'all', subCategory: 'all' })),
            });
        }
        if (filters.subCategory && filters.subCategory !== 'all') {
            chips.push({
                key: 'sub',
                label: filters.subCategory,
                onClear: () => setFilters(prev => ({ ...prev, subCategory: 'all' })),
            });
        }
        if (filters.brand !== 'all') {
            chips.push({
                key: 'brand',
                label: `الماركة: ${filters.brand}`,
                onClear: () => setFilters(prev => ({ ...prev, brand: 'all' })),
            });
        }
        if (filters.search.trim()) {
            chips.push({
                key: 'search',
                label: `بحث: ${filters.search.trim()}`,
                onClear: () => setFilters(prev => ({ ...prev, search: '' })),
            });
        }
        if (filters.minPrice || filters.maxPrice) {
            chips.push({
                key: 'price',
                label: `السعر: ${filters.minPrice || '0'} - ${filters.maxPrice || '∞'}`,
                onClear: () => setFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' })),
            });
        }
        if (filters.inStockOnly) {
            chips.push({
                key: 'stock',
                label: 'المتوفر فقط',
                onClear: () => setFilters(prev => ({ ...prev, inStockOnly: false })),
            });
        }
        if (onlyDiscounted && setOnlyDiscounted) {
            chips.push({
                key: 'deals',
                label: 'العروض والتخفيضات 🔥',
                onClear: () => setOnlyDiscounted(false),
            });
        }
        if (showWishlistOnly && setShowWishlistOnly) {
            chips.push({
                key: 'wish',
                label: 'المفضلة ❤️',
                onClear: () => setShowWishlistOnly(false),
            });
        }
        return chips;
    }, [filters, onlyDiscounted, showWishlistOnly, setFilters, setOnlyDiscounted, setShowWishlistOnly]);

    const clearAllFilters = () => {
        setFilters(DEFAULT_STORE_FILTERS);
        setOnlyDiscounted?.(false);
        setShowWishlistOnly?.(false);
    };

    const isLoading = (Boolean(loading) || globalLoading) && products.length === 0;

    return (
        <section id="store-products" className="container mx-auto px-3 sm:px-6 py-10 sm:py-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
                <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full brand-soft-bg text-primary text-xs font-extrabold mb-2">
                        <i className="fas fa-th-large text-[10px]" />
                        الكتالوج الكامل
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        جميع المنتجات
                    </h2>
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                    تم إيجاد <strong className="text-slate-900 dark:text-white tabular-nums">{filteredProducts.length}</strong> منتج
                </span>
            </div>

            {/* Quick Interactive Category & Deals Pill Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 sm:mb-6 hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
                <button
                    type="button"
                    onClick={() => {
                        setFilters(prev => ({ ...prev, category: 'all', subCategory: 'all' }));
                        setOnlyDiscounted?.(false);
                        setShowWishlistOnly?.(false);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold border transition-all ${
                        filters.category === 'all' && !onlyDiscounted && !showWishlistOnly
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white dark:bg-[#0d1323] text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-white/10 hover:border-primary/40'
                    }`}
                >
                    الكل ({catalogPool.length})
                </button>

                {quickCategories.map(cat => (
                    <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                            setFilters(prev => ({ ...prev, category: cat.name, subCategory: 'all' }));
                            setShowWishlistOnly?.(false);
                        }}
                        className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-bold border transition-all ${
                            filters.category === cat.name && !showWishlistOnly
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white dark:bg-[#0d1323] text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-white/10 hover:border-primary/40'
                        }`}
                    >
                        {cat.name}
                        {cat.count > 0 && <span className="opacity-70 mr-1">({cat.count})</span>}
                    </button>
                ))}

                {setOnlyDiscounted && (
                    <button
                        type="button"
                        onClick={() => {
                            setOnlyDiscounted(!onlyDiscounted);
                            setShowWishlistOnly?.(false);
                        }}
                        className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold border transition-all ${
                            onlyDiscounted
                                ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100'
                        }`}
                    >
                        العروض 🔥
                    </button>
                )}

                {setShowWishlistOnly && (
                    <button
                        type="button"
                        onClick={() => {
                            setShowWishlistOnly(!showWishlistOnly);
                            setOnlyDiscounted?.(false);
                        }}
                        className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold border transition-all flex items-center gap-1.5 ${
                            showWishlistOnly
                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                : 'bg-white dark:bg-[#0d1323] text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-white/10 hover:border-rose-300'
                        }`}
                    >
                        <span>المفضلة ❤️</span>
                        {wishlistIds.length > 0 && (
                            <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                    showWishlistOnly
                                        ? 'bg-white/20 text-white'
                                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                                }`}
                            >
                                {wishlistIds.length}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Active Filter Chips */}
            {activeChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-5">
                    {activeChips.map(chip => (
                        <button
                            key={chip.key}
                            type="button"
                            onClick={chip.onClear}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-800 dark:text-slate-100 text-xs font-bold hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/20 transition-colors"
                        >
                            <span>{chip.label}</span>
                            <i className="fas fa-times text-[10px]" />
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline px-2"
                    >
                        مسح الكل
                    </button>
                </div>
            )}

            {/* Mobile Search + Filters Drawer Trigger + Sort Toolbar */}
            <div className="lg:hidden space-y-2.5 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        value={filters.search}
                        onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        placeholder="ابحث عن منتج أو كود..."
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0d1323] border border-slate-200/80 dark:border-white/10 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                    <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsMobileFiltersOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-white dark:bg-[#0d1323] border border-slate-200/80 dark:border-white/10 rounded-xl font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 shadow-sm"
                    >
                        <i className="fas fa-sliders-h text-primary" />
                        <span>تصفية متقدمة</span>
                        {activeChips.length > 0 && (
                            <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {activeChips.length}
                            </span>
                        )}
                    </button>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        aria-label="ترتيب المنتجات"
                        className="flex-1 py-2.5 px-3 bg-white dark:bg-[#0d1323] border border-slate-200/80 dark:border-white/10 rounded-xl font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 shadow-sm outline-none"
                    >
                        <option value="default">الترتيب الافتراضي</option>
                        <option value="price_asc">الأقل سعراً</option>
                        <option value="price_desc">الأعلى سعراً</option>
                        <option value="discount">أعلى خصم</option>
                    </select>
                </div>
            </div>

            {/* Mobile Filter Slide-Over Drawer */}
            {isMobileFiltersOpen && (
                <div className="fixed inset-0 z-[110] lg:hidden flex">
                    <div
                        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
                        onClick={() => setIsMobileFiltersOpen(false)}
                    />
                    <div className="relative mr-auto h-[100dvh] w-[88vw] max-w-sm bg-slate-50 dark:bg-[#060913] shadow-2xl flex flex-col z-10 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-[#0d1323] border-b border-slate-200 dark:border-white/10 shrink-0">
                            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                                <i className="fas fa-filter text-primary" />
                                <span>الفلاتر والتصنيف</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsMobileFiltersOpen(false)}
                                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-200"
                                aria-label="إغلاق الفلاتر"
                            >
                                <i className="fas fa-times" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                            <StoreSidebar products={products} filters={filters} setFilters={setFilters} />
                        </div>
                        <div className="p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-white dark:bg-[#0d1323] border-t border-slate-200 dark:border-white/10 flex items-center gap-2.5 shrink-0">
                            {activeChips.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearAllFilters}
                                    className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs"
                                >
                                    مسح
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsMobileFiltersOpen(false)}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-extrabold text-sm shadow-md"
                            >
                                عرض النتائج ({filteredProducts.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-7">
                {/* Desktop Sidebar */}
                <div className="hidden lg:block shrink-0">
                    <StoreSidebar products={products} filters={filters} setFilters={setFilters} />
                </div>

                <div className="flex-grow min-w-0">
                    {/* Desktop Toolbar */}
                    <div className="hidden lg:flex items-center justify-between mb-5 bg-white dark:bg-[#0d1323] px-5 py-3.5 rounded-2xl border border-slate-200/75 dark:border-white/[0.07] shadow-sm">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            عرض <strong className="text-primary tabular-nums">{filteredProducts.length}</strong> منتج
                        </span>
                        <div className="flex items-center gap-3">
                            {/* Grid Density Toggle */}
                            <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] p-1 rounded-xl border border-slate-200/60 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setGridCols(3)}
                                    title="عرض 3 أعمدة"
                                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
                                        gridCols === 3
                                            ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    3 أعمدة
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGridCols(4)}
                                    title="عرض 4 أعمدة"
                                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
                                        gridCols === 4
                                            ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    4 أعمدة
                                </button>
                            </div>

                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as any)}
                                className="px-3.5 py-2 bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="default">الترتيب الافتراضي</option>
                                <option value="price_asc">السعر: من الأقل للأعلى</option>
                                <option value="price_desc">السعر: من الأعلى للأقل</option>
                                <option value="discount">الأكثر خصماً</option>
                            </select>
                        </div>
                    </div>

                    <div
                        className={`grid grid-cols-2 sm:grid-cols-2 ${
                            gridCols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
                        } gap-3 sm:gap-5`}
                    >
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)
                        ) : filteredProducts.length > 0 ? (
                            filteredProducts.map(product => (
                                <StoreProductCard
                                    key={product.id}
                                    product={product}
                                    onProductClick={onProductClick}
                                    onAddToCart={addToCart}
                                    isWishlisted={wishlistIds.includes(product.id)}
                                    onToggleWishlist={onToggleWishlist}
                                    onQuickShare={onQuickShare}
                                />
                            ))
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center text-center py-14 sm:py-20 px-4 bg-white dark:bg-[#0d1323] rounded-3xl border border-slate-200/75 dark:border-white/[0.07]">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-white/[0.06] rounded-full flex items-center justify-center mb-5">
                                    <i className="fas fa-search text-3xl text-slate-400" />
                                </div>
                                <h4 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white mb-2">
                                    لا توجد منتجات تطابق اختياراتك
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                                    جرب مسح الفلاتر الحالية أو البحث بكلمة أخرى لاستعراض جميع المنتجات المتاحة.
                                </p>
                                <button
                                    type="button"
                                    onClick={clearAllFilters}
                                    className="mt-5 px-6 py-2.5 bg-primary text-white font-extrabold rounded-xl hover:bg-primary-dark transition-colors shadow-sm text-sm"
                                >
                                    عرض كل المنتجات
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default StoreProducts;
