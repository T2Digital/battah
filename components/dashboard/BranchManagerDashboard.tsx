

import React, { useMemo } from 'react';
import { AppData, User, Role } from '../../types';
import StatCard from './StatCard';
import SalesChart from './SalesChart';
import ActionableAlerts from './ActionableAlerts';
import { normalizeSaleItems } from '../../lib/utils';

interface BranchManagerDashboardProps {
    currentUser: User;
    appData: AppData;
}

const BranchManagerDashboard: React.FC<BranchManagerDashboardProps> = ({ currentUser, appData }) => {
    const { 
        dailySales = [], 
        products = [], 
        users = [], 
        employees = [], 
        dailyReview = [] 
    } = appData || {};
    const todayStr = new Date().toISOString().split('T')[0];

    const branchData = useMemo(() => {
        const branchEmployees = users.filter(u => u.branch === currentUser.branch);
        const branchEmployeeIds = branchEmployees.map(u => u.id);
        
        const branchSalesToday = dailySales.filter(s => s.date === todayStr && branchEmployeeIds.includes(s.sellerId));
        
        const branchTotalSales = branchSalesToday.reduce((sum, s) => sum + (s.direction === 'بيع' ? s.totalAmount : -s.totalAmount), 0);

        let branchProfit = 0;
        branchSalesToday.forEach(sale => {
            const saleRevenue = sale.totalAmount;
            const items = normalizeSaleItems(sale);
            const saleCost = items.reduce((sum, item) => {
                const product = products.find(p => p.id === item.productId);
                return sum + (product ? product.purchasePrice * item.quantity : 0);
            }, 0);

            if (sale.direction === 'بيع') {
                branchProfit += (saleRevenue - saleCost);
            } else if (sale.direction === 'مرتجع') {
                branchProfit -= (saleRevenue - saleCost);
            }
        });

        const branchLowStock = products.filter(p => {
            if (!p.reorderPoint) return false;
            const branchStock = p.stock[currentUser.branch];
            return branchStock <= p.reorderPoint;
        });

        const branchDailyReview = dailyReview.filter(r => r.branch === currentUser.branch);

        return {
            branchEmployeeCount: employees.filter(e => branchEmployees.some(u => u.name === e.name)).length, // A bit of a weak link, but based on data structure
            branchTotalSales,
            branchProfit,
            branchLowStock,
            branchDailyReview
        };
    }, [currentUser, dailySales, products, users, employees, todayStr, dailyReview]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">لوحة تحكم فرع: {currentUser.branch}</h2>
                <p className="text-gray-600 dark:text-gray-400">نظرة عامة على أداء فرعك اليوم.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon="fa-chart-pie" title="صافي ربح الفرع اليوم" value={branchData.branchProfit} isCurrency />
                <StatCard icon="fa-dollar-sign" title="مبيعات الفرع اليوم" value={branchData.branchTotalSales} isCurrency />
                <StatCard icon="fa-users" title="موظفو الفرع" value={branchData.branchEmployeeCount.toString()} />
            </div>
            {branchData.branchLowStock.length > 0 && <ActionableAlerts lowStockProducts={branchData.branchLowStock} />}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">مبيعات الفرع - آخر أسبوع</h3>
                <div className="h-80">
                    <SalesChart dailyReview={branchData.branchDailyReview} />
                </div>
            </div>
        </div>
    );
};

export default BranchManagerDashboard;