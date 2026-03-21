import React from 'react';
import { Product } from '../../types';
import StoreProductCard from './StoreProductCard';
import StoreSidebar from './StoreSidebar';

interface StoreProductsProps {
    products: Product[];
    onProductClick: (product: Product) => void;
    addToCart: (product: Product, quantity: number) => void;
    filters: { category: string; brand: string; search: string };
    setFilters: React.Dispatch<React.SetStateAction<{ category: string; brand: string; search: string }>>;
}

const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full animate-pulse border border-gray-100 dark:border-gray-700">
        <div className="h-40 sm:h-48 bg-gray-200 dark:bg-gray-700"></div>
        <div className="p-4 flex flex-col flex-grow">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2 mb-4"></div>
            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-1/3 mb-3"></div>
                <div className="flex items-center justify-between">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3"></div>
                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded-lg w-1/3"></div>
                </div>
            </div>
        </div>
    </div>
);


const StoreProducts: React.FC<StoreProductsProps> = ({ products, onProductClick, addToCart, filters, setFilters }) => {

    const filteredProducts = products.filter(p => {
        const matchesCategory = filters.category === 'all' || p.mainCategory === filters.category;
        const matchesBrand = filters.brand === 'all' || (p.compatibility && p.compatibility.some(c => c.toLowerCase().startsWith(filters.brand.toLowerCase())));
        const matchesSearch = p.name.toLowerCase().includes(filters.search.toLowerCase()) || p.sku.toLowerCase().includes(filters.search.toLowerCase());
        return matchesCategory && matchesBrand && matchesSearch;
    });

    const isLoading = products.length === 0;

    return (
        <div id="store-products" className="container mx-auto px-4 sm:px-6 py-16">
            <div className="flex flex-col items-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4 text-center">جميع المنتجات</h2>
                <div className="w-24 h-1.5 bg-primary rounded-full"></div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8">
                <StoreSidebar products={products} filters={filters} setFilters={setFilters} />
                <div className="flex-grow">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                        {isLoading ? (
                            Array.from({ length: 10 }).map((_, index) => <SkeletonCard key={index} />)
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
                            <div className="col-span-full flex flex-col items-center justify-center text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700">
                                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                                    <i className="fas fa-search text-4xl text-gray-400 dark:text-gray-500"></i>
                                </div>
                                <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-2">لا توجد منتجات تطابق بحثك</h4>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md">حاول تعديل الفلاتر أو استخدام كلمات بحث مختلفة للعثور على ما تبحث عنه.</p>
                                <button 
                                    onClick={() => setFilters({ category: 'all', brand: 'all', search: '' })}
                                    className="mt-6 px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
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