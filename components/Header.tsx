
import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    currentUser: User;
    isSidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, currentUser, isSidebarOpen, setSidebarOpen }) => {
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        const updateDate = () => {
            const now = new Date();
            const formattedDate = now.toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            setCurrentDate(formattedDate);
        };
        updateDate();
        const timer = setInterval(updateDate, 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-r from-primary-dark via-primary to-primary-light text-white shadow-lg z-40 transition-all duration-300">
            <div className="h-full flex justify-between items-center px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    <i className="fas fa-car text-4xl text-accent-light animate-pulse"></i>
                    <div className="hidden md:block">
                        <h1 className="text-2xl font-bold">شركة بطاح لقطع غيار السيارات</h1>
                        <p className="text-sm opacity-90">نظام الإدارة المتكامل</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur-sm p-2 rounded-lg text-sm">
                        <i className="fas fa-calendar-alt"></i>
                        <span>{currentDate}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-2 rounded-lg text-sm">
                        <i className="fas fa-user-circle"></i>
                        <span className='hidden sm:inline'>{currentUser.name}</span>
                    </div>
                    <button onClick={toggleTheme} className="w-10 h-10 flex justify-center items-center bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition">
                        <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
                    </button>
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-10 h-10 flex justify-center items-center bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition lg:hidden">
                        <i className="fas fa-bars"></i>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
