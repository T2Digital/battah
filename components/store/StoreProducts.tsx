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

const StoreProducts: React.FC<StoreProductsProps> = ({ products, onProductClick, addToCart, filters, setFilters }) => {

    const filteredProducts = products.filter(p => {
        const matchesCategory = filters.category === 'all' || p.mainCategory === filters.category;
        const matchesBrand = filters.brand === 'all' || p.brand === filters.brand;
        const matchesSearch = p.name.toLowerCase().includes(filters.search.toLowerCase());
        return matchesCategory && matchesBrand && matchesSearch;
    });

    return (
        <div id="store-products" className="container mx-auto px-4 sm:px-6 py-12">
            <h2 className="text-3xl font-bold text-center mb-8">جميع المنتجات</h2>
            <div className="flex flex-col lg:flex-row gap-8">
                <StoreSidebar products={products} filters={filters} setFilters={setFilters} />
                <div className="flex-grow">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.length > 0 ? filteredProducts.map(product => (
                            <StoreProductCard
                                key={product.id}
                                product={product}
                                onProductClick={onProductClick}
                                onAddToCart={addToCart}
                            />
                        )) : (
                            <p className="sm:col-span-2 md:col-span-3 xl:col-span-4 text-center text-gray-500">لا توجد منتجات تطابق هذا الفلتر.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreProducts;