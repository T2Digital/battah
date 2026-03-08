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
        <div className="bg-primary-dark text-white text-sm font-bold p-2 overflow-hidden whitespace-nowrap">
            <div className="inline-block animate-ticker">
                {tickerMessages.map((msg, index) => (
                    <span key={index} className="mx-8">{msg}</span>
                ))}
                 {/* Duplicate for seamless loop */}
                 {tickerMessages.map((msg, index) => (
                    <span key={`dup-${index}`} className="mx-8">{msg}</span>
                ))}
            </div>
        </div>
    );
};

export default PromotionBanner;
