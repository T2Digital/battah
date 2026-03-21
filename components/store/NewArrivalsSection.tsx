
import React from 'react';
import { Product } from '../../types';
import StoreProductCard from './StoreProductCard';

interface NewArrivalsSectionProps {
    products: Product[];
    onProductClick: (product: Product) => void;
    addToCart: (product: Product, quantity: number) => void;
}

const NewArrivalsSection: React.FC<NewArrivalsSectionProps> = ({ products, onProductClick, addToCart }) => {
    if (products.length === 0) return null;

    return (
        <div className="py-16 bg-slate-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-col items-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4 text-center">وصل حديثاً</h2>
                    <div className="w-24 h-1.5 bg-primary rounded-full"></div>
                </div>
                <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-8 pt-4 px-2 -mx-2 snap-x snap-mandatory hide-scrollbar">
                    {products.map(product => (
                        <div key={product.id} className="flex-shrink-0 w-48 sm:w-56 md:w-64 snap-start">
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

export default NewArrivalsSection;
