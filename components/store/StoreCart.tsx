import React, { useEffect } from 'react';
import { CartItem } from '../../types';
import { formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';
import { getShippingConfig } from '../../lib/appConfig';

interface StoreCartProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onUpdateQuantity: (productId: number, quantity: number) => void;
    onCheckout: () => void;
}

const StoreCart: React.FC<StoreCartProps> = ({ isOpen, onClose, cartItems, onUpdateQuantity, onCheckout }) => {
    const appCustomization = useStore(state => state.appData?.appCustomization);
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

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[80] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>
            
            {/* Sidebar */}
            <div className={`fixed top-0 right-0 h-[100dvh] w-full max-w-[100vw] sm:max-w-md bg-white dark:bg-gray-900 shadow-2xl z-[80] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <i className="fas fa-shopping-cart text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-none">سلة التسوق</h3>
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">{cartItems.length} منتجات</span>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="w-10 h-10 flex justify-center items-center rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        aria-label="إغلاق السلة"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                {/* Free Shipping Progress Bar */}
                {cartItems.length > 0 && freeThreshold > 0 && (
                    <div className="px-4 py-3 bg-primary/5 dark:bg-primary/10 border-b border-primary/10 shrink-0">
                        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                            {remainingForFreeShipping > 0 ? (
                                <span className="text-gray-700 dark:text-gray-200">
                                    أضف <strong className="text-primary">{formatCurrency(remainingForFreeShipping)}</strong> للحصول على شحن مجاني! 🚚
                                </span>
                            ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                    مبروك! حصلت على شحن مجاني 🎉
                                </span>
                            )}
                            <span className="text-primary">{Math.round(shippingProgress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${remainingForFreeShipping === 0 ? 'bg-emerald-500' : 'bg-primary'}`}
                                style={{ width: `${shippingProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Cart Items */}
                <div className="flex-grow overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 sm:space-y-4 bg-slate-50 dark:bg-gray-900/50 custom-scrollbar">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                                <i className="fas fa-shopping-basket text-4xl text-gray-300 dark:text-gray-600"></i>
                            </div>
                            <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-2">سلتك فارغة</h4>
                            <p className="text-gray-500 dark:text-gray-400 max-w-[250px]">تصفح منتجاتنا وأضف ما تحتاجه هنا!</p>
                            <button 
                                onClick={onClose}
                                className="mt-8 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors"
                            >
                                تصفح المنتجات
                            </button>
                        </div>
                    ) : (
                        cartItems.map(item => (
                            <div key={item.product.id} className="flex gap-3 sm:gap-4 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 p-1.5 border border-gray-100 dark:border-gray-600">
                                    <img src={item.product.images?.[0] || (item.product as any).imageUrl || 'https://via.placeholder.com/150'} alt={item.product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                </div>
                                
                                <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                                    <div className="pl-9">
                                        {item.product.brand && (
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate mb-0.5">{item.product.brand}</p>
                                        )}
                                        <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2">{item.product.name}</h4>
                                    </div>
                                    
                                    <div className="flex items-center justify-between gap-2 mt-auto">
                                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg h-8 border border-gray-200 dark:border-gray-600">
                                            <button 
                                                type="button"
                                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)} 
                                                className="w-8 h-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                            >
                                                <i className="fas fa-minus text-xs"></i>
                                            </button>
                                            <span className="w-7 text-center font-bold text-xs sm:text-sm text-gray-900 dark:text-white">{item.quantity}</span>
                                            <button 
                                                type="button"
                                                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)} 
                                                className="w-8 h-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                            >
                                                <i className="fas fa-plus text-xs"></i>
                                            </button>
                                        </div>
                                        <span className="font-black text-sm sm:text-base text-primary dark:text-primary-light whitespace-nowrap">
                                            {formatCurrency(item.product.sellingPrice * item.quantity)}
                                        </span>
                                    </div>
                                </div>

                                {/* Delete Button (Always visible on mobile, positioned cleanly left-3 paired with pl-9) */}
                                <button 
                                    type="button"
                                    onClick={() => onUpdateQuantity(item.product.id, 0)} 
                                    className="absolute top-3 left-3 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-900/20 dark:hover:bg-red-600 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shadow-sm"
                                    aria-label="حذف المنتج"
                                >
                                    <i className="fas fa-trash-alt text-xs sm:text-sm"></i>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {cartItems.length > 0 && (
                    <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.2)] z-10 shrink-0">
                        <div className="flex justify-between items-center mb-3 sm:mb-4">
                            <span className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">الإجمالي الفرعي</span>
                            <span className="font-black text-xl sm:text-2xl text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
                        </div>
                        <button 
                            type="button"
                            onClick={onCheckout}
                            className="w-full py-3.5 sm:py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-3 text-base sm:text-lg active:scale-[0.98]"
                        >
                            <span>إتمام الطلب</span>
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                            <i className="fas fa-shield-alt"></i>
                            <span>دفع آمن وموثوق 100%</span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default StoreCart;