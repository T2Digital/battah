import React from 'react';

interface MobileBottomNavProps {
    cartItemCount: number;
    wishlistCount: number;
    onHomeClick: () => void;
    onCategoriesClick: () => void;
    onWishlistClick: () => void;
    onMyOrdersClick: () => void;
    onCartClick: () => void;
    isWishlistActive?: boolean;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
    cartItemCount,
    wishlistCount,
    onHomeClick,
    onCategoriesClick,
    onWishlistClick,
    onMyOrdersClick,
    onCartClick,
    isWishlistActive = false,
}) => {
    return (
        <nav
            aria-label="التنقل السريع"
            className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] bg-white/92 dark:bg-[#080d1a]/92 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/[0.08] shadow-[0_-8px_28px_rgba(0,0,0,0.08)]"
        >
            <div className="grid grid-cols-5 h-16 items-center">
                <button
                    type="button"
                    onClick={onHomeClick}
                    className="flex flex-col items-center justify-center gap-1 text-slate-600 dark:text-slate-300 hover:text-primary active:scale-95 transition-all"
                >
                    <i className="fas fa-home text-base" />
                    <span className="text-[10px] font-extrabold">الرئيسية</span>
                </button>

                <button
                    type="button"
                    onClick={onCategoriesClick}
                    className="flex flex-col items-center justify-center gap-1 text-slate-600 dark:text-slate-300 hover:text-primary active:scale-95 transition-all"
                >
                    <i className="fas fa-th-large text-base" />
                    <span className="text-[10px] font-extrabold">الأقسام</span>
                </button>

                <button
                    type="button"
                    onClick={onWishlistClick}
                    className={`relative flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${
                        isWishlistActive
                            ? 'text-rose-500'
                            : 'text-slate-600 dark:text-slate-300 hover:text-rose-500'
                    }`}
                >
                    <div className="relative">
                        <i className={`${isWishlistActive ? 'fas' : 'far'} fa-heart text-base`} />
                        {wishlistCount > 0 && (
                            <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                                {wishlistCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-extrabold">المفضلة</span>
                </button>

                <button
                    type="button"
                    onClick={onMyOrdersClick}
                    className="flex flex-col items-center justify-center gap-1 text-slate-600 dark:text-slate-300 hover:text-primary active:scale-95 transition-all"
                >
                    <i className="fas fa-receipt text-base" />
                    <span className="text-[10px] font-extrabold">طلباتي</span>
                </button>

                <button
                    type="button"
                    onClick={onCartClick}
                    className="relative flex flex-col items-center justify-center gap-1 text-primary active:scale-95 transition-all"
                >
                    <div className="relative">
                        <i className="fas fa-shopping-bag text-base" />
                        {cartItemCount > 0 && (
                            <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                                {cartItemCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-extrabold">السلة</span>
                </button>
            </div>
        </nav>
    );
};

export default MobileBottomNav;
