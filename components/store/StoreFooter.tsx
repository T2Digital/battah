import React from 'react';
import useStore from '../../lib/store';
import { getStoreBranding } from '../../lib/appConfig';

interface StoreFooterProps {
    setViewMode: (mode: 'admin' | 'store') => void;
}

const StoreFooter: React.FC<StoreFooterProps> = ({ setViewMode }) => {
    const storefrontSettings = useStore(state => state.appData?.storefrontSettings);
    const branding = getStoreBranding(storefrontSettings, 'المتجر الإلكتروني');
    const displayAddress = branding.address || 'جمهورية مصر العربية';
    const displayPhone = branding.contactPhone;
    const displayEmail = branding.contactEmail;
    const displayName = branding.companyName;
    const displayLogo = branding.logoUrl || 'https://i.ibb.co/3yL3ZXm5/aa2f6315c6fc.jpg';
    const whatsappHref = branding.whatsappFormatted
        ? `https://wa.me/${branding.whatsappFormatted}?text=${encodeURIComponent(`مرحباً ${displayName}، أريد الاستفسار عن المنتجات`)}`
        : '';

    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pt-12 sm:pt-16 pb-24 mt-12 sm:mt-16">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 sm:mb-12">
                    {/* Brand Info */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700 shrink-0">
                                <img src={displayLogo} alt={displayName} className="w-10 h-10 object-contain" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight tracking-tight truncate">{displayName}</h3>
                                {branding.slogan && (
                                    <span className="text-xs text-primary font-bold mt-1 block">{branding.slogan}</span>
                                )}
                            </div>
                        </div>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-sm leading-relaxed">
                            {branding.slogan || 'وجهتك الموثوقة للتسوق أونلاين بمنتجات عالية الجودة، أسعار تنافسية، وتوصيل سريع لجميع المحافظات.'}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {branding.facebookUrl && (
                                <a href={branding.facebookUrl} target="_blank" rel="noreferrer" aria-label="فيسبوك" className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                                    <i className="fab fa-facebook-f"></i>
                                </a>
                            )}
                            {branding.instagramUrl && (
                                <a href={branding.instagramUrl} target="_blank" rel="noreferrer" aria-label="إنستجرام" className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-gray-700 transition-colors">
                                    <i className="fab fa-instagram"></i>
                                </a>
                            )}
                            {branding.tiktokUrl && (
                                <a href={branding.tiktokUrl} target="_blank" rel="noreferrer" aria-label="تيك توك" className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <i className="fab fa-tiktok"></i>
                                </a>
                            )}
                            {whatsappHref && (
                                <a href={whatsappHref} target="_blank" rel="noreferrer" aria-label="واتساب" className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors">
                                    <i className="fab fa-whatsapp"></i>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 relative inline-block">
                            روابط سريعة
                            <span className="absolute -bottom-2 right-0 w-1/2 h-1 bg-primary rounded-full"></span>
                        </h4>
                        <ul className="space-y-3">
                            <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-2"><i className="fas fa-chevron-left text-xs"></i> الرئيسية</a></li>
                            <li><a href="#store-products" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-2"><i className="fas fa-chevron-left text-xs"></i> المنتجات</a></li>
                            <li><a href="#category-highlights" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-2"><i className="fas fa-chevron-left text-xs"></i> الأقسام</a></li>
                            <li className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
                                <button onClick={() => setViewMode('admin')} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-bold text-sm shadow-sm">
                                    <i className="fas fa-user-shield"></i> تسجيل الدخول للإدارة
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 relative inline-block">
                            تواصل معنا
                            <span className="absolute -bottom-2 right-0 w-1/2 h-1 bg-primary rounded-full"></span>
                        </h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                                <i className="fas fa-map-marker-alt mt-1 text-primary"></i>
                                <div className="space-y-2 text-sm">
                                    <p>{displayAddress}</p>
                                </div>
                            </li>
                            {displayPhone && (
                                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                    <i className="fas fa-phone-alt text-primary"></i>
                                    <a href={`tel:${displayPhone}`} dir="ltr" className="hover:text-primary transition-colors">{displayPhone}</a>
                                </li>
                            )}
                            {displayEmail && (
                                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                    <i className="fas fa-envelope text-primary"></i>
                                    <a href={`mailto:${displayEmail}`} dir="ltr" className="hover:text-primary transition-colors truncate">{displayEmail}</a>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center md:text-right">
                        &copy; {new Date().getFullYear()} {displayName}. جميع الحقوق محفوظة.
                    </p>
                    <div className="flex flex-wrap gap-2.5 items-center justify-center">
                        <div className="flex items-center justify-center h-8 bg-[#E60000] rounded-md text-white font-bold text-xs px-3 shadow-sm">
                            Vodafone Cash
                        </div>
                        <div className="flex items-center justify-center h-8 bg-[#5A2D82] rounded-md text-white font-bold text-xs px-3 shadow-sm">
                            InstaPay
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default StoreFooter;
