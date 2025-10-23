import React, { useMemo } from 'react';
import { User, DailySale, Section } from '../../types';
import StatCard from './StatCard';

interface SellerDashboardProps {
    currentUser: User;
    dailySales: DailySale[];
    setActiveSection: (section: Section) => void;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ currentUser, dailySales, setActiveSection }) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const { todaySalesTotal, todayInvoicesCount } = useMemo(() => {
        const myTodaySales = dailySales.filter(s => s.date === todayStr && s.sellerId === currentUser.id);
        const total = myTodaySales.reduce((sum, s) => sum + (s.direction === 'بيع' ? s.totalAmount : -s.totalAmount), 0);
        return { todaySalesTotal: total, todayInvoicesCount: myTodaySales.length };
    }, [dailySales, todayStr, currentUser.id]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">أهلاً بك، {currentUser.name}!</h2>
                <p className="text-gray-600 dark:text-gray-400">نتمنى لك يوماً سعيداً ومبيعات وفيرة.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon="fa-user-tag" title="مبيعاتك اليوم" value={todaySalesTotal} isCurrency />
                <StatCard icon="fa-file-invoice" title="عدد فواتيرك اليوم" value={todayInvoicesCount.toString()} />
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4">إجراءات سريعة</h3>
                <button
                    onClick={() => setActiveSection(Section.DailySales)}
                    className="px-6 py-3 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md"
                >
                    <i className="fas fa-plus"></i>
                    تسجيل مبيعة جديدة
                </button>
            </div>
        </div>
    );
};

export default SellerDashboard;
