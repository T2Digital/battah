
import React, { useState, useEffect } from 'react';
import useStore from '../lib/store';
import { Branch } from '../types';
import NotificationsDropdown from './shared/NotificationsDropdown';
import GlobalSearch from './shared/GlobalSearch';

interface HeaderProps {
    toggleSidebar: () => void;
    isSidebarOpen: boolean;
    setViewMode: (mode: 'admin' | 'store') => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, setViewMode }) => {
    const { currentUser, switchActiveBranch, logout } = useStore();
    const [isSearchOpen, setSearchOpen] = useState(false);
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

    if (!currentUser) return null;

    const branchLabels: Record<Branch, string> = {
        'main': 'الرئيسي',
        'branch1': 'فرع 1',
        'branch2': 'فرع 2',
        'branch3': 'فرع 3'
    };

    const hasMultipleBranches = currentUser.allowedBranches && currentUser.allowedBranches.length > 1;

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
                    {hasMultipleBranches && (
                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 mr-2 sm:mr-4 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 sm:px-3 py-1">
                            <i className="fas fa-map-marker-alt text-primary dark:text-primary-light hidden sm:block"></i>
                            <select 
                                value={currentUser.branch}
                                onChange={(e) => switchActiveBranch(e.target.value as Branch)}
                                className="bg-transparent border-none text-xs sm:text-sm text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer outline-none w-auto max-w-[80px] sm:max-w-max p-0"
                            >
                                {currentUser.allowedBranches?.map(b => (
                                    <option key={b} value={b} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{branchLabels[b]}</option>
                                ))}
                            </select>
                        </div>
                    )}
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
                    <button 
                        onClick={() => setViewMode('store')}
                        className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-secondary dark:text-gray-400 dark:hover:text-secondary-light transition"
                    >
                        <i className="fas fa-store"></i>
                        <span>المتجر</span>
                    </button>
                    <NotificationsDropdown />
                    <div className="text-right hidden md:block">
                        <p className="font-semibold text-gray-800 dark:text-white">{currentUser.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser.role}</p>
                    </div>
                    <button onClick={logout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition" title="تسجيل خروج">
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
