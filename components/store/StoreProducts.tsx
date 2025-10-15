import React, { useState, useMemo, useEffect } from 'react';
import { Product, MainCategory } from '../../types';
import StoreProductCard from './StoreProductCard';

interface StoreProductsProps {
    products: Product[];
    onProductClick: (product: Product) => void;
    addToCart: (product: Product, quantity: number) => void;
    activeCategory: MainCategory | '';
}

const allMakes = ['تويوتا', 'هيونداي', 'كيا', 'نيسان', 'شيفروليه', 'مرسيدس', 'BMW'];
const allModels: { [key: string]: string[] } = {
    'تويوتا': ['كورولا', 'كامري', 'يارس', 'RAV4'],
    'هيونداي': ['النترا', 'توسان', 'أكسنت'],
    'كيا': ['سبورتاج', 'سيراتو', 'ريو'],
    'نيسان': ['صني', 'قشقاي', 'سنترا'],
};
const allYears = Array.from({length: 15}, (_, i) => new Date().getFullYear() - i);


const StoreProducts: React.FC<StoreProductsProps> = ({ products, onProductClick, addToCart, activeCategory }) => {
    const [filters, setFilters] = useState({
        mainCategory: '' as MainCategory | '',
        make: '',
        model: '',
        year: '',
        search: ''
    });
    
    useEffect(() => {
        setFilters(f => ({...f, mainCategory: activeCategory, search: ''}))
    }, [activeCategory]);


    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const searchLower = filters.search.toLowerCase();
            if (filters.mainCategory && p.mainCategory !== filters.mainCategory) return false;
            
            if (filters.search && !(
                p.name.toLowerCase().includes(searchLower) ||
                p.sku.toLowerCase().includes(searchLower) ||
                p.brand.toLowerCase().includes(searchLower) ||
                p.category.toLowerCase().includes(searchLower)
            )) return false;
            
            if (filters.make) {
                const isCompatible = p.compatibility.some(c => {
                    if (c.make !== filters.make) return false;
                    if (filters.model && c.model !== filters.model) return false;
                    if (filters.year && !c.years.includes(Number(filters.year))) return false;
                    return true;
                });
                if (!isCompatible && p.compatibility.length > 0) return false;
            }

            return true;
        });
    }, [products, filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'make' && { model: '', year: '' }), // Reset model/year if make changes
            ...(name === 'model' && { year: '' }), // Reset year if model changes
        }));
    };
    
    return (
        <div id="store-products" className="container mx-auto p-4 sm:p-8">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg mb-8">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">ابحث عن قطعتك المثالية</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <input type="text" name="search" placeholder="ابحث بالاسم, الكود, الماركة..." value={filters.search} onChange={handleFilterChange} className="lg:col-span-2 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary"/>
                    <select name="make" value={filters.make} onChange={handleFilterChange} className="p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary">
                        <option value="">كل الماركات</option>
                        {allMakes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select name="model" value={filters.model} onChange={handleFilterChange} disabled={!filters.make} className="p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary disabled:opacity-50">
                        <option value="">كل الموديلات</option>
                        {filters.make && allModels[filters.make]?.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select name="year" value={filters.year} onChange={handleFilterChange} disabled={!filters.model} className="p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary disabled:opacity-50">
                        <option value="">كل السنوات</option>
                        {filters.model && allYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex justify-center gap-2 mb-8 flex-wrap">
                {(['', 'قطع غيار', 'ميكانيكا', 'كماليات'] as const).map(cat => (
                    <button key={cat} onClick={() => setFilters(f => ({...f, mainCategory: cat as MainCategory | ''}))}
                    className={`px-4 py-2 rounded-full font-semibold transition-colors text-sm sm:text-base ${filters.mainCategory === cat ? 'bg-primary-dark text-white shadow-md' : 'bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                        {cat === '' ? 'كل المنتجات' : cat}
                    </button>
                ))}
            </div>

            {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredProducts.map(product => (
                        <StoreProductCard 
                            key={product.id} 
                            product={product} 
                            onProductClick={onProductClick}
                            onAddToCart={() => addToCart(product, 1)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <i className="fas fa-search text-5xl text-gray-400 mb-4"></i>
                    <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300">لا توجد منتجات مطابقة لبحثك</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">حاول تغيير الفلاتر أو البحث عن كلمة أخرى.</p>
                </div>
            )}
        </div>
    );
};

export default StoreProducts;