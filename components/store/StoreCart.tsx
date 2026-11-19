import React, { useEffect, useMemo } from 'react';
import { CartItem, Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';
import {
    getShippingConfig,
    getActiveBranches,
    getProductTotalStock,
} from '../../lib/appConfig';

interface StoreCartProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onUpdateQuantity: (productId: number, quantity: number, variantName?: string) => void;
    onCheckout: () => void;
    allProducts?: Product[];
    onQuickAdd?: (product: Product, quantity: number) => void;
}

const StoreCart: React.FC<StoreCartProps> = ({
    isOpen,
    onClose,
    cartItems,
    onUpdateQuantity,
    onCheckout,
    allProducts = [],
    onQuickAdd,
}) => {
    const appCustomization = useStore(state => state.appData?.appCustomization);
    const activeBranches = useMemo(() => getActiveBranches(appCustomization), [appCustomization]);
    const shippingConfig = getShippingConfig(appCustomization);
    const subtotal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
    const freeThreshold = shippingConfig.freeShippingThreshold || 0;
    const remainingForFreeShipping = freeThreshold > 0 ? Math.max(0, freeThreshold - subtotal) : 0;
    const shippingProgress = freeThreshold > 0 ? Math.min(100, (subtotal / freeThreshold) * 100) : 0;

    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    const crossSellProducts = useMemo(() => {
        if (!onQuickAdd || !Array.isArray(allProducts) || allProducts.length === 0) return [];
        const inCartIds = new Set(cartItems.map(c => c.product.id));
        const candidates = allProducts.filter(
            p =>
                !inCartIds.has(p.id) &&
                getProductTotalStock(p, activeBranches) > 0 &&
                (!Array.isArray(p.variants) || p.variants.length === 0)
        );
        if (remainingForFreeShipping > 0) {
            return [...candidates]
                .sort(
                    (a, b) =>
                        Math.abs(a.sellingPrice - remainingForFreeShipping) -
                        Math.abs(b.sellingPrice - remainingForFreeShipping)
                )
                .slice(0, 3);
        }
        return candidates.slice(0, 3);
    }, [allProducts, cartItems, onQuickAdd, activeBranches, remainingForFreeShipping]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[80] transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-[100dvh] w-full max-w-[100vw] sm:max-w-md bg-white dark:bg-[#080d1a] shadow-2xl z-[80] transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-200/70 dark:border-white/[0.08] ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.08] bg-white dark:bg-[#080d1a] z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl brand-soft-bg flex items-center justify-center text-primary">
                            <i className="fas fa-shopping-bag text-lg" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-none">
                                سلة التسوق
                            </h3>
                            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">
                                {cartItems.length} أصناف
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 flex justify-center items-center rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                        aria-label="إغلاق السلة"
                    >
                        <i className="fas fa-times text-lg" />
                    </button>
                </div>

                {/* Free Shipping Progress Bar */}
                {cartItems.length > 0 && freeThreshold > 0 && (
                    <div className="px-4 py-3 brand-soft-bg border-b border-primary/15 shrink-0">
                        <div className="flex items-center justify-between text-xs font-extrabold mb-1.5">
                            {remainingForFreeShipping > 0 ? (
                                <span className="text-slate-800 dark:text-slate-100">
                                    أضف{' '}
                                    <strong className="text-primary tabular-nums">
                                        {formatCurrency(remainingForFreeShipping)}
                                    </strong>{' '}
                                    للحصول على شحن مجاني! 🚚
                                </span>
                            ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                    مبروك! حصلت على شحن مجاني 🎉
                                </span>
                            )}
                            <span className="text-primary tabular-nums">{Math.round(shippingProgress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    remainingForFreeShipping === 0 ? 'bg-emerald-500' : 'bg-primary'
                                }`}
                                style={{ width: `${shippingProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Cart Items + Smart Cross-Sell */}
                <div className="flex-grow overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 bg-slate-50 dark:bg-[#060913] custom-scrollbar">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-8">
                            <div className="w-24 h-24 bg-slate-100 dark:bg-white/[0.06] rounded-full flex items-center justify-center mb-5">
                                <i className="fas fa-shopping-basket text-4xl text-slate-300 dark:text-slate-600" />
                            </div>
                            <h4 className="font-black text-xl text-slate-900 dark:text-white mb-2">سلتك فارغة</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
                                تصفح منتجاتنا وأضف ما تحتاجه هنا!
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-7 px-6 py-3 bg-primary text-white font-extrabold rounded-xl hover:bg-primary-dark transition-colors brand-glow"
                            >
                                تصفح المنتجات
                            </button>
                        </div>
                    ) : (
                        <>
                            {cartItems.map(item => (
                                <div
                                    key={`${item.product.id}-${item.product.name}`}
                                    className="flex gap-3 bg-white dark:bg-[#0d1323] p-3 rounded-2xl shadow-sm border border-slate-200/75 dark:border-white/[0.08] relative group"
                                >
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 p-1.5 border border-slate-200/60 dark:border-white/10">
                                        <img
                                            src={
                                                item.product.images?.[0] ||
                                                (item.product as any).imageUrl ||
                                                'https://via.placeholder.com/150'
                                            }
                                            alt={item.product.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                                        <div className="pl-9">
                                            {item.product.brand && (
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate mb-0.5">
                                                    {item.product.brand}
                                                </p>
                                            )}
                                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug mb-2">
                                                {item.product.name}
                                            </h4>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 mt-auto">
                                            <div className="flex items-center bg-slate-100 dark:bg-white/10 rounded-lg h-8 border border-slate-200 dark:border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onUpdateQuantity(
                                                            item.product.id,
                                                            item.quantity - 1,
                                                            item.product.name
                                                        )
                                                    }
                                                    className="w-8 h-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                                                    aria-label="إنقاص"
                                                >
                                                    <i className="fas fa-minus text-xs" />
                                                </button>
                                                <span className="w-7 text-center font-black text-xs sm:text-sm text-slate-900 dark:text-white tabular-nums">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onUpdateQuantity(
                                                            item.product.id,
                                                            item.quantity + 1,
                                                            item.product.name
                                                        )
                                                    }
                                                    className="w-8 h-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                                                    aria-label="زيادة"
                                                >
                                                    <i className="fas fa-plus text-xs" />
                                                </button>
                                            </div>
                                            <span className="font-black text-sm sm:text-base text-primary whitespace-nowrap tabular-nums">
                                                {formatCurrency(item.product.sellingPrice * item.quantity)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQuantity(item.product.id, 0, item.product.name)}
                                        className="absolute top-3 left-3 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white dark:bg-rose-500/15 dark:hover:bg-rose-500 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shadow-sm"
                                        aria-label="حذف المنتج"
                                    >
                                        <i className="fas fa-trash-alt text-xs" />
                                    </button>
                                </div>
                            ))}

                            {/* Smart Cross-Sell Upsell Strip */}
                            {crossSellProducts.length > 0 && onQuickAdd && (
                                <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-white/[0.08]">
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                                        <i className="fas fa-magic text-primary text-[11px]" />
                                        {remainingForFreeShipping > 0
                                            ? 'أضف لطلبك واقترب من الشحن المجاني'
                                            : 'منتجات مقترحة قد تهمك'}
                                    </p>
                                    <div className="space-y-2">
                                        {crossSellProducts.map(p => (
                                            <div
                                                key={p.id}
                                                className="flex items-center justify-between gap-2.5 bg-white dark:bg-[#0d1323] p-2.5 rounded-xl border border-slate-200/75 dark:border-white/[0.07]"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <img
                                                        src={
                                                            p.images?.[0] ||
                                                            (p as any).imageUrl ||
                                                            'https://via.placeholder.com/80'
                                                        }
                                                        alt={p.name}
                                                        className="w-10 h-10 rounded-lg object-contain bg-slate-50 dark:bg-slate-800 p-1 shrink-0"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                            {p.name}
                                                        </p>
                                                        <span className="text-xs font-black text-primary tabular-nums">
                                                            {formatCurrency(p.sellingPrice)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => onQuickAdd(p, 1)}
                                                    className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-extrabold transition-colors shrink-0"
                                                >
                                                    + أضف
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {cartItems.length > 0 && (
                    <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-white dark:bg-[#080d1a] border-t border-slate-100 dark:border-white/[0.08] shadow-[0_-10px_30px_rgba(0,0,0,0.06)] z-10 shrink-0">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-semibold">
                                الإجمالي الفرعي
                            </span>
                            <span className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white tabular-nums">
                                {formatCurrency(subtotal)}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mb-3">
                            لديك كود خصم؟ يمكنك إضافته وتطبيق الخصم في الخطوة التالية
                        </p>
                        <button
                            type="button"
                            onClick={onCheckout}
                            className="w-full py-3.5 sm:py-4 bg-primary text-white rounded-xl font-black hover:bg-primary-dark transition-all brand-glow flex items-center justify-center gap-3 text-base sm:text-lg active:scale-[0.98]"
                        >
                            <span>إتمام الطلب</span>
                            <i className="fas fa-arrow-left text-sm" />
                        </button>
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                            <i className="fas fa-shield-alt text-emerald-500" />
                            <span>دفع آمن وموثوق 100%</span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default StoreCart;
