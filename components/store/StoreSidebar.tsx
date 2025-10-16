import React from 'react';
import { Product } from '../../types';

interface StoreSidebarProps {
    products: Product[];
    filters: { category: string; brand: string; search: string };
    setFilters: React.Dispatch<React.SetStateAction<{ category: string; brand: string; search: string }>>;
}

const StoreSidebar: React.FC<StoreSidebarProps> = ({ products, filters, setFilters }) => {
    const categories = [...new Set(products.map(p => p.mainCategory))];
    const brands = [...new Set(products.map(p => p.brand))];

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
                    placeholder="اسم المنتج..."
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
                <h3 className="font-bold mb-2">الماركات</h3>
                <select name="brand" value={filters.brand} onChange={handleFilterChange} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="all">كل الماركات</option>
                    {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                </select>
            </div>
        </aside>
    );
};

export default StoreSidebar;
