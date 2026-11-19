
import React, { useState, useEffect } from 'react';
import useStore from '../../lib/store';
import { getStoreBranding } from '../../lib/appConfig';

interface StoreHeaderProps {
    onCartClick: () => void;
    cartItemCount: number;
    setViewMode: (mode: 'admin' | 'store') => void;
    onMyOrdersClick: () => void;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({ onCartClick, cartItemCount, setViewMode, onMyOrdersClick }) => {
    const { settings, storefrontSettings } = useStore(state => ({
        settings: state.appData?.settings,
        storefrontSettings: state.appData?.storefrontSettings,
    }));
    const branding = getStoreBranding(storefrontSettings, settings?.companyName || 'المتجر الإلكتروني');
    const brandName = branding.companyName;
    const brandTagline = settings?.tickerMessages?.[0] || branding.slogan || 'المتجر الإلكتروني المعتمد';
    const logoSrc = branding.logoUrl || 'https://i.ibb.co/3yL3ZXm5/aa2f6315c6fc.jpg';

    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDarkMode(true);
        }
    };

    return (
        <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm py-2.5 sm:py-3' : 'bg-white dark:bg-gray-900 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800'}`}>
            <div className="container mx-auto px-3 sm:px-6 flex justify-between items-center gap-2">
                {/* Logo Area */}
                <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700 group-hover:border-primary/30 transition-colors">
                        <img src={logoSrc} alt={brandName} className="w-8 h-8 sm:w-10 sm:h-10 object-contain group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-sm sm:text-xl font-black text-gray-900 dark:text-white leading-tight tracking-tight truncate max-w-[145px] sm:max-w-xs md:max-w-md">{brandName}</h1>
                        <span className="text-[10px] text-primary font-bold tracking-wide truncate max-w-[145px] sm:max-w-xs mt-0.5 hidden xs:block sm:block">{brandTagline}</span>
                    </div>
                </div>

                {/* Actions Area */}
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    {/* Dark Mode Toggle */}
                    <button 
                        onClick={toggleDarkMode}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="تبديل الوضع الليلي"
                    >
                        {isDarkMode ? <i className="fas fa-sun text-base sm:text-lg"></i> : <i className="fas fa-moon text-base sm:text-lg"></i>}
                    </button>
                    
                    {/* My Orders Button (Mobile + Desktop) */}
                    <button 
                        onClick={onMyOrdersClick} 
                        className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-full text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary-light hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors font-medium text-xs sm:text-sm"
                        title="طلباتي"
                        aria-label="طلباتي"
                    >
                        <i className="fas fa-receipt text-base sm:text-sm"></i>
                        <span className="hidden sm:inline">طلباتي</span>
                    </button>
                    
                    {/* Cart Button */}
                    <button 
                        onClick={onCartClick} 
                        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-700 hover:text-primary dark:text-gray-200 dark:hover:text-primary-light hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                        aria-label="سلة التسوق"
                    >
                        <i className="fas fa-shopping-cart text-base sm:text-lg"></i>
                        {cartItemCount > 0 && (
                            <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-primary text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm animate-bounce-short">
                                {cartItemCount}
                            </span>
                        )}
                    </button>
                    
                    {/* Divider */}
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
                    
                    {/* Admin Login Button */}
                    <button 
                        onClick={() => setViewMode('admin')}
                        className="sm:hidden w-9 h-9 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center shadow-sm"
                        aria-label="دخول الإدارة"
                        title="دخول الإدارة"
                    >
                        <i className="fas fa-user-shield text-sm"></i>
                    </button>
                    <button 
                        onClick={() => setViewMode('admin')}
                        className="hidden sm:flex items-center gap-2 px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-bold text-sm shadow-sm hover:shadow-md active:scale-95"
                    >
                        <i className="fas fa-user-shield text-xs"></i>
                        <span>دخول الإدارة</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default StoreHeader;