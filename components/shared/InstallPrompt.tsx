import React, { useState, useEffect } from 'react';
import useStore from '../../lib/store';

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const { appData } = useStore();

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Check if user has already dismissed it recently? 
            // For now, show it if it hasn't been installed.
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-2xl z-50 border border-gray-100 dark:border-gray-700 animate-slide-up flex flex-col gap-4 ring-1 ring-black/5 dark:ring-white/5">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img src="https://i.ibb.co/LDdGwd87/5-1.png" alt="App Icon" className="w-14 h-14 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 object-cover" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                            <i className="fas fa-check text-white text-[10px]"></i>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 dark:text-white text-base mb-0.5">تثبيت التطبيق</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">احصل على تجربة تسوق أسرع وأفضل مع تطبيقنا المخصص.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowPrompt(false)} 
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <i className="fas fa-times text-sm"></i>
                </button>
            </div>
            <div className="flex gap-3 mt-2">
                <button 
                    onClick={handleInstallClick} 
                    className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <i className="fas fa-download"></i>
                    تثبيت الآن
                </button>
                <button 
                    onClick={() => setShowPrompt(false)} 
                    className="flex-1 bg-gray-50 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
                >
                    لاحقاً
                </button>
            </div>
        </div>
    );
};

export default InstallPrompt;
