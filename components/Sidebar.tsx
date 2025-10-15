import React from 'react';
import { Section } from '../types';

interface SidebarProps {
    isOpen: boolean;
    activeSection: Section;
    setActiveSection: (section: Section) => void;
    hasPermission: (permission: Section) => boolean;
}

interface NavItem {
    section: Section;
    icon: string;
    label: string;
}

const navItems: NavItem[] = [
    { section: Section.Dashboard, icon: 'fa-tachometer-alt', label: 'لوحة التحكم' },
    { section: Section.Treasury, icon: 'fa-cash-register', label: 'الخزينة' },
    { section: Section.DailySales, icon: 'fa-hand-holding-usd', label: 'مبيعات اليوم' },
    { section: Section.Inventory, icon: 'fa-warehouse', label: 'إدارة المخزون' },
    { section: Section.Purchasing, icon: 'fa-shopping-cart', label: 'المشتريات' },
    { section: Section.Employees, icon: 'fa-users', label: 'إدارة الموظفين' },
    { section: Section.Advances, icon: 'fa-file-invoice-dollar', label: 'سلف الموظفين' },
    { section: Section.Attendance, icon: 'fa-clock', label: 'الحاضر والانصراف' },
    { section: Section.Payroll, icon: 'fa-money-check-alt', label: 'القبض والمرتبات' },
    { section: Section.Suppliers, icon: 'fa-truck', label: 'الموردين والدفعات' },
    { section: Section.Expenses, icon: 'fa-receipt', label: 'المصاريف' },
    { section: Section.DailyReview, icon: 'fa-chart-line', label: 'مراجعة اليوميات' },
    { section: Section.Reports, icon: 'fa-file-alt', label: 'التقارير' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeSection, setActiveSection, hasPermission }) => {
    const NavButton: React.FC<{ item: NavItem }> = ({ item }) => (
        <button
            onClick={() => setActiveSection(item.section)}
            className={`w-full flex items-center gap-4 p-4 text-right text-base rounded-r-lg transition-all duration-200 ${
                activeSection === item.section
                    ? 'bg-gradient-to-l from-accent to-accent-light text-white font-bold shadow-md'
                    : 'text-gray-200 hover:bg-white/10 hover:text-accent-light'
            }`}
        >
            <i className={`fas ${item.icon} w-6 text-lg text-center`}></i>
            <span className={`transition-opacity duration-200 ${!isOpen && 'lg:opacity-0'}`}>{item.label}</span>
        </button>
    );

    return (
        <aside
            className={`fixed top-0 right-0 h-full bg-slate-800 text-white z-30 transition-all duration-300 ease-in-out ${
                isOpen ? 'w-72' : 'w-0 lg:w-20'
            } overflow-hidden`}
        >
            <nav className="pt-24 h-full overflow-y-auto pb-4">
                <ul className="flex flex-col gap-1 pr-0 lg:pr-2">
                    {navItems.filter(item => hasPermission(item.section)).map((item) => (
                        <li key={item.section}>
                           <NavButton item={item} />
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;