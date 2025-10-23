import React, { useMemo } from 'react';
import { AppData } from '../../types';
import StatCard from './StatCard';
import ExpensesChart from './ExpensesChart';
import { formatCurrency, formatDate } from '../../lib/utils';

interface AccountantDashboardProps {
    appData: AppData;
}

const AccountantDashboard: React.FC<AccountantDashboardProps> = ({ appData }) => {
    const { 
        treasury = [], 
        expenses = [], 
        payments = [], 
        suppliers = [], 
        purchaseOrders = [] 
    } = appData || {};
    const todayStr = new Date().toISOString().split('T')[0];

    const { currentTreasuryBalance, todayExpensesTotal, pendingPOsValue } = useMemo(() => {
        let balance = treasury.reduce((sum, t) => sum + t.amountIn - t.amountOut, 0);
        const expensesToday = expenses
            .filter(e => e.date === todayStr)
            .reduce((sum, e) => sum + e.amount, 0);
            
        const pendingValue = purchaseOrders
            .filter(po => po.status === 'معلق')
            .reduce((sum, po) => sum + po.totalAmount, 0);

        return { currentTreasuryBalance: balance, todayExpensesTotal: expensesToday, pendingPOsValue: pendingValue };
    }, [treasury, expenses, purchaseOrders, todayStr]);

    const recentTreasury = useMemo(() => {
        return [...treasury].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [treasury]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">لوحة التحكم المالية</h2>
                <p className="text-gray-600 dark:text-gray-400">ملخص للحسابات والعمليات المالية.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon="fa-wallet" title="رصيد الخزينة الحالي" value={currentTreasuryBalance} isCurrency />
                <StatCard icon="fa-receipt" title="مصروفات اليوم" value={todayExpensesTotal} isCurrency />
                <StatCard icon="fa-file-invoice-dollar" title="قيمة أوامر الشراء المعلقة" value={pendingPOsValue} isCurrency />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                        <i className="fas fa-history text-primary"></i>
                        آخر حركات الخزينة
                    </h3>
                    <div className="space-y-3">
                        {recentTreasury.map(t => (
                            <div key={t.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                                <div>
                                    <p className="font-semibold">{t.description}</p>
                                    <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                                </div>
                                <p className={`font-bold ${t.amountIn > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {formatCurrency(t.amountIn > 0 ? t.amountIn : -t.amountOut)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                     <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">توزيع المصاريف</h3>
                    <div className="h-80">
                       <ExpensesChart expenses={expenses} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountantDashboard;