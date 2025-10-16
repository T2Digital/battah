import React from 'react';

const PromotionBanner: React.FC = () => {
    return (
        <div className="bg-primary-dark text-white text-sm font-bold p-2 overflow-hidden whitespace-nowrap">
            <div className="inline-block animate-ticker">
                <span className="mx-8">🔥 شحن مجاني للطلبات فوق 2000 جنيه! 🔥</span>
                <span className="mx-8">خصم 10% على فلاتر Bosch هذا الأسبوع!</span>
                <span className="mx-8">🚗 كل ما تحتاجه سيارتك في مكان واحد 🚗</span>
                <span className="mx-8">🔥 شحن مجاني للطلبات فوق 2000 جنيه! 🔥</span>
                <span className="mx-8">خصم 10% على فلاتر Bosch هذا الأسبوع!</span>
                <span className="mx-8">🚗 كل ما تحتاجه سيارتك في مكان واحد 🚗</span>
            </div>
        </div>
    );
};

export default PromotionBanner;
