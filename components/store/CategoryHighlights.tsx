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
    { icon: 'fa-cogs', color: 'from-blue-500 to-blue-600' },
    { icon: 'fa-car-battery', color: 'from-emerald-500 to-emerald-600' },
    { icon: 'fa-star', color: 'from-amber-500 to-amber-600' },
    { icon: 'fa-oil-can', color: 'from-purple-500 to-purple-600' },
    { icon: 'fa-dot-circle', color: 'from-rose-500 to-rose-600' },
    { icon: 'fa-wrench', color: 'from-cyan-500 to-cyan-600' },
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
            return {
                name,
                filterValue: name,
                icon: theme.icon,
                color: theme.color,
                desc: subs.length > 0 ? subs.slice(0, 3).join(' • ') : 'تصفح كافة المنتجات المتاحة في هذا القسم',
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
        <div id="category-highlights" className="bg-slate-50 dark:bg-gray-900 py-16">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">تسوق حسب القسم</h2>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">اختر القسم المناسب لاحتياجاتك وتصفح أحدث المنتجات عالية الجودة</p>
                </div>
                <div className={`grid grid-cols-1 ${gridColsClass} gap-6 lg:gap-8`}>
                    {categories.map(cat => (
                        <div 
                            key={cat.name}
                            onClick={() => handleCategoryClick(cat.filterValue)}
                            className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 dark:border-gray-700"
                        >
                            {/* Background Gradient Hover Effect */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                            
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center text-3xl mb-6 transform group-hover:-translate-y-2 transition-transform duration-300 shadow-lg`}>
                                    <i className={`fas ${cat.icon}`}></i>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">{cat.name}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">{cat.desc}</p>
                                
                                <div className="mt-6 flex items-center text-primary font-semibold opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                    <span>تصفح المنتجات</span>
                                    <i className="fas fa-arrow-left mr-2 text-sm"></i>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoryHighlights;