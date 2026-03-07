
import React, { useState } from 'react';
import useStore from '../lib/store';
import NotificationsDropdown from './shared/NotificationsDropdown';
import GlobalSearch from './shared/GlobalSearch';

interface HeaderProps {
    toggleSidebar: () => void;
    isSidebarOpen: boolean;
    setViewMode: (mode: 'admin' | 'store') => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, setViewMode }) => {
    const { currentUser, logout } = useStore();
    const [isSearchOpen, setSearchOpen] = useState(false);

    if (!currentUser) return null;

    return (
        <>
            <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md h-20 flex items-center justify-between px-6 z-40" style={{ right: 0 }}>
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-3">
                         <img src="https://i.ibb.co/LDdGwd87/5-1.png" alt="Logo" className="h-10 w-auto" />
                         <h1 className="text-xl font-bold text-gray-800 dark:text-white hidden sm:block">نظام بطاح الأصلي</h1>
                    </div>
                     <button 
                        onClick={() => setSearchOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        aria-label="بحث شامل"
                    >
                        <i className="fas fa-search"></i>
                        <span className="hidden lg:inline">بحث سريع...</span>
                    </button>
                </div>
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => setViewMode('store')}
                        className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-secondary dark:text-gray-400 dark:hover:text-secondary-light transition"
                    >
                        <i className="fas fa-store"></i>
                        <span>المتجر</span>
                    </button>
                    <NotificationsDropdown />
                    <div className="text-right">
                        <p className="font-semibold text-gray-800 dark:text-white">{currentUser.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{currentUser.role}</p>
                    </div>
                    <button onClick={logout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition">
                        <i className="fas fa-sign-out-alt text-xl"></i>
                        <span className="hidden sm:inline">خروج</span>
                    </button>
                     <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light" aria-label="تبديل القائمة الجانبية">
                        <i className="fas fa-bars text-2xl"></i>
                    </button>
                </div>
            </header>
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
};

export default Header;
