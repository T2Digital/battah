import React, { useState } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';
import { getActiveBranches, getProductTotalStock } from '../../lib/appConfig';

interface StoreProductCardProps {
    product: Product;
    onProductClick: (product: Product) => void;
    onAddToCart: (product: Product, quantity: number) => void;
}

const StoreProductCard: React.FC<StoreProductCardProps> = ({ product, onProductClick, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const appCustomization = useStore(state => state.appData?.appCustomization);
    const activeBranches = getActiveBranches(appCustomization);
    const totalStock = getProductTotalStock(product, activeBranches);
    const isOutOfStock = totalStock <= 0;

    const handleAddToCartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOutOfStock) return;
        onAddToCart(product, quantity);
        setQuantity(1);
    };

    const hasDiscount = product.discount && product.discount > 0;
    const originalPrice = hasDiscount ? product.sellingPrice / (1 - product.discount! / 100) : product.sellingPrice;
    const brandBadge = product.brand || product.subCategory || product.category || product.mainCategory || 'منتج مميز';

    return (
        <div 
            className={`group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all duration-300 cursor-pointer flex flex-col h-full relative ${isOutOfStock ? 'opacity-85' : ''}`}
            onClick={() => onProductClick(product)}
        >
            {/* Badges */}
            <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
                {hasDiscount && (
                    <span className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm flex items-center gap-1">
                        <i className="fas fa-tags text-[9px] sm:text-[10px]"></i>
                        خصم {product.discount}%
                    </span>
                )}
                {product.isNew && (
                    <span className="bg-emerald-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm flex items-center gap-1">
                        <i className="fas fa-sparkles text-[9px] sm:text-[10px]"></i>
                        جديد
                    </span>
                )}
                {isOutOfStock && (
                    <span className="bg-gray-800/90 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm">
                        نفذت الكمية
                    </span>
                )}
            </div>

            {/* Image Container */}
            <div className="relative h-32 sm:h-48 bg-gray-50/50 dark:bg-gray-700/50 flex items-center justify-center overflow-hidden p-2.5 sm:p-4 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors">
                <img 
                    src={product.images?.[0] || (product as any).imageUrl || 'https://via.placeholder.com/150'} 
                    alt={product.name} 
                    loading="lazy"
                    className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal transform group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Quick Add Overlay (Desktop) */}
                {!isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex backdrop-blur-sm">
                        <button 
                            onClick={handleAddToCartClick}
                            className="bg-white text-gray-900 hover:bg-primary hover:text-white font-bold py-2 px-6 text-sm rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl flex items-center gap-2"
                        >
                            <i className="fas fa-cart-plus"></i>
                            أضف للسلة
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-2.5 sm:p-4 flex flex-col flex-grow bg-white dark:bg-gray-800">
                <div className="flex justify-between items-center gap-1.5 mb-1.5 sm:mb-2">
                    <p className="text-[10px] sm:text-xs text-primary dark:text-primary-light font-bold truncate bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded-md max-w-[70%]">{brandBadge}</p>
                    <div className="flex items-center text-yellow-400 text-[10px] sm:text-xs shrink-0 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded-md">
                        <i className="fas fa-star"></i>
                        <span className="text-gray-700 dark:text-gray-300 mr-0.5 sm:ml-1 font-bold">{product.rating || '4.5'}</span>
                    </div>
                </div>
                
                <h3 className="font-bold text-xs sm:text-base text-gray-800 dark:text-white line-clamp-2 mb-2 sm:mb-3 group-hover:text-primary transition-colors leading-snug min-h-[2.2rem] sm:min-h-[2.75rem]" title={product.name}>
                    {product.name}
                </h3>
                
                <div className="mt-auto pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col mb-2 sm:mb-3">
                        {hasDiscount && (
                            <span className="text-[10px] sm:text-xs text-gray-400 line-through mb-0.5">{formatCurrency(originalPrice)}</span>
                        )}
                        <span className="text-sm sm:text-lg font-black text-gray-900 dark:text-white leading-none">
                            {formatCurrency(product.sellingPrice)}
                        </span>
                    </div>

                    {/* Mobile Add to Cart Button (Compact & Full-Width for 2-col Grid) */}
                    <button
                        onClick={handleAddToCartClick}
                        disabled={isOutOfStock}
                        className={`md:hidden w-full py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${isOutOfStock ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-dark shadow-sm'}`}
                        aria-label="أضف للسلة"
                    >
                        <i className={`fas ${isOutOfStock ? 'fa-ban' : 'fa-cart-plus'} text-xs`}></i>
                        <span>{isOutOfStock ? 'غير متوفر' : 'أضف للسلة'}</span>
                    </button>

                    {/* Desktop Always-Visible Add to Cart Button */}
                    <button
                        onClick={handleAddToCartClick}
                        disabled={isOutOfStock}
                        className={`hidden md:flex w-full items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow active:scale-95 ${isOutOfStock ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark text-white'}`}
                    >
                        <i className={`fas ${isOutOfStock ? 'fa-ban' : 'fa-cart-plus'} text-sm`}></i>
                        <span>{isOutOfStock ? 'نفذت الكمية' : 'أضف للسلة'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoreProductCard;