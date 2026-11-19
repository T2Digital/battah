import React, { useState, useEffect, useMemo } from 'react';
import useStore from '../../lib/store';
import { formatCurrency } from '../../lib/utils';
import { getShippingConfig } from '../../lib/appConfig';

interface PromotionBannerProps {
    cartSubtotal?: number;
    onExploreDeals?: () => void;
}

const DEFAULT_TICKER_MESSAGES = [
    'شحن سريع وموثوق لجميع محافظات مصر مع تتبع مباشر للطلب',
    'منتجات أصلية 100% مضمونة ومفحوصة قبل التغليف',
    'دفع آمن عند الاستلام أو عبر المحافظ الإلكترونية وإنستاباي',
];

const PromotionBanner: React.FC<PromotionBannerProps> = ({ cartSubtotal = 0, onExploreDeals }) => {
    const appData = useStore(state => state.appData);
    const shippingConfig = useMemo(
        () => getShippingConfig(appData?.appCustomization),
        [appData?.appCustomization]
    );

    const tickerMessages = useMemo(() => {
        const msgs = appData?.settings?.tickerMessages;
        if (Array.isArray(msgs) && msgs.filter(Boolean).length > 0) {
            return msgs.filter(Boolean);
        }
        if (shippingConfig.freeShippingThreshold > 0) {
            return [
                `شحن مجاني للطلبات فوق ${formatCurrency(shippingConfig.freeShippingThreshold)} 🚚`,
                ...DEFAULT_TICKER_MESSAGES.slice(1),
            ];
        }
        return DEFAULT_TICKER_MESSAGES;
    }, [appData?.settings?.tickerMessages, shippingConfig.freeShippingThreshold]);

    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (tickerMessages.length <= 1) return;
        const timer = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % tickerMessages.length);
        }, 4500);
        return () => clearInterval(timer);
    }, [tickerMessages.length]);

    const freeThreshold = shippingConfig.freeShippingThreshold || 0;
    const showLiveCartIncentive = cartSubtotal > 0 && freeThreshold > 0;
    const remaining = showLiveCartIncentive ? Math.max(0, freeThreshold - cartSubtotal) : 0;
    const progress = showLiveCartIncentive ? Math.min(100, (cartSubtotal / freeThreshold) * 100) : 0;

    return (
        <div className="relative bg-[#060913] text-white border-b border-white/10 py-2 px-3 sm:px-6 z-50 overflow-hidden">
            <div className="container mx-auto flex items-center justify-center gap-3 text-[11px] sm:text-xs font-bold leading-snug">
                {showLiveCartIncentive ? (
                    <div className="flex items-center justify-center gap-2 text-center">
                        <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                                remaining === 0 ? 'bg-emerald-400 animate-ping' : 'bg-primary animate-pulse'
                            }`}
                        />
                        {remaining > 0 ? (
                            <span className="text-slate-100">
                                أضف <strong className="text-sky-300 tabular-nums">{formatCurrency(remaining)}</strong> فقط للحصول على شحن مجاني! 🚚
                            </span>
                        ) : (
                            <span className="text-emerald-300">
                                🎉 مبروك! طلبك مؤهل للشحن المجاني الآن
                            </span>
                        )}
                    </div>
                ) : (
                    <div key={activeIndex} className="flex items-center justify-center gap-2.5 text-center animate-fade-in">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                        <span className="text-slate-100 tracking-wide truncate max-w-[82vw] sm:max-w-2xl">
                            {tickerMessages[activeIndex % tickerMessages.length]}
                        </span>
                        {onExploreDeals && (
                            <button
                                type="button"
                                onClick={onExploreDeals}
                                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold text-sky-300 hover:text-white bg-white/10 hover:bg-white/15 px-2.5 py-0.5 rounded-full border border-white/10 transition-colors shrink-0"
                            >
                                <span>تصفح العروض</span>
                                <i className="fas fa-arrow-left text-[9px]" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {showLiveCartIncentive && (
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-white/10">
                    <div
                        className={`h-full transition-all duration-500 ${remaining === 0 ? 'bg-emerald-400' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default PromotionBanner;
