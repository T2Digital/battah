import React from 'react';
import useStore from '../../lib/store';
import { getStoreBranding } from '../../lib/appConfig';

interface SocialProofBandProps {
    onShareStore: () => void;
    onMyOrdersClick: () => void;
}

const SocialProofBand: React.FC<SocialProofBandProps> = ({ onShareStore, onMyOrdersClick }) => {
    const storefrontSettings = useStore(state => state.appData?.storefrontSettings);
    const branding = getStoreBranding(storefrontSettings, 'المتجر الإلكتروني');
    const whatsappHref = branding.whatsappFormatted
        ? `https://wa.me/${branding.whatsappFormatted}?text=${encodeURIComponent(
              `مرحباً ${branding.companyName}، أريد المساعدة في اختيار طلبي`
          )}`
        : '';

    return (
        <section className="container mx-auto px-3 sm:px-6 py-10 sm:py-14">
            <div className="relative rounded-3xl bg-[#070c1b] text-white p-6 sm:p-10 lg:p-12 overflow-hidden border border-white/10 shadow-2xl">
                <div className="absolute inset-0 hero-grid-bg opacity-40 pointer-events-none" />
                <div
                    className="absolute -top-24 -left-16 w-72 h-72 rounded-full blur-[110px] pointer-events-none"
                    style={{ backgroundColor: 'rgba(var(--brand-primary-rgb), 0.3)' }}
                />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="max-w-xl">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-sky-200 text-xs font-extrabold mb-3">
                            <i className="fas fa-bolt text-amber-300" />
                            خدمة عملاء ومساعدة سريعة
                        </span>
                        <h2 className="text-xl sm:text-3xl font-black leading-snug mb-2">
                            تحتاج مساعدة في اختيار طلبك؟ أو شارك المتجر مع أصدقائك
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            فريقنا جاهز للرد على استفساراتك ومساعدتك في إتمام طلبك أو متابعة شحنتك في لحظات.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {whatsappHref && (
                            <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                            >
                                <i className="fab fa-whatsapp text-lg" />
                                <span>تواصل عبر واتساب</span>
                            </a>
                        )}

                        <button
                            type="button"
                            onClick={onShareStore}
                            className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                        >
                            <i className="fas fa-share-alt text-primary" />
                            <span>شارك المتجر</span>
                        </button>

                        <button
                            type="button"
                            onClick={onMyOrdersClick}
                            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/15 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <i className="fas fa-truck" />
                            <span>تتبع طلبك الآن</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SocialProofBand;
