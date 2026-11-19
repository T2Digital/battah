import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../../types';
import useStore from '../../lib/store';
import {
    StoreFilters,
    DEFAULT_STORE_FILTERS,
    getActiveBranches,
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
}

const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full animate-pulse border border-gray-100 dark:border-gray-700">
        <div className="h-32 sm:h-48 bg-gray-200 dark:bg-gray-700"></div>
        <div className="p-3 sm:p-4 flex flex-col flex-grow">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2 mb-4"></div>
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded-full w-1/3 mb-3"></div>
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
            </div>
        </div>
    </div>
);


const StoreProducts: React.FC<StoreProductsProps> = ({ products, onProductClick, addToCart, filters, setFilters, loading }) => {
    const { appCustomization, globalLoading } = useStore(state => ({
        appCustomization: state.appData?.appCustomization,
        globalLoading: state.isLoading,
    }));
    const activeBranches = getActiveBranches(appCustomization);
    const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'discount'>('default');
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    useEffect(() => {
        if (!isMobileFiltersOpen || typeof document === 'undefined') return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isMobileFiltersOpen]);

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
                Boolean(p.compatibility && p.compatibility.some(c => c.toLowerCase().includes(filters.brand.toLowerCase()))) ||
                String(p.brand || '').toLowerCase() === filters.brand.toLowerCase();
            const searchLower = filters.search.toLowerCase();
            const matchesSearch =
                !searchLower ||
                String(p.name || '').toLowerCase().includes(searchLower) ||
                String(p.sku || '').toLowerCase().includes(searchLower) ||
                String(p.category || '').toLowerCase().includes(searchLower) ||
                String(p.subCategory || '').toLowerCase().includes(searchLower);
            const price = Number(p.sellingPrice || 0);
            const matchesMinPrice = !filters.minPrice || price >= Number(filters.minPrice);
            const matchesMaxPrice = !filters.maxPrice || price <= Number(filters.maxPrice);
            const matchesStock = !filters.inStockOnly || getProductTotalStock(p, activeBranches) > 0;
            return matchesCategory && matchesSubCategory && matchesBrand && matchesSearch && matchesMinPrice && matchesMaxPrice && matchesStock;
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
    }, [products, filters, sortBy, activeBranches]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.category !== 'all') count++;
        if (filters.subCategory && filters.subCategory !== 'all') count++;
        if (filters.brand !== 'all') count++;
        if (filters.search.trim()) count++;
        if (filters.minPrice) count++;
        if (filters.maxPrice) count++;
        if (filters.inStockOnly) count++;
        return count;
    }, [filters]);

    const isLoading = (Boolean(loading) || globalLoading) && products.length === 0;

    return (
        <div id="store-products" className="container mx-auto px-3 sm:px-6 py-10 sm:py-16">
            <div className="flex flex-col items-center mb-8 sm:mb-12">
                <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white mb-3 text-center">جميع المنتجات</h2>
                <div className="w-20 sm:w-24 h-1.5 bg-primary rounded-full"></div>
            </div>

            {/* Mobile Search + Filters Drawer Trigger + Sort Toolbar */}
            <div className="lg:hidden space-y-2.5 mb-5">
                <div className="relative">
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        placeholder="ابحث عن منتج أو كود..."
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                    <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsMobileFiltersOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-200 shadow-sm"
                    >
                        <i className="fas fa-sliders-h text-primary"></i>
                        <span>تصفية المنتجات</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        aria-label="ترتيب المنتجات"
                        className="flex-1 py-2.5 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-200 shadow-sm outline-none"
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
                        className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm"
                        onClick={() => setIsMobileFiltersOpen(false)}
                    />
                    <div className="relative mr-auto h-[100dvh] w-[88vw] max-w-sm bg-slate-50 dark:bg-gray-900 shadow-2xl flex flex-col z-10 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                                <i className="fas fa-filter text-primary"></i>
                                <span>الفلاتر والتصنيف</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsMobileFiltersOpen(false)}
                                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300"
                                aria-label="إغلاق الفلاتر"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                            <StoreSidebar products={products} filters={filters} setFilters={setFilters} />
                        </div>
                        <div className="p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2.5 shrink-0">
                            {activeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setFilters(DEFAULT_STORE_FILTERS)}
                                    className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs"
                                >
                                    مسح
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsMobileFiltersOpen(false)}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md"
                            >
                                عرض النتائج ({filteredProducts.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Desktop Sidebar */}
                <div className="hidden lg:block shrink-0">
                    <StoreSidebar products={products} filters={filters} setFilters={setFilters} />
                </div>

                <div className="flex-grow min-w-0">
                    {/* Desktop Toolbar */}
                    <div className="hidden lg:flex items-center justify-between mb-5 bg-white dark:bg-gray-800 px-5 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                            عرض <strong className="text-primary">{filteredProducts.length}</strong> منتج
                        </span>
                        <div className="flex items-center gap-3">
                            {activeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setFilters(DEFAULT_STORE_FILTERS)}
                                    className="text-xs font-bold text-red-500 hover:underline"
                                >
                                    مسح الفلاتر ({activeFilterCount})
                                </button>
                            )}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="default">الترتيب الافتراضي</option>
                                <option value="price_asc">السعر: من الأقل للأعلى</option>
                                <option value="price_desc">السعر: من الأعلى للأقل</option>
                                <option value="discount">الأكثر خصماً</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)
                        ) : filteredProducts.length > 0 ? (
                            filteredProducts.map(product => (
                                <StoreProductCard
                                    key={product.id}
                                    product={product}
                                    onProductClick={onProductClick}
                                    onAddToCart={addToCart}
                                />
                            ))
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center text-center py-14 sm:py-20 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-5">
                                    <i className="fas fa-search text-3xl text-gray-400 dark:text-gray-500"></i>
                                </div>
                                <h4 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white mb-2">لا توجد منتجات تطابق بحثك</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">حاول تعديل الفلاتر أو استخدام كلمات بحث مختلفة للعثور على ما تبحث عنه.</p>
                                <button 
                                    type="button"
                                    onClick={() => setFilters(DEFAULT_STORE_FILTERS)}
                                    className="mt-5 px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-sm"
                                >
                                    مسح الفلاتر
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreProducts;