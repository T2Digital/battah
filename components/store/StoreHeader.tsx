import React, { useState, useEffect, useRef, useMemo } from 'react';
import useStore from '../../lib/store';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { getStoreBranding } from '../../lib/appConfig';

interface StoreHeaderProps {
    onCartClick: () => void;
    cartItemCount: number;
    setViewMode: (mode: 'admin' | 'store') => void;
    onMyOrdersClick: () => void;
    products?: Product[];
    onSelectProduct?: (product: Product) => void;
    searchQuery?: string;
    onSearchChange?: (q: string) => void;
    wishlistCount?: number;
    onWishlistClick?: () => void;
    cartSubtotal?: number;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({
    onCartClick,
    cartItemCount,
    setViewMode,
    onMyOrdersClick,
    products = [],
    onSelectProduct,
    searchQuery,
    onSearchChange,
    wishlistCount = 0,
    onWishlistClick,
    cartSubtotal = 0,
}) => {
    const { settings, storefrontSettings } = useStore(state => ({
        settings: state.appData?.settings,
        storefrontSettings: state.appData?.storefrontSettings,
    }));
    const branding = getStoreBranding(storefrontSettings, settings?.companyName || 'المتجر الإلكتروني');
    const brandName = branding.companyName;
    const brandTagline = settings?.tickerMessages?.[0] || branding.slogan || 'متجر إلكتروني معتمد';
    const logoSrc = branding.logoUrl || 'https://i.ibb.co/3yL3ZXm5/aa2f6315c6fc.jpg';

    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [localQuery, setLocalQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    const desktopSearchRef = useRef<HTMLDivElement>(null);
    const mobileSearchInputRef = useRef<HTMLInputElement>(null);

    const activeQuery = searchQuery !== undefined ? searchQuery : localQuery;

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 18);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target as Node)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    useEffect(() => {
        if (isMobileSearchOpen) {
            setTimeout(() => mobileSearchInputRef.current?.focus(), 60);
        }
    }, [isMobileSearchOpen]);

    const toggleDarkMode = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDarkMode(true);
        }
    };

    const updateQuery = (val: string) => {
        setLocalQuery(val);
        if (onSearchChange) onSearchChange(val);
    };

    const instantMatches = useMemo(() => {
        const q = activeQuery.trim().toLowerCase();
        if (!q || products.length === 0) return [];
        return products
            .filter(
                p =>
                    String(p.name || '').toLowerCase().includes(q) ||
                    String(p.sku || '').toLowerCase().includes(q) ||
                    String(p.brand || '').toLowerCase().includes(q) ||
                    String(p.mainCategory || '').toLowerCase().includes(q) ||
                    String(p.subCategory || p.category || '').toLowerCase().includes(q)
            )
            .slice(0, 5);
    }, [activeQuery, products]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearchFocused(false);
        setIsMobileSearchOpen(false);
        document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handlePickProduct = (p: Product) => {
        setIsSearchFocused(false);
        setIsMobileSearchOpen(false);
        if (onSelectProduct) {
            onSelectProduct(p);
        } else {
            document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const renderSearchDropdown = () => {
        if (!activeQuery.trim()) return null;
        return (
            <div className="absolute top-full inset-x-0 mt-2 bg-white/95 dark:bg-[#0d1323]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden z-50 animate-scale-in">
                {instantMatches.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                        {instantMatches.map(item => {
                            const hasDiscount = Number(item.discount || 0) > 0;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handlePickProduct(item)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/[0.05] text-right transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={item.images?.[0] || (item as any).imageUrl || 'https://via.placeholder.com/80'}
                                            alt={item.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {(item.brand || item.mainCategory) && (
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                                    {item.brand || item.mainCategory}
                                                </span>
                                            )}
                                            {hasDiscount && (
                                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                                    -{item.discount}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs sm:text-sm font-black text-primary tabular-nums shrink-0">
                                        {formatCurrency(item.sellingPrice)}
                                    </span>
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={handleSearchSubmit as any}
                            className="w-full py-2.5 text-center text-xs font-extrabold text-primary hover:bg-primary/5 transition-colors"
                        >
                            عرض كل نتائج البحث في الكتالوج ←
                        </button>
                    </div>
                ) : (
                    <div className="p-5 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        لا توجد نتائج مطابقة لـ "{activeQuery}"
                    </div>
                )}
            </div>
        );
    };

    return (
        <header
            className={`sticky top-0 z-40 transition-all duration-300 ${
                isScrolled
                    ? 'bg-white/88 dark:bg-[#060913]/88 backdrop-blur-xl shadow-lg shadow-slate-900/5 border-b border-slate-200/70 dark:border-white/[0.08] py-2.5'
                    : 'bg-white/95 dark:bg-[#060913]/95 backdrop-blur-md border-b border-slate-200/60 dark:border-white/[0.07] py-3'
            }`}
        >
            <div className="container mx-auto px-3 sm:px-6 flex justify-between items-center gap-2 sm:gap-4">
                {/* Brand Lockup */}
                <div
                    className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0 shrink-0"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-800/90 flex items-center justify-center overflow-hidden border border-slate-200/80 dark:border-white/10 group-hover:border-primary/40 transition-colors shadow-sm">
                        <img
                            src={logoSrc}
                            alt={brandName}
                            className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight truncate max-w-[140px] sm:max-w-[210px] md:max-w-[260px]">
                                {brandName}
                            </h1>
                            <span
                                className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full brand-soft-bg text-primary shrink-0"
                                title="متجر معتمد"
                            >
                                <i className="fas fa-check-circle text-[9px]" />
                            </span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[140px] sm:max-w-[240px] mt-0.5">
                            {brandTagline}
                        </span>
                    </div>
                </div>

                {/* Desktop Centered Live Instant Search */}
                <div ref={desktopSearchRef} className="hidden lg:block relative flex-1 max-w-xl mx-4">
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <input
                            type="text"
                            value={activeQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onChange={e => {
                                updateQuery(e.target.value);
                                setIsSearchFocused(true);
                            }}
                            placeholder="ابحث بالاسم، الكود، أو الماركة..."
                            className="w-full h-11 pr-11 pl-10 bg-slate-100/90 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.09] focus:bg-white dark:focus:bg-[#0d1323] border border-slate-200/80 dark:border-white/10 focus:border-primary rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all shadow-inner"
                        />
                        <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                        {activeQuery && (
                            <button
                                type="button"
                                onClick={() => updateQuery('')}
                                aria-label="مسح البحث"
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs hover:bg-slate-300"
                            >
                                <i className="fas fa-times" />
                            </button>
                        )}
                    </form>
                    {isSearchFocused && renderSearchDropdown()}
                </div>

                {/* Actions Area */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Mobile Search Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsMobileSearchOpen(prev => !prev)}
                        className={`lg:hidden w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                            isMobileSearchOpen
                                ? 'bg-primary text-white'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                        aria-label="بحث فوري"
                    >
                        <i className={`fas ${isMobileSearchOpen ? 'fa-times' : 'fa-search'} text-sm`} />
                    </button>

                    {/* Dark Mode Toggle */}
                    <button
                        type="button"
                        onClick={toggleDarkMode}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="تبديل الوضع الليلي"
                    >
                        {isDarkMode ? <i className="fas fa-sun text-base" /> : <i className="fas fa-moon text-base" />}
                    </button>

                    {/* Desktop Wishlist Button */}
                    {onWishlistClick && (
                        <button
                            type="button"
                            onClick={onWishlistClick}
                            className="hidden sm:flex relative w-10 h-10 rounded-full items-center justify-center text-slate-600 hover:text-rose-500 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            aria-label="المفضلة"
                            title="المفضلة"
                        >
                            <i className="far fa-heart text-base" />
                            {wishlistCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white dark:border-[#060913]">
                                    {wishlistCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Desktop My Orders Button */}
                    <button
                        type="button"
                        onClick={onMyOrdersClick}
                        className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-slate-700 hover:text-primary dark:text-slate-200 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors font-bold text-xs sm:text-sm"
                        title="طلباتي"
                        aria-label="طلباتي"
                    >
                        <i className="fas fa-receipt text-xs" />
                        <span>طلباتي</span>
                    </button>

                    {/* Mobile My Orders Icon (subtle backup) */}
                    <button
                        type="button"
                        onClick={onMyOrdersClick}
                        className="sm:hidden w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title="طلباتي"
                        aria-label="طلباتي"
                    >
                        <i className="fas fa-receipt text-sm" />
                    </button>

                    {/* Cart Button */}
                    <button
                        type="button"
                        onClick={onCartClick}
                        className="relative flex items-center gap-2 h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-full bg-slate-100 dark:bg-white/[0.07] hover:bg-primary/10 dark:hover:bg-white/[0.12] text-slate-800 dark:text-white border border-slate-200/80 dark:border-white/10 transition-all"
                        aria-label="سلة التسوق"
                    >
                        <i className="fas fa-shopping-bag text-sm sm:text-base text-primary" />
                        {cartItemCount > 0 && cartSubtotal > 0 && (
                            <span className="hidden md:inline text-xs font-black tabular-nums">
                                {formatCurrency(cartSubtotal)}
                            </span>
                        )}
                        {cartItemCount > 0 && (
                            <span className="bg-primary text-white text-[10px] font-black rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow-sm">
                                {cartItemCount}
                            </span>
                        )}
                    </button>

                    {/* Admin Login Button */}
                    <button
                        type="button"
                        onClick={() => setViewMode('admin')}
                        className="sm:hidden w-9 h-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-sm"
                        aria-label="دخول الإدارة"
                        title="دخول الإدارة"
                    >
                        <i className="fas fa-user-shield text-xs" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('admin')}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full hover:bg-slate-800 dark:hover:bg-slate-100 transition-all font-extrabold text-xs sm:text-sm shadow-sm active:scale-95"
                    >
                        <i className="fas fa-user-shield text-xs" />
                        <span>دخول الإدارة</span>
                    </button>
                </div>
            </div>

            {/* Mobile Expandable Instant Search Drawer */}
            {isMobileSearchOpen && (
                <div className="lg:hidden border-t border-slate-200/70 dark:border-white/[0.08] px-3 py-2.5 bg-white/95 dark:bg-[#060913]/95 backdrop-blur-xl relative">
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <input
                            ref={mobileSearchInputRef}
                            type="text"
                            value={activeQuery}
                            onChange={e => updateQuery(e.target.value)}
                            placeholder="ابحث عن منتج، كود، أو ماركة..."
                            className="w-full h-11 pr-10 pl-10 bg-slate-100 dark:bg-white/[0.07] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                        />
                        <i className="fas fa-search absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        {activeQuery && (
                            <button
                                type="button"
                                onClick={() => updateQuery('')}
                                aria-label="مسح البحث"
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs"
                            >
                                <i className="fas fa-times" />
                            </button>
                        )}
                    </form>
                    <div className="relative">{renderSearchDropdown()}</div>
                </div>
            )}
        </header>
    );
};

export default StoreHeader;
