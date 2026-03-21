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
        <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden animate-slide-up">
            <button 
                onClick={onCheckout}
                className="w-full bg-gray-900 dark:bg-primary text-white p-4 rounded-2xl shadow-2xl shadow-gray-900/20 dark:shadow-primary/20 flex justify-between items-center hover:bg-gray-800 dark:hover:bg-primary-dark transition-all active:scale-[0.98] border border-gray-800 dark:border-primary-light"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-sm text-white font-bold w-10 h-10 rounded-xl flex items-center justify-center text-sm shadow-inner">
                        {itemCount}
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="font-bold text-base leading-tight">سلة التسوق</span>
                        <span className="text-xs text-gray-300 dark:text-primary-light font-medium">إتمام الطلب الآن</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="font-black text-lg tracking-wide">
                        {formatCurrency(totalAmount)}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white text-gray-900 dark:text-primary flex items-center justify-center shadow-sm">
                        <i className="fas fa-arrow-left text-sm"></i>
                    </div>
                </div>
            </button>
        </div>
    );
};

export default FloatingCheckoutButton;
