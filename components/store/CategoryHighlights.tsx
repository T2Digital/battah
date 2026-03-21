import React from 'react';

interface CategoryHighlightsProps {
    setFilters: React.Dispatch<React.SetStateAction<{ category: string; brand: string; search: string }>>;
}

const categories = [
    { name: 'قطع غيار', icon: 'fa-cogs', filterValue: 'قطع غيار', desc: 'أصلية ومضمونة', color: 'from-blue-500 to-blue-600' },
    { name: 'ميكانيكا', icon: 'fa-wrench', filterValue: 'قطع غيار', desc: 'لجميع الموديلات', color: 'from-emerald-500 to-emerald-600' },
    { name: 'كماليات وإكسسوارات', icon: 'fa-star', filterValue: 'كماليات و إكسسوارات', desc: 'أضف لمسة لسيارتك', color: 'from-amber-500 to-amber-600' },
];

const CategoryHighlights: React.FC<CategoryHighlightsProps> = ({ setFilters }) => {

    const handleCategoryClick = (filterValue: string) => {
        setFilters({ category: filterValue, brand: 'all', search: '' });
        document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div id="category-highlights" className="bg-slate-50 dark:bg-gray-900 py-16">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">تسوق حسب القسم</h2>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">اختر القسم المناسب لاحتياجات سيارتك وتصفح آلاف المنتجات عالية الجودة</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
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