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
                className="w-full bg-primary text-white p-4 rounded-xl shadow-2xl flex justify-between items-center hover:bg-primary-dark transition-colors border border-primary-light"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white text-primary font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">
                        {itemCount}
                    </div>
                    <span className="font-bold text-lg">إتمام الطلب</span>
                </div>
                <div className="font-bold text-lg ltr">
                    {formatCurrency(totalAmount)}
                </div>
            </button>
        </div>
    );
};

export default FloatingCheckoutButton;
