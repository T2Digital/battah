import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';
import { getActiveBranches, getProductTotalStock } from '../../lib/appConfig';

interface StoreProductCardProps {
    product: Product;
    onProductClick: (product: Product) => void;
    onAddToCart: (product: Product, quantity: number) => void;
    isWishlisted?: boolean;
    onToggleWishlist?: (product: Product) => void;
    onQuickShare?: (product: Product) => void;
}

const StoreProductCard: React.FC<StoreProductCardProps> = ({
    product,
    onProductClick,
    onAddToCart,
    isWishlisted = false,
    onToggleWishlist,
    onQuickShare,
}) => {
    const [justAdded, setJustAdded] = useState(false);
    const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const appCustomization = useStore(state => state.appData?.appCustomization);
    const activeBranches = getActiveBranches(appCustomization);
    const totalStock = getProductTotalStock(product, activeBranches);
    const isOutOfStock = totalStock <= 0;
    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    const hasDiscount = Number(product.discount || 0) > 0;
    const originalPrice = hasDiscount
        ? product.sellingPrice / (1 - Number(product.discount) / 100)
        : product.sellingPrice;
    const savingsAmount = hasDiscount ? Math.max(0, Math.round(originalPrice - product.sellingPrice)) : 0;

    const primaryImage =
        product.images?.[0] || (product as any).imageUrl || 'https://via.placeholder.com/300';
    const secondaryImage =
        Array.isArray(product.images) && product.images.length > 1 ? product.images[1] : null;
    const brandBadge =
        product.brand || product.subCategory || product.category || product.mainCategory || 'منتج مميز';

    useEffect(() => {
        return () => {
            if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
        };
    }, []);

    const handlePrimaryAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOutOfStock) return;
        if (hasVariants) {
            onProductClick(product);
            return;
        }
        onAddToCart(product, 1);
        setJustAdded(true);
        if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
        addedTimerRef.current = setTimeout(() => setJustAdded(false), 1200);
    };

    return (
        <article
            onClick={() => onProductClick(product)}
            className={`group bg-white dark:bg-[#0d1323] rounded-2xl sm:rounded-3xl border border-slate-200/75 dark:border-white/[0.07] hover:border-primary/45 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden ${
                isOutOfStock ? 'opacity-80' : ''
            }`}
        >
            {/* Top-Right Merchandising & Scarcity Badges */}
            <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-start gap-1">
                {hasDiscount && (
                    <span className="bg-rose-500 text-white text-[10px] sm:text-xs font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm flex items-center gap-1 tabular-nums">
                        <i className="fas fa-fire text-[9px]" />
                        خصم {product.discount}%
                    </span>
                )}
                {product.isNew && (
                    <span className="bg-emerald-500 text-white text-[10px] sm:text-xs font-black px-2 py-0.5 sm:px-2.5 rounded-full shadow-sm">
                        جديد
                    </span>
                )}
                {!isOutOfStock && totalStock <= 5 && (
                    <span className="bg-amber-500/95 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                        متبقي {totalStock} فقط
                    </span>
                )}
                {hasVariants && !isOutOfStock && (
                    <span className="bg-slate-900/75 dark:bg-white/15 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        خيارات متعددة
                    </span>
                )}
                {isOutOfStock && (
                    <span className="bg-slate-900/90 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                        نفذت الكمية
                    </span>
                )}
            </div>

            {/* Top-Left Wishlist & Quick Share Controls */}
            <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1.5">
                {onToggleWishlist && (
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation();
                            onToggleWishlist(product);
                        }}
                        aria-label={isWishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                        className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all shadow-sm active:scale-90 ${
                            isWishlisted
                                ? 'bg-rose-500 text-white border-rose-500'
                                : 'bg-white/85 dark:bg-slate-900/75 text-slate-500 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:text-rose-500'
                        }`}
                    >
                        <i className={`${isWishlisted ? 'fas' : 'far'} fa-heart text-xs`} />
                    </button>
                )}
                {onQuickShare && (
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation();
                            onQuickShare(product);
                        }}
                        aria-label="مشاركة المنتج"
                        className="hidden sm:flex opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full items-center justify-center bg-white/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:text-primary backdrop-blur-md transition-all shadow-sm"
                    >
                        <i className="fas fa-share-alt text-xs" />
                    </button>
                )}
            </div>

            {/* Studio Image Pedestal Stage */}
            <div className="relative h-36 sm:h-52 bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-800/45 dark:to-slate-900/70 flex items-center justify-center overflow-hidden p-3 sm:p-4">
                <img
                    src={primaryImage}
                    alt={product.name}
                    loading="lazy"
                    className={`h-full w-full object-contain transition-all duration-500 ${
                        secondaryImage
                            ? 'group-hover:opacity-0 group-hover:scale-105'
                            : 'group-hover:scale-105'
                    }`}
                />
                {secondaryImage && (
                    <img
                        src={secondaryImage}
                        alt={product.name}
                        loading="lazy"
                        className="absolute inset-0 p-3 sm:p-4 h-full w-full object-contain opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                )}
            </div>

            {/* Card Body */}
            <div className="p-2.5 sm:p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] sm:text-[11px] text-primary font-extrabold truncate brand-soft-bg px-2 py-0.5 rounded-md max-w-[68%]">
                        {brandBadge}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                        <i className="fas fa-star text-amber-400 text-[9px]" />
                        {product.rating || '4.8'}
                    </span>
                </div>

                <h3
                    className="font-extrabold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white line-clamp-2 mb-2.5 group-hover:text-primary transition-colors leading-snug min-h-[2.2rem] sm:min-h-[2.65rem]"
                    title={product.name}
                >
                    {product.name}
                </h3>

                {/* Price & Savings Stack */}
                <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-white/[0.06]">
                    <div className="flex flex-wrap items-baseline justify-between gap-1 mb-2.5">
                        <div className="flex flex-col">
                            {hasDiscount && (
                                <span className="text-[10px] sm:text-xs text-slate-400 line-through tabular-nums leading-tight">
                                    {formatCurrency(originalPrice)}
                                </span>
                            )}
                            <span className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tabular-nums leading-none mt-0.5">
                                {formatCurrency(product.sellingPrice)}
                            </span>
                        </div>
                        {savingsAmount > 0 && (
                            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-1.5 py-0.5 rounded-md tabular-nums">
                                وفر {formatCurrency(savingsAmount)}
                            </span>
                        )}
                    </div>

                    {/* Smart Primary Action CTA */}
                    <button
                        type="button"
                        onClick={handlePrimaryAction}
                        disabled={isOutOfStock}
                        className={`w-full py-2 sm:py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                            isOutOfStock
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : justAdded
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                                    : hasVariants
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:opacity-90 shadow-sm'
                                        : 'bg-primary hover:bg-primary-dark text-white shadow-sm hover:brand-glow'
                        }`}
                        aria-label={hasVariants ? 'اختر المواصفات' : 'أضف للسلة'}
                    >
                        <i
                            className={`fas ${
                                isOutOfStock
                                    ? 'fa-ban'
                                    : justAdded
                                        ? 'fa-check'
                                        : hasVariants
                                            ? 'fa-sliders-h'
                                            : 'fa-cart-plus'
                            } text-xs`}
                        />
                        <span>
                            {isOutOfStock
                                ? 'نفذت الكمية'
                                : justAdded
                                    ? 'تمت الإضافة ✓'
                                    : hasVariants
                                        ? 'اختر المواصفات'
                                        : 'أضف للسلة'}
                        </span>
                    </button>
                </div>
            </div>
        </article>
    );
};

export default StoreProductCard;
