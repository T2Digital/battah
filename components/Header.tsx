import React from 'react';
import useStore from '../lib/store';

interface HeaderProps {
    toggleSidebar: () => void;
    isSidebarOpen: boolean;
    setViewMode: (mode: 'admin' | 'store') => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, setViewMode }) => {
    const { currentUser, logout } = useStore();

    if (!currentUser) return null;

    return (
        <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md h-20 flex items-center justify-between px-6 z-40" style={{ right: 0 }}>
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-3">
                     <i className="fas fa-car-battery text-3xl text-primary-dark"></i>
                     <h1 className="text-xl font-bold text-gray-800 dark:text-white">نظام بطاح</h1>
                </div>
                 <button 
                    onClick={() => setViewMode('store')}
                    className="hidden sm:flex items-center gap-2 px-3 py-2 bg-secondary text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <i className="fas fa-store"></i>
                    <span>عرض المتجر</span>
                </button>
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="font-semibold text-gray-800 dark:text-white">{currentUser.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser.role}</p>
                </div>
                <button onClick={logout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition">
                    <i className="fas fa-sign-out-alt text-xl"></i>
                    <span className="hidden sm:inline">تسجيل الخروج</span>
                </button>
                 <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light">
                    <i className="fas fa-bars text-2xl"></i>
                </button>
            </div>
        </header>
    );
};

export default Header;