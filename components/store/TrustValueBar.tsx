import React from 'react';

const TRUST_ITEMS = [
    {
        icon: 'fa-shipping-fast',
        accent: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10',
        title: 'شحن سريع لكل المحافظات',
        subtitle: 'توصيل لباب البيت وتتبع مباشر',
    },
    {
        icon: 'fa-shield-alt',
        accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
        title: 'دفع آمن ومرن 100%',
        subtitle: 'عند الاستلام أو فودافون كاش وإنستاباي',
    },
    {
        icon: 'fa-award',
        accent: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
        title: 'جودة أصلية ومضمونة',
        subtitle: 'فحص شامل ومطابقة قبل التغليف',
    },
    {
        icon: 'fa-headset',
        accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10',
        title: 'مساعدة فورية 24/7',
        subtitle: 'دعم سريع عبر واتساب والمساعد الذكي',
    },
];

const TrustValueBar: React.FC = () => {
    return (
        <section aria-label="مميزات المتجر" className="container mx-auto px-3 sm:px-6 -mt-5 sm:-mt-8 relative z-30">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {TRUST_ITEMS.map((item) => (
                    <div
                        key={item.title}
                        className="bg-white dark:bg-[#0d1323] rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-white/[0.08] shadow-lg shadow-slate-900/[0.04] flex items-center gap-3 hover:border-primary/30 transition-colors"
                    >
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 text-base sm:text-lg ${item.accent}`}>
                            <i className={`fas ${item.icon}`} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                                {item.title}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {item.subtitle}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default TrustValueBar;
