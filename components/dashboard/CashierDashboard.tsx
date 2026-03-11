import React, { useMemo } from 'react';
import { User, Section } from '../../types';
import StatCard from './StatCard';
import useStore from '../../lib/store';

interface CashierDashboardProps {
    currentUser: User;
    setActiveSection: (section: Section) => void;
}

const CashierDashboard: React.FC<CashierDashboardProps> = ({ currentUser, setActiveSection }) => {
    const dailySales = useStore(state => state.appData?.dailySales || []);
    const todayStr = new Date().toISOString().split('T')[0];

    const { todaySalesTotal, todayInvoicesCount } = useMemo(() => {
        const todaySales = dailySales.filter(s => s.date === todayStr);
        const total = todaySales.reduce((sum, s) => sum + (s.direction === 'بيع' ? s.totalAmount : -s.totalAmount), 0);
        return { todaySalesTotal: total, todayInvoicesCount: todaySales.length };
    }, [dailySales, todayStr]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">أهلاً بك، {currentUser.name}! (كاشير)</h2>
                <p className="text-gray-600 dark:text-gray-400">يمكنك إدارة الخزينة وتحصيل الفواتير من هنا.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon="fa-cash-register" title="إجمالي مبيعات اليوم" value={todaySalesTotal} isCurrency />
                <StatCard icon="fa-file-invoice" title="عدد الفواتير اليوم" value={todayInvoicesCount.toString()} />
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex gap-4">
                <button
                    onClick={() => setActiveSection(Section.DailySales)}
                    className="px-6 py-3 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md"
                >
                    <i className="fas fa-file-invoice-dollar"></i>
                    إدارة الفواتير
                </button>
                <button
                    onClick={() => setActiveSection(Section.Treasury)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-md"
                >
                    <i className="fas fa-vault"></i>
                    الخزينة
                </button>
            </div>
        </div>
    );
};

export default CashierDashboard;
