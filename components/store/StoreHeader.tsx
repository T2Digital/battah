import React from 'react';

interface StoreHeaderProps {
    onCartClick: () => void;
    cartItemCount: number;
    setViewMode: (mode: 'admin' | 'store') => void;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({ onCartClick, cartItemCount, setViewMode }) => {
    return (
        <header className="bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 backdrop-blur-sm shadow-md sticky top-0 z-30">
            <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <i className="fas fa-car-battery text-3xl text-primary-dark"></i>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">متجر بطاح</h1>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
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