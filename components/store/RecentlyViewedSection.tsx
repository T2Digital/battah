import React from 'react';
import { Product } from '../../types';
import StoreProductCard from './StoreProductCard';

interface RecentlyViewedSectionProps {
    products: Product[];
    onProductClick: (product: Product) => void;
    addToCart: (product: Product, quantity: number) => void;
    wishlistIds?: number[];
    onToggleWishlist?: (product: Product) => void;
    onQuickShare?: (product: Product) => void;
}

const RecentlyViewedSection: React.FC<RecentlyViewedSectionProps> = ({
    products,
    onProductClick,
    addToCart,
    wishlistIds = [],
    onToggleWishlist,
    onQuickShare,
}) => {
    if (products.length < 2) return null;

    return (
        <section className="py-10 sm:py-12 border-t border-slate-200/70 dark:border-white/[0.06] bg-white/60 dark:bg-[#080d1a]">
            <div className="container mx-auto px-3 sm:px-6">
                <div className="flex items-center justify-between gap-2 mb-5 sm:mb-6">
                    <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl brand-soft-bg text-primary flex items-center justify-center text-sm">
                            <i className="fas fa-history" />
                        </span>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                                شاهدت مؤخراً
                            </h2>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                                عد سريعاً للمنتجات التي تصفحتها منذ قليل
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex overflow-x-auto gap-3.5 sm:gap-5 pb-2 snap-x snap-mandatory hide-scrollbar">
                    {products.map(product => (
                        <div key={product.id} className="shrink-0 w-[168px] sm:w-56 snap-start">
                            <StoreProductCard
                                product={product}
                                onProductClick={onProductClick}
                                onAddToCart={addToCart}
                                isWishlisted={wishlistIds.includes(product.id)}
                                onToggleWishlist={onToggleWishlist}
                                onQuickShare={onQuickShare}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RecentlyViewedSection;
