
import React from 'react';
import { Product } from '../../types';
import StoreProductCard from './StoreProductCard';

interface FeaturedProductsSectionProps {
    products: Product[];
    onProductClick: (product: Product) => void;
    addToCart: (product: Product, quantity: number) => void;
}

const FeaturedProductsSection: React.FC<FeaturedProductsSectionProps> = ({ products, onProductClick, addToCart }) => {
    if (products.length === 0) return null;

    return (
        <div className="py-12 bg-white dark:bg-gray-900">
            <div className="container mx-auto px-4 sm:px-6">
                <h2 className="text-3xl font-bold text-center mb-8">الأكثر مبيعاً</h2>
                <div className="flex overflow-x-auto space-x-6 pb-4 product-carousel">
                    {products.map(product => (
                        <div key={product.id} className="flex-shrink-0 w-64">
                            <StoreProductCard 
                                product={product} 
                                onProductClick={onProductClick}
                                onAddToCart={addToCart}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FeaturedProductsSection;
