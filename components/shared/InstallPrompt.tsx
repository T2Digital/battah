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
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl z-50 border border-gray-200 dark:border-gray-700 animate-slide-up flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <img src="https://i.ibb.co/LDdGwd87/5-1.png" alt="App Icon" className="w-12 h-12 rounded-lg shadow-sm" />
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">تثبيت التطبيق</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">احصل على تجربة أفضل مع تطبيقنا.</p>
                    </div>
                </div>
                <button onClick={() => setShowPrompt(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <i className="fas fa-times"></i>
                </button>
            </div>
            <div className="flex gap-2 mt-1">
                <button onClick={handleInstallClick} className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark transition shadow-sm">
                    تثبيت الآن
                </button>
                <button onClick={() => setShowPrompt(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition">
                    لاحقاً
                </button>
            </div>
        </div>
    );
};

export default InstallPrompt;
