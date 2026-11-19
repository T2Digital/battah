import React, { useRef } from 'react';
import { Product } from '../../types';
import StoreProductCard from './StoreProductCard';

interface NewArrivalsSectionProps {
    products: Product[];
    onProductClick: (product: Product) => void;
    addToCart: (product: Product, quantity: number) => void;
    title?: string;
    subtitle?: string;
    badge?: string;
    wishlistIds?: number[];
    onToggleWishlist?: (product: Product) => void;
    onQuickShare?: (product: Product) => void;
    onViewAll?: () => void;
}

const NewArrivalsSection: React.FC<NewArrivalsSectionProps> = ({
    products,
    onProductClick,
    addToCart,
    title = 'وصل حديثاً',
    subtitle = 'أحدث الإضافات والمنتجات المتوفرة للشحن الفوري',
    badge = '✨ أحدث الإصدارات',
    wishlistIds = [],
    onToggleWishlist,
    onQuickShare,
    onViewAll,
}) => {
    const railRef = useRef<HTMLDivElement>(null);
    if (products.length === 0) return null;

    const scrollRail = (dir: 'next' | 'prev') => {
        if (!railRef.current) return;
        const delta = dir === 'next' ? -320 : 320;
        railRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    };

    return (
        <section className="py-10 sm:py-14 bg-slate-50/70 dark:bg-[#060913] border-b border-slate-200/70 dark:border-white/[0.06]">
            <div className="container mx-auto px-3 sm:px-6">
                <div className="flex items-end justify-between gap-3 mb-6 sm:mb-8">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold mb-2">
                            {badge}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden md:flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => scrollRail('prev')}
                                aria-label="السابق"
                                className="w-9 h-9 rounded-full bg-white dark:bg-white/[0.07] border border-slate-200 dark:border-white/10 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
                            >
                                <i className="fas fa-chevron-right text-xs" />
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollRail('next')}
                                aria-label="التالي"
                                className="w-9 h-9 rounded-full bg-white dark:bg-white/[0.07] border border-slate-200 dark:border-white/10 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
                            >
                                <i className="fas fa-chevron-left text-xs" />
                            </button>
                        </div>
                        {onViewAll && (
                            <button
                                type="button"
                                onClick={onViewAll}
                                className="px-3.5 py-2 rounded-full text-xs font-extrabold text-primary bg-primary/10 hover:bg-primary hover:text-white transition-colors"
                            >
                                عرض الكل
                            </button>
                        )}
                    </div>
                </div>

                <div
                    ref={railRef}
                    className="flex overflow-x-auto gap-3.5 sm:gap-5 pb-3 pt-1 snap-x snap-mandatory hide-scrollbar"
                >
                    {products.map(product => (
                        <div key={product.id} className="shrink-0 w-[172px] sm:w-60 md:w-64 snap-start">
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

export default NewArrivalsSection;
