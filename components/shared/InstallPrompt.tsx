import React, { useState, useEffect } from 'react';
import useStore from '../../lib/store';
import { getStoreBranding } from '../../lib/appConfig';

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const storefrontSettings = useStore(state => state.appData?.storefrontSettings);
    const branding = getStoreBranding(storefrontSettings, 'المتجر الإلكتروني');
    const logoSrc = branding.logoUrl || 'https://i.ibb.co/3yL3ZXm5/aa2f6315c6fc.jpg';

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-20 left-3 right-3 md:bottom-5 md:left-auto md:right-5 md:w-96 bg-white dark:bg-[#0d1323] p-5 rounded-2xl shadow-2xl z-50 border border-slate-200 dark:border-white/10 animate-slide-up flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                        <img
                            src={logoSrc}
                            alt={branding.companyName}
                            className="w-12 h-12 rounded-xl shadow-md border border-slate-200 dark:border-white/10 object-contain bg-white dark:bg-slate-800 p-1"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-[#0d1323] rounded-full flex items-center justify-center">
                            <i className="fas fa-check text-white text-[9px]" />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base mb-0.5 truncate">
                            تثبيت تطبيق {branding.companyName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            احصل على تجربة تسوق أسرع وأفضل مباشرة من شاشتك.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShowPrompt(false)}
                    aria-label="إغلاق"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors shrink-0"
                >
                    <i className="fas fa-times text-xs" />
                </button>
            </div>
            <div className="flex gap-2.5">
                <button
                    type="button"
                    onClick={handleInstallClick}
                    className="flex-1 bg-primary text-white py-2.5 rounded-xl font-extrabold hover:bg-primary-dark transition-all brand-glow active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                >
                    <i className="fas fa-download" />
                    تثبيت الآن
                </button>
                <button
                    type="button"
                    onClick={() => setShowPrompt(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15 transition-all text-sm"
                >
                    لاحقاً
                </button>
            </div>
        </div>
    );
};

export default InstallPrompt;
