import React, { useMemo } from 'react';
import useStore from '../../lib/store';
import {
    StoreFilters,
    DEFAULT_STORE_FILTERS,
    getMainCategories,
    getSubCategoriesMap,
} from '../../lib/appConfig';

interface CategoryHighlightsProps {
    setFilters: React.Dispatch<React.SetStateAction<StoreFilters>>;
}

const PALETTE = [
    { icon: 'fa-cogs', color: 'from-sky-500 to-blue-600' },
    { icon: 'fa-car-battery', color: 'from-emerald-500 to-teal-600' },
    { icon: 'fa-star', color: 'from-amber-500 to-orange-600' },
    { icon: 'fa-oil-can', color: 'from-indigo-500 to-purple-600' },
    { icon: 'fa-dot-circle', color: 'from-rose-500 to-pink-600' },
    { icon: 'fa-wrench', color: 'from-cyan-500 to-sky-600' },
];

const CategoryHighlights: React.FC<CategoryHighlightsProps> = ({ setFilters }) => {
    const { appCustomization, products } = useStore(state => ({
        appCustomization: state.appData?.appCustomization,
        products: state.appData?.products || [],
    }));

    const categories = useMemo(() => {
        const mainCats = getMainCategories(appCustomization, products);
        const subMap = getSubCategoriesMap(appCustomization);
        return mainCats.map((name, idx) => {
            const theme = PALETTE[idx % PALETTE.length];
            const subs = subMap[name] || [];
            const matching = products.filter(p => p.mainCategory === name);
            const firstWithImage = matching.find(p => p.images?.[0] || (p as any).imageUrl);
            const previewImage = firstWithImage?.images?.[0] || (firstWithImage as any)?.imageUrl || '';
            return {
                name,
                filterValue: name,
                icon: theme.icon,
                color: theme.color,
                count: matching.length,
                previewImage,
                desc: subs.length > 0 ? subs.slice(0, 3).join(' • ') : 'تصفح أحدث المنتجات والعروض في هذا القسم',
            };
        });
    }, [appCustomization, products]);

    const handleCategoryClick = (filterValue: string) => {
        setFilters({ ...DEFAULT_STORE_FILTERS, category: filterValue });
        document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    const gridColsClass =
        categories.length <= 2
            ? 'sm:grid-cols-2'
            : categories.length === 4
                ? 'sm:grid-cols-2 lg:grid-cols-4'
                : 'sm:grid-cols-2 lg:grid-cols-3';

    return (
        <section id="category-highlights" className="py-12 sm:py-16">
            <div className="container mx-auto px-3 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7 sm:mb-10">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full brand-soft-bg text-primary text-xs font-extrabold mb-2.5">
                            <i className="fas fa-layer-group text-[11px]" />
                            أقسام المتجر
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            تسوق حسب القسم
                        </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md font-medium">
                        اختر التصنيف المناسب وتصفح المنتجات المتاحة بكل سهولة وسرعة.
                    </p>
                </div>

                {/* Mobile Horizontal Snap Story Cards */}
                <div className="sm:hidden flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory hide-scrollbar -mx-3 px-3">
                    {categories.map(cat => (
                        <button
                            key={cat.name}
                            type="button"
                            onClick={() => handleCategoryClick(cat.filterValue)}
                            className="shrink-0 w-36 snap-start bg-white dark:bg-[#0d1323] rounded-2xl p-3.5 border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col items-center text-center active:scale-95 transition-transform"
                        >
                            {cat.previewImage ? (
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 p-1.5 flex items-center justify-center mb-2.5 overflow-hidden">
                                    <img src={cat.previewImage} alt={cat.name} className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center text-xl mb-2.5 shadow-md`}>
                                    <i className={`fas ${cat.icon}`} />
                                </div>
                            )}
                            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-1 mb-1">
                                {cat.name}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-slate-400">
                                {cat.count > 0 ? `${cat.count} منتج` : 'تصفح القسم'}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Tablet / Desktop Bento Category Cards */}
                <div className={`hidden sm:grid ${gridColsClass} gap-5 lg:gap-6`}>
                    {categories.map(cat => (
                        <div
                            key={cat.name}
                            onClick={() => handleCategoryClick(cat.filterValue)}
                            className="group relative bg-white dark:bg-[#0d1323] rounded-3xl p-6 border border-slate-200/75 dark:border-white/[0.07] shadow-sm hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex items-center justify-between gap-4"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.07] text-slate-600 dark:text-slate-300">
                                        {cat.count > 0 ? `${cat.count} منتج` : 'قسم رئيسي'}
                                    </span>
                                </div>
                                <h3 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white mb-1.5 group-hover:text-primary transition-colors truncate">
                                    {cat.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                                    {cat.desc}
                                </p>
                                <span className="inline-flex items-center gap-2 text-xs font-extrabold text-primary group-hover:gap-3 transition-all">
                                    <span>تصفح المنتجات</span>
                                    <i className="fas fa-arrow-left text-[11px]" />
                                </span>
                            </div>

                            {cat.previewImage ? (
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800/70 dark:to-slate-900 border border-slate-200/60 dark:border-white/10 p-2.5 shrink-0 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                    <img src={cat.previewImage} alt={cat.name} className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center text-3xl shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                                    <i className={`fas ${cat.icon}`} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CategoryHighlights;
