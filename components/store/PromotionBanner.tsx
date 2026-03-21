import React from 'react';
import useStore from '../../lib/store';

const PromotionBanner: React.FC = () => {
    const { appData } = useStore();
    const tickerMessages = appData?.settings?.tickerMessages || [
        "🔥 شحن مجاني للطلبات فوق 2000 جنيه! 🔥",
        "خصم 10% على فلاتر Bosch هذا الأسبوع!",
        "🚗 كل ما تحتاجه سيارتك في مكان واحد 🚗"
    ];

    return (
        <div className="bg-gradient-to-r from-gray-900 via-primary-dark to-gray-900 dark:from-black dark:via-primary-dark dark:to-black text-white text-xs sm:text-sm font-bold py-2.5 overflow-hidden whitespace-nowrap relative shadow-sm z-50">
            {/* Decorative elements */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-900 dark:from-black to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-900 dark:from-black to-transparent z-10 pointer-events-none"></div>
            
            <div className="inline-block animate-ticker">
                {tickerMessages.map((msg, index) => (
                    <span key={index} className="mx-8 inline-flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-light animate-pulse"></span>
                        <span className="tracking-wide">{msg}</span>
                    </span>
                ))}
                 {/* Duplicate for seamless loop */}
                 {tickerMessages.map((msg, index) => (
                    <span key={`dup-${index}`} className="mx-8 inline-flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-light animate-pulse"></span>
                        <span className="tracking-wide">{msg}</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default PromotionBanner;
