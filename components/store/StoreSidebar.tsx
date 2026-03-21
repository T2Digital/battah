import React, { useMemo } from 'react';
import { Product } from '../../types';

interface StoreSidebarProps {
    products: Product[];
    filters: { category: string; brand: string; search: string };
    setFilters: React.Dispatch<React.SetStateAction<{ category: string; brand: string; search: string }>>;
}

const StoreSidebar: React.FC<StoreSidebarProps> = ({ products, filters, setFilters }) => {
    const { categories, partBrands, carBrands } = useMemo(() => {
        const catSet = new Set<string>(['قطع غيار', 'كماليات و إكسسوارات', 'زيوت وشحومات', 'بطاريات', 'إطارات']);
        const partBrandSet = new Set<string>();
        
        // Comprehensive list of popular car brands in Egypt
        const defaultCarBrands = [
            "Toyota", "Hyundai", "Kia", "Chevrolet", "Nissan", "Renault", "Peugeot", 
            "Fiat", "Suzuki", "Mitsubishi", "Honda", "Skoda", "Volkswagen", "Opel", 
            "BMW", "Mercedes-Benz", "Chery", "MG", "Lada", "BYD", "Jeep", "Ford", 
            "Mazda", "Seat", "Geely", "Daewoo", "Speranza", "Audi", "Subaru", "Volvo"
        ];
        const carBrandSet = new Set<string>(defaultCarBrands);
        
        products.forEach(p => {
            catSet.add(p.mainCategory);
            partBrandSet.add(p.brand);
            if (p.compatibility) {
                p.compatibility.forEach(comp => {
                    const brand = comp.split(' ')[0]; // Extract first word (e.g., "Toyota" from "Toyota Corolla 2020")
                    if (brand) carBrandSet.add(brand);
                });
            }
        });
        
        return { 
            categories: [...catSet].sort(), 
            partBrands: [...partBrandSet].sort(),
            carBrands: [...carBrandSet].sort()
        };
    }, [products]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <aside className="lg:w-1/4 space-y-6">
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
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-layer-group text-primary"></i>
                    الفئات
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
                        <span className="text-gray-700 dark:text-gray-300">كل الفئات</span>
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
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-car text-primary"></i>
                    ماركة السيارة
                </h3>
                <div className="relative">
                    <select 
                        name="brand" 
                        value={filters.brand} 
                        onChange={handleFilterChange} 
                        className="w-full appearance-none pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    >
                        <option value="all">كل الماركات</option>
                        {carBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                    <i className="fas fa-chevron-down absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                </div>
            </div>
        </aside>
    );
};

export default StoreSidebar;