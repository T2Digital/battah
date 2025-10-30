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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col h-full animate-pulse">
        <div className="h-48 bg-gray-300 dark:bg-gray-700"></div>
        <div className="p-4 flex flex-col flex-grow">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            <div className="mt-auto pt-4">
                <div className="h-6 bg-gray-400 dark:bg-gray-500 rounded w-1/3 mb-2"></div>
                <div className="flex items-center justify-between mt-2">
                    <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                    <div className="h-10 bg-gray-400 dark:bg-gray-500 rounded-lg w-1/3"></div>
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
        <div id="store-products" className="container mx-auto px-4 sm:px-6 py-12">
            <h2 className="text-3xl font-bold text-center mb-8">جميع المنتجات</h2>
            <div className="flex flex-col lg:flex-row gap-8">
                <StoreSidebar products={products} filters={filters} setFilters={setFilters} />
                <div className="flex-grow">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)
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
                            <div className="sm:col-span-2 md:col-span-3 xl:col-span-4 text-center text-gray-500 py-16">
                                <i className="fas fa-search text-4xl mb-4 text-gray-400"></i>
                                <h4 className="font-bold text-lg">لا توجد منتجات تطابق بحثك</h4>
                                <p>حاول تعديل الفلاتر أو استخدام كلمات بحث مختلفة.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreProducts;