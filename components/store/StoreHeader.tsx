
import React, { useState, useEffect } from 'react';

interface StoreHeaderProps {
    onCartClick: () => void;
    cartItemCount: number;
    setViewMode: (mode: 'admin' | 'store') => void;
    onMyOrdersClick: () => void;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({ onCartClick, cartItemCount, setViewMode, onMyOrdersClick }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        // Check initial theme from localStorage or system preference
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
        <header className="bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 backdrop-blur-sm shadow-md sticky top-0 z-30">
            <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img src="https://i.ibb.co/LDdGwd87/5-1.png" alt="Logo" className="h-10 w-auto" />
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">متجر بطاح الأصلي</h1>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                    <button 
                        onClick={toggleDarkMode}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        aria-label="تبديل الوضع الليلي"
                        title="تبديل الوضع الليلي"
                    >
                        {isDarkMode ? <i className="fas fa-sun text-yellow-500"></i> : <i className="fas fa-moon"></i>}
                    </button>
                     <button onClick={onMyOrdersClick} className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light flex items-center gap-2 text-sm">
                        <i className="fas fa-receipt"></i>
                        <span className="hidden sm:inline">طلباتي</span>
                    </button>
                    <button onClick={onCartClick} className="relative text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light">
                        <i className="fas fa-shopping-cart text-2xl"></i>
                        {cartItemCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {cartItemCount}
                            </span>
                        )}
                    </button>
                    <button 
                        onClick={() => setViewMode('admin')}
                        className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
                    >
                        <i className="fas fa-user-shield"></i>
                        <span className="hidden sm:inline">دخول للنظام</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default StoreHeader;