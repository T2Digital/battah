import React from 'react';
import { formatCurrency } from '../../lib/utils';

interface FloatingCheckoutButtonProps {
    itemCount: number;
    totalAmount: number;
    onCheckout: () => void;
}

const FloatingCheckoutButton: React.FC<FloatingCheckoutButtonProps> = ({
    itemCount,
    totalAmount,
    onCheckout,
}) => {
    if (itemCount === 0) return null;

    return (
        <div className="fixed bottom-[4.5rem] left-3 right-3 pb-[env(safe-area-inset-bottom)] z-40 md:hidden animate-slide-up">
            <button
                type="button"
                onClick={onCheckout}
                className="w-full bg-slate-900/95 dark:bg-primary text-white px-4 py-3 rounded-2xl shadow-2xl brand-glow backdrop-blur-md flex justify-between items-center transition-all active:scale-[0.98] border border-white/15"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="bg-white/20 text-white font-black w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 tabular-nums">
                        {itemCount}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                        <span className="font-black text-xs sm:text-sm leading-tight">سلة التسوق</span>
                        <span className="text-[10px] text-slate-300 dark:text-sky-100 font-semibold truncate">
                            اضغط لإتمام الطلب الآن
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="font-black text-sm sm:text-base tracking-wide tabular-nums">
                        {formatCurrency(totalAmount)}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white text-slate-900 dark:text-primary flex items-center justify-center shadow-sm">
                        <i className="fas fa-arrow-left text-xs" />
                    </div>
                </div>
            </button>
        </div>
    );
};

export default FloatingCheckoutButton;
