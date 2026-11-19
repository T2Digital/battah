import React, { useMemo } from 'react';
import { Product } from '../../types';
import useStore from '../../lib/store';
import {
    StoreFilters,
    getMainCategories,
    getSubCategoriesMap,
    getStorefrontFiltersConfig,
} from '../../lib/appConfig';

interface StoreSidebarProps {
    products: Product[];
    filters: StoreFilters;
    setFilters: React.Dispatch<React.SetStateAction<StoreFilters>>;
}

const StoreSidebar: React.FC<StoreSidebarProps> = ({ products, filters, setFilters }) => {
    const { appCustomization, storeProducts } = useStore(state => ({
        appCustomization: state.appData?.appCustomization,
        storeProducts: state.appData?.products || [],
    }));

    const sourceProducts = storeProducts.length > 0 ? storeProducts : products;
    const filterConfig = useMemo(
        () => getStorefrontFiltersConfig(appCustomization),
        [appCustomization]
    );

    const { categories, subCategories, brandOptions } = useMemo(() => {
        const cats = getMainCategories(appCustomization, sourceProducts);
        const subMap = getSubCategoriesMap(appCustomization);

        const subSet = new Set<string>();
        if (filters.category === 'all') {
            Object.values(subMap).forEach(list => list.forEach(s => s && subSet.add(s)));
            sourceProducts.forEach(p => {
                const sub = (p.subCategory || p.category || '').trim();
                if (sub) subSet.add(sub);
            });
        } else {
            (subMap[filters.category] || []).forEach(s => s && subSet.add(s));
            sourceProducts
                .filter(p => p.mainCategory === filters.category)
                .forEach(p => {
                    const sub = (p.subCategory || p.category || '').trim();
                    if (sub) subSet.add(sub);
                });
        }

        const brandSet = new Set<string>(filterConfig.brandFilterOptions);
        sourceProducts.forEach(p => {
            if (p.brand) brandSet.add(String(p.brand).trim());
            if (p.compatibility) {
                p.compatibility.forEach(comp => {
                    const brand = String(comp || '').split(' ')[0]?.trim();
                    if (brand) brandSet.add(brand);
                });
            }
        });

        return {
            categories: cats,
            subCategories: Array.from(subSet),
            brandOptions: Array.from(brandSet).filter(Boolean).sort(),
        };
    }, [appCustomization, sourceProducts, filters.category, filterConfig.brandFilterOptions]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'category') {
            setFilters(prev => ({ ...prev, category: value, subCategory: 'all' }));
            return;
        }
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const cardCls =
        'bg-white dark:bg-[#0d1323] p-5 rounded-2xl shadow-sm border border-slate-200/75 dark:border-white/[0.07]';

    return (
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
            {filterConfig.showSearch && (
                <div className={cardCls}>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <i className="fas fa-search text-primary text-xs" />
                        ابحث عن منتج
                    </h3>
                    <div className="relative">
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="اسم المنتج أو الكود..."
                            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                        />
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    </div>
                </div>
            )}

            {filterConfig.showCategoryFilter && (
                <div className={cardCls}>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <i className="fas fa-layer-group text-primary text-xs" />
                        الأقسام الرئيسية
                    </h3>
                    <div className="space-y-1.5">
                        {(['all', ...categories] as string[]).map(cat => {
                            const isActive = filters.category === cat;
                            const label = cat === 'all' ? 'كل الأقسام' : cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() =>
                                        setFilters(prev => ({ ...prev, category: cat, subCategory: 'all' }))
                                    }
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-right ${
                                        isActive
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                                    }`}
                                >
                                    <span className="truncate">{label}</span>
                                    {isActive && <i className="fas fa-check text-[10px] shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {filterConfig.showSubCategoryFilter && subCategories.length > 0 && (
                <div className={cardCls}>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <i className="fas fa-tags text-primary text-xs" />
                        الأقسام الفرعية
                    </h3>
                    <div className="relative">
                        <select
                            name="subCategory"
                            value={filters.subCategory}
                            onChange={handleFilterChange}
                            className="w-full appearance-none pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="all">كل الأقسام الفرعية</option>
                            {subCategories.map(sub => (
                                <option key={sub} value={sub}>
                                    {sub}
                                </option>
                            ))}
                        </select>
                        <i className="fas fa-chevron-down absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    </div>
                </div>
            )}

            {filterConfig.showBrandFilter && (
                <div className={cardCls}>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <i className="fas fa-tag text-primary text-xs" />
                        {filterConfig.brandFilterLabel}
                    </h3>
                    <div className="relative">
                        <select
                            name="brand"
                            value={filters.brand}
                            onChange={handleFilterChange}
                            className="w-full appearance-none pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="all">الكل</option>
                            {brandOptions.map(brand => (
                                <option key={brand} value={brand}>
                                    {brand}
                                </option>
                            ))}
                        </select>
                        <i className="fas fa-chevron-down absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    </div>
                </div>
            )}

            {filterConfig.showPriceFilter && (
                <div className={cardCls}>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <i className="fas fa-coins text-primary text-xs" />
                        نطاق السعر
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                        <input
                            type="number"
                            name="minPrice"
                            min="0"
                            value={filters.minPrice}
                            onChange={handleFilterChange}
                            placeholder="من"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                        <input
                            type="number"
                            name="maxPrice"
                            min="0"
                            value={filters.maxPrice}
                            onChange={handleFilterChange}
                            placeholder="إلى"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            )}

            {filterConfig.showInStockOnlyFilter && (
                <div className={cardCls}>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={filters.inStockOnly}
                        onClick={() => setFilters(prev => ({ ...prev, inStockOnly: !prev.inStockOnly }))}
                        className="w-full flex items-center justify-between gap-3 cursor-pointer"
                    >
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <i className="fas fa-check-circle text-emerald-500" />
                            عرض المتوفر فقط
                        </span>
                        <span
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                                filters.inStockOnly ? 'bg-primary' : 'bg-slate-200 dark:bg-white/15'
                            }`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${
                                    filters.inStockOnly ? '-translate-x-5' : '-translate-x-0.5'
                                }`}
                            />
                        </span>
                    </button>
                </div>
            )}
        </aside>
    );
};

export default StoreSidebar;
