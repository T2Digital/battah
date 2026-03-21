import React, { useState } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface StoreProductCardProps {
    product: Product;
    onProductClick: (product: Product) => void;
    onAddToCart: (product: Product, quantity: number) => void;
}

const StoreProductCard: React.FC<StoreProductCardProps> = ({ product, onProductClick, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [isHovered, setIsHovered] = useState(false);

    const handleAddToCartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCart(product, quantity);
        setQuantity(1); // Reset after adding
    };

    const hasDiscount = product.discount && product.discount > 0;
    const originalPrice = hasDiscount ? product.sellingPrice / (1 - product.discount! / 100) : product.sellingPrice;

    return (
        <div 
            className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all duration-300 cursor-pointer flex flex-col h-full relative"
            onClick={() => onProductClick(product)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Badges */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                {hasDiscount && (
                    <span className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <i className="fas fa-tags text-[10px]"></i>
                        خصم {product.discount}%
                    </span>
                )}
                {product.isNew && (
                    <span className="bg-emerald-500 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <i className="fas fa-sparkles text-[10px]"></i>
                        جديد
                    </span>
                )}
            </div>

            {/* Image Container */}
            <div className="relative h-40 sm:h-48 bg-gray-50/50 dark:bg-gray-700/50 flex items-center justify-center overflow-hidden p-4 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors">
                <img 
                    src={product.images[0] || 'https://via.placeholder.com/150'} 
                    alt={product.name} 
                    className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal transform group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Quick Add Overlay (Desktop) */}
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex backdrop-blur-sm`}>
                    <button 
                        onClick={handleAddToCartClick}
                        className="bg-white text-gray-900 hover:bg-primary hover:text-white font-bold py-2 px-6 text-sm rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl flex items-center gap-2"
                    >
                        <i className="fas fa-cart-plus"></i>
                        أضف للسلة
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow bg-white dark:bg-gray-800">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] sm:text-xs text-primary dark:text-primary-light font-bold uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">{product.brand}</p>
                    <div className="flex items-center text-yellow-400 text-[10px] sm:text-xs shrink-0 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded-md">
                        <i className="fas fa-star"></i>
                        <span className="text-gray-700 dark:text-gray-300 ml-1 font-bold">{product.rating || '4.5'}</span>
                    </div>
                </div>
                
                <h3 className="font-bold text-sm sm:text-base text-gray-800 dark:text-white line-clamp-2 mb-3 group-hover:text-primary transition-colors leading-snug" title={product.name}>
                    {product.name}
                </h3>
                
                <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col mb-3">
                        {hasDiscount && (
                            <span className="text-[10px] sm:text-xs text-gray-400 line-through mb-0.5">{formatCurrency(originalPrice)}</span>
                        )}
                        <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-none">
                            {formatCurrency(product.sellingPrice)}
                        </span>
                    </div>

                    {/* Mobile/Tablet Add to Cart Controls */}
                    <div className="flex items-center justify-between gap-2 md:hidden">
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg h-9 w-24">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setQuantity(prev => Math.max(1, prev - 1)); }} 
                                className="w-8 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-r-lg"
                            >
                                <i className="fas fa-minus text-[10px]"></i>
                            </button>
                            <span className="flex-grow text-center font-bold text-sm">{quantity}</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setQuantity(prev => prev + 1); }} 
                                className="w-8 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-l-lg"
                            >
                                <i className="fas fa-plus text-[10px]"></i>
                            </button>
                        </div>
                        <button 
                            onClick={handleAddToCartClick}
                            className="h-9 flex-grow bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-dark transition-colors shadow-sm active:scale-95"
                            aria-label="أضف للسلة"
                        >
                            <i className="fas fa-cart-plus text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreProductCard;