import React, { useState, useEffect, useMemo, useRef } from 'react';
import useStore from '../../lib/store';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import {
    StoreFilters,
    DEFAULT_STORE_FILTERS,
    getMainCategories,
    getStoreBranding,
    getHeroSlides,
    getActiveBranches,
    getProductTotalStock,
} from '../../lib/appConfig';

interface StoreHeroProps {
    setFilters?: React.Dispatch<React.SetStateAction<StoreFilters>>;
    onProductClick?: (product: Product) => void;
    onAddToCart?: (product: Product, quantity: number) => void;
    onExploreDeals?: () => void;
}

const StoreHero: React.FC<StoreHeroProps> = ({
    setFilters,
    onProductClick,
    onAddToCart,
    onExploreDeals,
}) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const touchStartX = useRef<number | null>(null);

    const { appCustomization, products, storefrontSettings } = useStore(state => ({
        appCustomization: state.appData?.appCustomization,
        products: state.appData?.products || [],
        storefrontSettings: state.appData?.storefrontSettings,
    }));

    const activeBranches = useMemo(() => getActiveBranches(appCustomization), [appCustomization]);
    const branding = useMemo(() => getStoreBranding(storefrontSettings), [storefrontSettings]);
    const mainCategories = useMemo(
        () => getMainCategories(appCustomization, products),
        [appCustomization, products]
    );
    const slides = useMemo(
        () => getHeroSlides(appCustomization, branding.companyName, branding.slogan, mainCategories),
        [appCustomization, branding.companyName, branding.slogan, mainCategories]
    );

    const { spotlightProduct, hasDiscountedProducts } = useMemo(() => {
        const inStock = products.filter(p => getProductTotalStock(p, activeBranches) > 0);
        const discounted = inStock.filter(p => Number(p.discount || 0) > 0);
        const sortedDiscounted = [...discounted].sort(
            (a, b) => Number(b.discount || 0) - Number(a.discount || 0)
        );
        return {
            spotlightProduct: sortedDiscounted[0] || inStock[0] || products[0] || null,
            hasDiscountedProducts: products.some(p => Number(p.discount || 0) > 0),
        };
    }, [products, activeBranches]);

    useEffect(() => {
        if (slides.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 5500);
        return () => clearInterval(timer);
    }, [slides.length]);

    const handleShopNow = (category: string) => {
        if (setFilters) {
            const targetCategory = mainCategories.includes(category) ? category : 'all';
            setFilters({ ...DEFAULT_STORE_FILTERS, category: targetCategory });
        }
        document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSpotlightQuickAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!spotlightProduct) return;
        const hasVariants = Array.isArray(spotlightProduct.variants) && spotlightProduct.variants.length > 0;
        if (hasVariants || !onAddToCart) {
            onProductClick?.(spotlightProduct);
            return;
        }
        onAddToCart(spotlightProduct, 1);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || slides.length <= 1) return;
        const deltaX = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(deltaX) > 45) {
            setCurrentSlide(prev => (deltaX > 0 ? (prev + 1) % slides.length : (prev - 1 + slides.length) % slides.length));
        }
        touchStartX.current = null;
    };

    const safeIndex = slides.length > 0 ? currentSlide % slides.length : 0;
    const slide = slides[safeIndex];
    if (!slide) return null;

    const spotHasDiscount = Boolean(spotlightProduct?.discount && spotlightProduct.discount > 0);
    const spotOriginalPrice =
        spotlightProduct && spotHasDiscount
            ? spotlightProduct.sellingPrice / (1 - (spotlightProduct.discount || 0) / 100)
            : spotlightProduct?.sellingPrice || 0;
    const spotStock = spotlightProduct ? getProductTotalStock(spotlightProduct, activeBranches) : 0;

    return (
        <section
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative bg-[#060b18] text-white overflow-hidden min-h-[54vh] sm:min-h-[68vh] flex items-center"
        >
            {/* Background Slides */}
            {slides.map((s, index) => (
                <div
                    key={s.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                        index === safeIndex ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
                    }`}
                >
                    <img
                        src={s.image}
                        alt={s.title}
                        className={`w-full h-full object-cover opacity-55 ${index === safeIndex ? 'animate-slow-zoom' : ''}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-[#060b18] via-[#060b18]/85 to-[#060b18]/45" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#060b18] via-transparent to-[#060b18]/40" />
                </div>
            ))}

            {/* 2026 Editorial Grid & Ambient Glow */}
            <div className="absolute inset-0 hero-grid-bg opacity-50 pointer-events-none z-10" />
            <div
                className="hidden sm:block absolute -top-24 right-12 w-96 h-96 rounded-full blur-[120px] pointer-events-none z-10"
                style={{ backgroundColor: 'rgba(var(--brand-primary-rgb), 0.28)' }}
            />
            <div className="hidden lg:block absolute -bottom-24 left-16 w-80 h-80 bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none z-10" />

            <div className="relative container mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 z-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                    {/* Editorial Copy Column */}
                    <div className="lg:col-span-7 text-right" key={safeIndex}>
                        {(slide.badge || branding.slogan) && (
                            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/15 backdrop-blur-md text-sky-200 text-xs sm:text-sm font-bold mb-5 animate-fade-in-up shadow-lg">
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                                </span>
                                <span className="truncate max-w-[72vw] sm:max-w-md">{slide.badge || branding.slogan}</span>
                            </div>
                        )}

                        <h1 className="text-3xl sm:text-5xl lg:text-[3.4rem] font-black mb-3 sm:mb-4 leading-[1.18] tracking-tight animate-fade-in-up">
                            <span className="text-transparent bg-clip-text bg-gradient-to-l from-white via-white to-sky-200">
                                {slide.title}
                            </span>
                        </h1>

                        {slide.subtitle && (
                            <h2
                                className="text-lg sm:text-2xl font-extrabold mb-3.5 text-sky-200/95 animate-fade-in-up"
                                style={{ animationDelay: '0.08s' }}
                            >
                                {slide.subtitle}
                            </h2>
                        )}

                        {slide.description && (
                            <p
                                className="text-sm sm:text-base md:text-lg text-slate-300 mb-7 max-w-xl leading-relaxed font-normal animate-fade-in-up"
                                style={{ animationDelay: '0.16s' }}
                            >
                                {slide.description}
                            </p>
                        )}

                        {/* Hero CTAs */}
                        <div
                            className="flex flex-wrap items-center gap-3 animate-fade-in-up"
                            style={{ animationDelay: '0.24s' }}
                        >
                            <button
                                type="button"
                                onClick={() => handleShopNow(slide.category || 'all')}
                                className="flex-1 sm:flex-none px-6 sm:px-8 py-3.5 bg-primary hover:bg-primary-dark text-white font-black rounded-2xl transition-all duration-300 brand-glow flex items-center justify-center gap-2.5 group text-sm sm:text-base active:scale-95"
                            >
                                <span>تسوق الآن</span>
                                <i className="fas fa-arrow-left text-sm transform group-hover:-translate-x-1.5 transition-transform" />
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    document.getElementById('category-highlights')?.scrollIntoView({ behavior: 'smooth' })
                                }
                                className="flex-1 sm:flex-none px-5 sm:px-7 py-3.5 bg-white/[0.09] hover:bg-white/[0.16] text-white font-bold rounded-2xl border border-white/15 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95"
                            >
                                <span>استكشف الأقسام</span>
                            </button>

                            {hasDiscountedProducts && onExploreDeals && (
                                <button
                                    type="button"
                                    onClick={onExploreDeals}
                                    className="px-4 py-3.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 font-extrabold rounded-2xl transition-all text-xs sm:text-sm flex items-center gap-1.5"
                                >
                                    <span>العروض 🔥</span>
                                </button>
                            )}
                        </div>

                        {/* Micro Trust Row */}
                        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300/90 font-semibold">
                            <span className="inline-flex items-center gap-1.5">
                                <i className="fas fa-star text-amber-400" />
                                تقييم العملاء 4.9/5
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <i className="fas fa-bolt text-sky-400" />
                                شحن سريع 24-48 ساعة
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <i className="fas fa-shield-alt text-emerald-400" />
                                ضمان وأصالة 100%
                            </span>
                        </div>
                    </div>

                    {/* Floating Live Product Spotlight (Desktop) */}
                    <div className="hidden lg:flex lg:col-span-5 justify-end">
                        {spotlightProduct ? (
                            <div
                                onClick={() => onProductClick?.(spotlightProduct)}
                                className="w-full max-w-[360px] rounded-3xl bg-white/[0.07] backdrop-blur-2xl border border-white/15 p-5 shadow-2xl animate-float-slow cursor-pointer hover:border-white/30 transition-all group"
                            >
                                <div className="flex items-center justify-between gap-2 mb-3.5">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-white/10 text-sky-200 border border-white/10">
                                        <i className="fas fa-sparkles text-amber-300 text-[10px]" />
                                        {spotHasDiscount ? `عرض مميز -${spotlightProduct.discount}%` : 'اختيار المتجر المميز'}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-amber-300">
                                        <i className="fas fa-star text-[11px]" />
                                        {spotlightProduct.rating || '4.9'}
                                    </span>
                                </div>

                                <div className="relative h-48 rounded-2xl bg-white/95 p-4 flex items-center justify-center overflow-hidden mb-4">
                                    <img
                                        src={
                                            spotlightProduct.images?.[0] ||
                                            (spotlightProduct as any).imageUrl ||
                                            'https://via.placeholder.com/300'
                                        }
                                        alt={spotlightProduct.name}
                                        className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>

                                {(spotlightProduct.brand || spotlightProduct.mainCategory) && (
                                    <span className="inline-block text-[11px] font-bold text-sky-300 mb-1">
                                        {spotlightProduct.brand || spotlightProduct.mainCategory}
                                    </span>
                                )}

                                <h3 className="text-base font-extrabold text-white line-clamp-2 leading-snug mb-3">
                                    {spotlightProduct.name}
                                </h3>

                                <div className="flex items-end justify-between gap-2 mb-4">
                                    <div>
                                        {spotHasDiscount && (
                                            <span className="block text-xs text-slate-400 line-through tabular-nums">
                                                {formatCurrency(spotOriginalPrice)}
                                            </span>
                                        )}
                                        <span className="text-2xl font-black text-white tabular-nums">
                                            {formatCurrency(spotlightProduct.sellingPrice)}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-400/20">
                                        {spotStock > 0 ? 'متوفر للشحن' : 'نفذت الكمية'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        disabled={spotStock <= 0}
                                        onClick={handleSpotlightQuickAdd}
                                        className="py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all brand-glow disabled:opacity-50"
                                    >
                                        <i className="fas fa-cart-plus" />
                                        <span>
                                            {Array.isArray(spotlightProduct.variants) && spotlightProduct.variants.length > 0
                                                ? 'اختر المواصفات'
                                                : 'أضف للسلة'}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            onProductClick?.(spotlightProduct);
                                        }}
                                        className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all"
                                    >
                                        التفاصيل
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-[340px] rounded-3xl bg-white/[0.06] backdrop-blur-2xl border border-white/15 p-6 shadow-2xl space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-sky-300 text-xl">
                                    <i className="fas fa-shield-alt" />
                                </div>
                                <h3 className="text-xl font-black text-white">تسوق بثقة كاملة</h3>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    كل الطلبات مفحوصة ومؤمنة مع إمكانية الدفع عند الاستلام والتوصيل السريع لباب البيت.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Slider Controls */}
            {slides.length > 1 && (
                <>
                    <div className="hidden lg:flex items-center gap-2 absolute bottom-8 left-8 z-30">
                        <button
                            type="button"
                            onClick={() => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length)}
                            aria-label="الشريحة السابقة"
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-colors"
                        >
                            <i className="fas fa-chevron-right text-xs" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentSlide(prev => (prev + 1) % slides.length)}
                            aria-label="الشريحة التالية"
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-colors"
                        >
                            <i className="fas fa-chevron-left text-xs" />
                        </button>
                    </div>
                    <div className="absolute bottom-7 sm:bottom-9 inset-x-0 z-30 flex justify-center items-center gap-2">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => setCurrentSlide(index)}
                                className={`transition-all duration-300 rounded-full ${
                                    index === safeIndex
                                        ? 'w-8 h-2 bg-primary shadow-sm'
                                        : 'w-2 h-2 bg-white/35 hover:bg-white/65'
                                }`}
                                aria-label={`الشريحة ${index + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
};

export default StoreHero;
