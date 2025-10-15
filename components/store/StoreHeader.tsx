import React from 'react';

interface StoreHeaderProps {
    cartCount: number;
    onCartClick: () => void;
    setViewMode: (mode: 'admin' | 'store') => void;
    isLoggedIn: boolean;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({ cartCount, onCartClick, setViewMode, isLoggedIn }) => {
    return (
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-md sticky top-0 z-40">
            <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                    <i className="fas fa-car-battery text-3xl text-primary-dark"></i>
                    <h1 className="text-2xl font-bold text-primary-dark dark:text-primary-light">متجر بطاح</h1>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                    <button onClick={onCartClick} className="relative text-gray-600 dark:text-gray-300 hover:text-primary-dark dark:hover:text-primary-light transition-colors">
                        <i className="fas fa-shopping-cart text-2xl"></i>
                        {cartCount > 0 && (
                             <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                                {cartCount}
                            </span>
                        )}
                    </button>
                    {isLoggedIn && (
                         <button 
                            onClick={() => setViewMode('admin')}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                            <i className="fas fa-tachometer-alt"></i>
                            <span className="hidden sm:inline">لوحة التحكم</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default StoreHeader;