
import React, { useState, useEffect } from 'react';
import useStore from '../lib/store';
import { resolveTenantBrandId } from '../lib/tenantBootstrap';
import { changeTenantAdminPassword } from '../lib/tenantErpSync';
import { getActiveBranches, getBranchLabelMap } from '../lib/appConfig';
import { Branch } from '../types';
import NotificationsDropdown from './shared/NotificationsDropdown';
import GlobalSearch from './shared/GlobalSearch';

interface HeaderProps {
    toggleSidebar: () => void;
    isSidebarOpen: boolean;
    setViewMode: (mode: 'admin' | 'store') => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, setViewMode }) => {
    const { currentUser, switchActiveBranch, logout, appCustomization } = useStore(state => ({
        currentUser: state.currentUser,
        switchActiveBranch: state.switchActiveBranch,
        logout: state.logout,
        appCustomization: state.appData?.appCustomization,
    }));
    const [isSearchOpen, setSearchOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passStatus, setPassStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [isSavingPass, setIsSavingPass] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const slug = resolveTenantBrandId();
        if (!slug) return;
        setIsSavingPass(true);
        setPassStatus(null);
        const res = await changeTenantAdminPassword(slug, oldPassword, newPassword);
        setIsSavingPass(false);
        if (res.ok) {
            setPassStatus({ type: 'ok', text: res.message || 'تم تحديث كلمة المرور بنجاح' });
            setOldPassword('');
            setNewPassword('');
            setTimeout(() => setIsPassModalOpen(false), 1200);
        } else {
            setPassStatus({ type: 'err', text: res.error || 'تعذر تحديث كلمة المرور' });
        }
    };

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

    const activeBranches = getActiveBranches(appCustomization);
    const branchLabels = getBranchLabelMap(activeBranches);
    const activeBranchKeys = new Set(activeBranches.map(b => b.key));
    const selectableBranches =
        currentUser.role === 'admin'
            ? activeBranches
            : activeBranches.filter(b => currentUser.allowedBranches?.includes(b.key) && activeBranchKeys.has(b.key));
    const hasMultipleBranches = selectableBranches.length > 1;

    return (
        <>
            <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md h-20 flex items-center justify-between px-6 z-40" style={{ right: 0 }}>
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-3">
                         <img src="https://i.ibb.co/3yL3ZXm5/aa2f6315c6fc.jpg" alt="Logo" className="h-10 w-auto" />
                         <h1 className="text-xl font-bold text-gray-800 dark:text-white hidden sm:block">نظام أوتو هاوس المتكامل</h1>
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
                                {selectableBranches.map(b => (
                                    <option key={b.key} value={b.key} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{branchLabels[b.key] || b.label}</option>
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
                    {resolveTenantBrandId() && (
                        <button
                            onClick={() => { setPassStatus(null); setIsPassModalOpen(true); }}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-cyan-500 dark:text-gray-400 dark:hover:text-cyan-400 transition"
                            title="تغيير كلمة مرور الإدارة"
                        >
                            <i className="fas fa-key text-lg"></i>
                            <span className="hidden lg:inline text-sm">كلمة المرور</span>
                        </button>
                    )}
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
            {isPassModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <i className="fas fa-shield-alt text-cyan-500"></i>
                                تغيير كلمة مرور الإدارة
                            </h3>
                            <button onClick={() => setIsPassModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور الحالية</label>
                                <input type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور الجديدة (6 أحرف فأكثر)</label>
                                <input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            {passStatus && (
                                <p className={`text-sm font-medium ${passStatus.type === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {passStatus.text}
                                </p>
                            )}
                            <button type="submit" disabled={isSavingPass} className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition disabled:opacity-50">
                                {isSavingPass ? 'جاري التحديث...' : 'حفظ كلمة المرور الجديدة'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
