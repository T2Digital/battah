import React, { useMemo } from 'react';
import { Product } from '../../types';

interface StoreSidebarProps {
    products: Product[];
    filters: { category: string; brand: string; search: string };
    setFilters: React.Dispatch<React.SetStateAction<{ category: string; brand: string; search: string }>>;
}

const StoreSidebar: React.FC<StoreSidebarProps> = ({ products, filters, setFilters }) => {
    const { categories, partBrands, carBrands } = useMemo(() => {
        const catSet = new Set<string>();
        const partBrandSet = new Set<string>();
        const carBrandSet = new Set<string>();
        
        products.forEach(p => {
            catSet.add(p.mainCategory);
            partBrandSet.add(p.brand);
            if (p.compatibility) {
                p.compatibility.forEach(comp => {
                    const brand = comp.split(' ')[0]; // Extract first word (e.g., "Toyota" from "Toyota Corolla 2020")
                    carBrandSet.add(brand);
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
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <h3 className="font-bold mb-2">ابحث عن منتج</h3>
                <input
                    type="text"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    placeholder="اسم المنتج أو الكود..."
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <h3 className="font-bold mb-2">الفئات</h3>
                <select name="category" value={filters.category} onChange={handleFilterChange} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="all">كل الفئات</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <h3 className="font-bold mb-2">ماركة السيارة</h3>
                <select name="brand" value={filters.brand} onChange={handleFilterChange} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="all">كل الماركات</option>
                    {carBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                </select>
            </div>
        </aside>
    );
};

export default StoreSidebar;