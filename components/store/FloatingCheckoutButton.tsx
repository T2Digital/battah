import React from 'react';
import { formatCurrency } from '../../lib/utils';

interface FloatingCheckoutButtonProps {
    itemCount: number;
    totalAmount: number;
    onCheckout: () => void;
}

const FloatingCheckoutButton: React.FC<FloatingCheckoutButtonProps> = ({ itemCount, totalAmount, onCheckout }) => {
    if (itemCount === 0) return null;

    return (
        <div className="fixed bottom-3 left-3 right-3 pb-[env(safe-area-inset-bottom)] z-40 md:hidden animate-slide-up">
            <button 
                onClick={onCheckout}
                className="w-full bg-gray-900 dark:bg-primary text-white px-4 py-3 rounded-2xl shadow-2xl shadow-gray-900/25 dark:shadow-primary/25 flex justify-between items-center hover:bg-gray-800 dark:hover:bg-primary-dark transition-all active:scale-[0.98] border border-gray-800 dark:border-primary-light"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="bg-white/20 backdrop-blur-sm text-white font-bold w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-inner shrink-0">
                        {itemCount}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                        <span className="font-bold text-sm leading-tight">سلة التسوق</span>
                        <span className="text-[11px] text-gray-300 dark:text-sky-100 font-medium truncate">إتمام الطلب الآن</span>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <div className="font-black text-base tracking-wide">
                        {formatCurrency(totalAmount)}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white text-gray-900 dark:text-primary flex items-center justify-center shadow-sm">
                        <i className="fas fa-arrow-left text-xs"></i>
                    </div>
                </div>
            </button>
        </div>
    );
};

export default FloatingCheckoutButton;
