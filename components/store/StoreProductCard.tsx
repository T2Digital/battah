import React from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface StoreProductCardProps {
    product: Product;
    onProductClick: (product: Product) => void;
    onAddToCart: () => void;
}

const StoreProductCard: React.FC<StoreProductCardProps> = ({ product, onProductClick, onAddToCart }) => {
    const isAvailable = product.stock.main > 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="relative overflow-hidden cursor-pointer" onClick={() => onProductClick(product)}>
                <img src={product.images[0] || 'https://via.placeholder.com/400x300'} alt={product.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"/>
                {!isAvailable && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg bg-red-600 px-3 py-1 rounded-full">نفدت الكمية</span>
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{product.brand}</p>
                <h4 
                    onClick={() => onProductClick(product)}
                    className="font-bold text-lg text-gray-800 dark:text-white truncate cursor-pointer hover:text-primary-dark dark:hover:text-primary-light"
                    title={product.name}
                >
                    {product.name}
                </h4>
                <div className="mt-auto pt-4 flex justify-between items-center">
                    <p className="text-primary-dark dark:text-primary-light font-bold text-xl">{formatCurrency(product.sellingPrice)}</p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAddToCart(); }} 
                        disabled={!isAvailable}
                        className="px-4 py-2 bg-primary-dark text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        <i className="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoreProductCard;