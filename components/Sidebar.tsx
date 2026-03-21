
import React from 'react';
import { Section } from '../types';
import useStore from '../lib/store';

interface SidebarProps {
    isOpen: boolean;
    activeSection: Section;
    setActiveSection: (section: Section) => void;
    hasPermission: (permission: Section) => boolean;
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeSection, setActiveSection, hasPermission, onClose }) => {
    const { appData, currentUser } = useStore();
    const pendingOrdersCount = appData?.orders.filter(o => o.status === 'pending').length || 0;
    const unreadNotificationsCount = appData?.notifications.filter(n => !n.read).length || 0;

    const navItems = [
        { id: Section.Dashboard, icon: 'fa-tachometer-alt', label: 'لوحة التحكم', permission: Section.Dashboard },
        { id: Section.Treasury, icon: 'fa-cash-register', label: 'الخزينة', permission: Section.Treasury },
        { id: Section.DailySales, icon: 'fa-hand-holding-usd', label: 'مبيعات اليوم', permission: Section.DailySales },
        { id: Section.Orders, icon: 'fa-receipt', label: 'طلبات الأونلاين', permission: Section.Orders, badge: pendingOrdersCount },
        { id: Section.Customers, icon: 'fa-users-cog', label: 'العملاء', permission: Section.Customers },
        { id: Section.StoreManagement, icon: 'fa-warehouse', label: 'إدارة المخزون', permission: Section.StoreManagement },
        { id: Section.Purchasing, icon: 'fa-shopping-cart', label: 'المشتريات', permission: Section.Purchasing },
        { id: Section.Promotions, icon: 'fa-tags', label: 'العروض', permission: Section.Promotions },
        { id: Section.Employees, icon: 'fa-users', label: 'الموظفين', permission: Section.Employees },
        { id: Section.Advances, icon: 'fa-file-invoice-dollar', label: 'السلف', permission: Section.Advances },
        { id: Section.Attendance, icon: 'fa-clock', label: 'الحضور', permission: Section.Attendance },
        { id: Section.Payroll, icon: 'fa-money-check-alt', label: 'المرتبات', permission: Section.Payroll },
        { id: Section.Suppliers, icon: 'fa-truck', label: 'الموردين', permission: Section.Suppliers },
        { id: Section.Expenses, icon: 'fa-receipt', label: 'المصاريف', permission: Section.Expenses },
        { id: Section.DailyReview, icon: 'fa-chart-line', label: 'مراجعة اليوميات', permission: Section.DailyReview },
        { id: Section.Reports, icon: 'fa-file-alt', label: 'التقارير', permission: Section.Reports },
        { id: Section.Notifications, icon: 'fa-bell', label: 'الإشعارات', permission: Section.Notifications, badge: unreadNotificationsCount },
        { id: Section.Users, icon: 'fa-user-shield', label: 'المستخدمين', permission: Section.Users },
        { id: Section.Settings, icon: 'fa-cogs', label: 'الإعدادات', permission: Section.Settings },
    ];

    const NavLink: React.FC<{ item: typeof navItems[0] }> = ({ item }) => {
        if (!hasPermission(item.permission)) return null;

        const isActive = activeSection === item.id;
        return (
            <li
                onClick={() => {
                    setActiveSection(item.id);
                    if (window.innerWidth < 640 && onClose) {
                        onClose();
                    }
                }}
                className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-all duration-200 relative ${
                    isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
                <i className={`fas ${item.icon} text-xl w-8 text-center ${isOpen ? 'mr-1' : ''}`}></i>
                <span className={`transition-all duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>{item.label}</span>
                {item.badge && item.badge > 0 && (
                    <span className={`absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full ${!isOpen ? 'top-0 right-0' : ''}`}>
                        {item.badge}
                    </span>
                )}
            </li>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
                    onClick={() => setActiveSection(activeSection)} // Close sidebar logic should be passed or handled here. 
                    // Actually, SidebarProps doesn't have onClose. We can just rely on the user clicking the toggle button or a close button.
                    // But usually clicking overlay closes it.
                    // For now, let's just make the sidebar an overlay.
                ></div>
            )}
            <aside
                className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-800 shadow-lg z-40 transition-all duration-300 ease-in-out ${
                    isOpen ? 'w-64 sm:w-72 translate-x-0' : 'w-0 sm:w-20 translate-x-full sm:translate-x-0 overflow-hidden'
                }`}
            >
                <div className="flex items-center justify-center h-20 border-b dark:border-gray-700">
                    {/* This space is intentionally left for the header to overlay */}
                </div>
                <nav className="pt-4 px-3 h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
                    <ul>
                        {navItems.map(item => (
                            <NavLink key={item.id} item={item} />
                        ))}
                    </ul>
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;