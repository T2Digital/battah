import React from 'react';
import useStore from '../../lib/store';
import { getMainCategories, getStoreBranding } from '../../lib/appConfig';

interface StoreFooterProps {
    setViewMode: (mode: 'admin' | 'store') => void;
}

const StoreFooter: React.FC<StoreFooterProps> = ({ setViewMode }) => {
    const { storefrontSettings, appCustomization, products } = useStore(state => ({
        storefrontSettings: state.appData?.storefrontSettings,
        appCustomization: state.appData?.appCustomization,
        products: state.appData?.products || [],
    }));
    const branding = getStoreBranding(storefrontSettings, 'المتجر الإلكتروني');
    const topCategories = getMainCategories(appCustomization, products).slice(0, 4);
    const displayAddress = branding.address || 'جمهورية مصر العربية';
    const displayPhone = branding.contactPhone;
    const displayEmail = branding.contactEmail;
    const displayName = branding.companyName;
    const displayLogo = branding.logoUrl || 'https://i.ibb.co/3yL3ZXm5/aa2f6315c6fc.jpg';
    const whatsappHref = branding.whatsappFormatted
        ? `https://wa.me/${branding.whatsappFormatted}?text=${encodeURIComponent(
              `مرحباً ${displayName}، أريد الاستفسار عن المنتجات`
          )}`
        : '';

    return (
        <footer className="bg-[#060913] text-slate-300 border-t border-white/[0.08] pt-14 pb-28 md:pb-12">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 mb-10 sm:mb-12">
                    {/* Brand Lockup */}
                    <div className="md:col-span-5">
                        <div className="flex items-center gap-3.5 mb-5">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                                <img src={displayLogo} alt={displayName} className="w-full h-full object-contain" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                                    {displayName}
                                </h3>
                                {branding.slogan && (
                                    <span className="text-xs text-sky-300 font-bold mt-1 block truncate">
                                        {branding.slogan}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mb-6 max-w-md leading-relaxed">
                            {branding.slogan ||
                                'وجهتك الموثوقة للتسوق أونلاين بمنتجات عالية الجودة، أسعار تنافسية، وتوصيل سريع لجميع المحافظات.'}
                        </p>
                        <div className="flex flex-wrap gap-2.5">
                            {branding.facebookUrl && (
                                <a
                                    href={branding.facebookUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="فيسبوك"
                                    className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#1877F2] transition-colors"
                                >
                                    <i className="fab fa-facebook-f" />
                                </a>
                            )}
                            {branding.instagramUrl && (
                                <a
                                    href={branding.instagramUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="إنستجرام"
                                    className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-pink-600 transition-colors"
                                >
                                    <i className="fab fa-instagram" />
                                </a>
                            )}
                            {branding.tiktokUrl && (
                                <a
                                    href={branding.tiktokUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="تيك توك"
                                    className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 hover:text-slate-950 hover:bg-white transition-colors"
                                >
                                    <i className="fab fa-tiktok" />
                                </a>
                            )}
                            {whatsappHref && (
                                <a
                                    href={whatsappHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="واتساب"
                                    className="w-10 h-10 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                                >
                                    <i className="fab fa-whatsapp text-lg" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Quick Links & Categories */}
                    <div className="md:col-span-3">
                        <h4 className="text-base font-black text-white mb-5 flex items-center gap-2">
                            <span className="w-1.5 h-5 rounded-full bg-primary" />
                            روابط سريعة
                        </h4>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <a href="#" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                                    <i className="fas fa-chevron-left text-[10px] text-primary" />
                                    الرئيسية
                                </a>
                            </li>
                            <li>
                                <a href="#store-products" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                                    <i className="fas fa-chevron-left text-[10px] text-primary" />
                                    جميع المنتجات
                                </a>
                            </li>
                            <li>
                                <a href="#category-highlights" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                                    <i className="fas fa-chevron-left text-[10px] text-primary" />
                                    أقسام المتجر ({topCategories.length})
                                </a>
                            </li>
                            <li className="pt-3">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('admin')}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl transition-all font-bold text-xs"
                                >
                                    <i className="fas fa-user-shield text-sky-300" />
                                    تسجيل الدخول للإدارة
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="md:col-span-4">
                        <h4 className="text-base font-black text-white mb-5 flex items-center gap-2">
                            <span className="w-1.5 h-5 rounded-full bg-primary" />
                            تواصل معنا
                        </h4>
                        <ul className="space-y-3.5 text-sm">
                            <li className="flex items-start gap-3 text-slate-400">
                                <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-primary shrink-0">
                                    <i className="fas fa-map-marker-alt text-xs" />
                                </span>
                                <span className="pt-1">{displayAddress}</span>
                            </li>
                            {displayPhone && (
                                <li className="flex items-center gap-3 text-slate-400">
                                    <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-primary shrink-0">
                                        <i className="fas fa-phone-alt text-xs" />
                                    </span>
                                    <a href={`tel:${displayPhone}`} dir="ltr" className="hover:text-white transition-colors font-semibold">
                                        {displayPhone}
                                    </a>
                                </li>
                            )}
                            {displayEmail && (
                                <li className="flex items-center gap-3 text-slate-400">
                                    <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-primary shrink-0">
                                        <i className="fas fa-envelope text-xs" />
                                    </span>
                                    <a href={`mailto:${displayEmail}`} dir="ltr" className="hover:text-white transition-colors truncate">
                                        {displayEmail}
                                    </a>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Copyright & Trust Strip */}
                <div className="pt-7 border-t border-white/[0.08] flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-400 text-xs sm:text-sm text-center md:text-right">
                        &copy; {new Date().getFullYear()} {displayName}. جميع الحقوق محفوظة.
                    </p>
                    <div className="flex flex-wrap gap-2 items-center justify-center">
                        <span className="h-8 bg-white/10 border border-white/10 rounded-lg text-slate-200 font-bold text-[11px] px-3 flex items-center gap-1.5">
                            <i className="fas fa-money-bill-wave text-emerald-400" />
                            الدفع عند الاستلام
                        </span>
                        <span className="flex items-center justify-center h-8 bg-[#E60000] rounded-lg text-white font-bold text-xs px-3 shadow-sm">
                            Vodafone Cash
                        </span>
                        <span className="flex items-center justify-center h-8 bg-[#5A2D82] rounded-lg text-white font-bold text-xs px-3 shadow-sm">
                            InstaPay
                        </span>
                        <span className="h-8 bg-white/10 border border-white/10 rounded-lg text-slate-200 font-bold text-[11px] px-3 flex items-center gap-1.5">
                            <i className="fas fa-truck text-sky-400" />
                            شحن سريع
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default StoreFooter;
