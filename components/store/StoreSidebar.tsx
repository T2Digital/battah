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
            brandOptions: Array.from(brandSet).sort(),
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

    const handleInStockToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setFilters(prev => ({ ...prev, inStockOnly: checked }));
    };

    return (
        <aside className="w-full lg:w-72 shrink-0 space-y-6">
            {filterConfig.showSearch && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-search text-primary"></i>
                        ابحث عن منتج
                    </h3>
                    <div className="relative">
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="اسم المنتج أو الكود..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                        />
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>
                </div>
            )}
            
            {filterConfig.showCategoryFilter && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-layer-group text-primary"></i>
                        الأقسام الرئيسية
                    </h3>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                            <input 
                                type="radio" 
                                name="category" 
                                value="all" 
                                checked={filters.category === 'all'} 
                                onChange={handleFilterChange}
                                className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                            />
                            <span className="text-gray-700 dark:text-gray-300">كل الأقسام</span>
                        </label>
                        {categories.map(cat => (
                            <label key={cat} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                <input 
                                    type="radio" 
                                    name="category" 
                                    value={cat} 
                                    checked={filters.category === cat} 
                                    onChange={handleFilterChange}
                                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                />
                                <span className="text-gray-700 dark:text-gray-300">{cat}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {filterConfig.showSubCategoryFilter && subCategories.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-tags text-primary"></i>
                        الأقسام الفرعية
                    </h3>
                    <div className="relative">
                        <select
                            name="subCategory"
                            value={filters.subCategory}
                            onChange={handleFilterChange}
                            className="w-full appearance-none pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                        >
                            <option value="all">كل الأقسام الفرعية</option>
                            {subCategories.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                        <i className="fas fa-chevron-down absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                    </div>
                </div>
            )}
            
            {filterConfig.showBrandFilter && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-car text-primary"></i>
                        {filterConfig.brandFilterLabel}
                    </h3>
                    <div className="relative">
                        <select 
                            name="brand" 
                            value={filters.brand} 
                            onChange={handleFilterChange} 
                            className="w-full appearance-none pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                        >
                            <option value="all">الكل</option>
                            {brandOptions.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                        <i className="fas fa-chevron-down absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                    </div>
                </div>
            )}

            {filterConfig.showPriceFilter && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-money-bill-wave text-primary"></i>
                        نطاق السعر
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="number"
                            name="minPrice"
                            min="0"
                            value={filters.minPrice}
                            onChange={handleFilterChange}
                            placeholder="من"
                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                        <input
                            type="number"
                            name="maxPrice"
                            min="0"
                            value={filters.maxPrice}
                            onChange={handleFilterChange}
                            placeholder="إلى"
                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            )}

            {filterConfig.showInStockOnlyFilter && (
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <i className="fas fa-check-circle text-emerald-500"></i>
                            عرض المتوفر فقط
                        </span>
                        <input
                            type="checkbox"
                            checked={filters.inStockOnly}
                            onChange={handleInStockToggle}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                    </label>
                </div>
            )}
        </aside>
    );
};

export default StoreSidebar;