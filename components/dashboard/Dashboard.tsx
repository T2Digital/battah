
import React from 'react';
import StatCard from './StatCard';
import SalesChart from './SalesChart';
import ExpensesChart from './ExpensesChart';
import RecentActivities from './RecentActivities';
import { Employee, Advance, Expense, DailyReview } from '../../types';

interface DashboardProps {
    employees: Employee[];
    advances: Advance[];
    expenses: Expense[];
    dailyReview: DailyReview[];
}

const Dashboard: React.FC<DashboardProps> = ({ employees, advances, expenses, dailyReview }) => {
    const totalEmployees = employees.length;
    const totalSalaries = employees.reduce((sum, emp) => sum + emp.basicSalary, 0);
    const totalAdvances = advances.reduce((sum, adv) => sum + (adv.amount - adv.payment), 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyExpenses = expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon="fa-users" title="إجمالي الموظفين" value={totalEmployees.toString()} />
                <StatCard icon="fa-money-bill-wave" title="إجمالي الرواتب الشهرية" value={totalSalaries} isCurrency />
                <StatCard icon="fa-hand-holding-usd" title="إجمالي السلف المتبقية" value={totalAdvances} isCurrency />
                <StatCard icon="fa-receipt" title="مصاريف الشهر الحالي" value={monthlyExpenses} isCurrency />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">المبيعات اليومية - آخر أسبوع</h3>
                    <div className="h-80">
                        <SalesChart dailyReview={dailyReview} />
                    </div>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                     <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">توزيع المصاريف حسب النوع</h3>
                    <div className="h-80">
                       <ExpensesChart expenses={expenses} />
                    </div>
                </div>
            </div>

             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <RecentActivities employees={employees} advances={advances} expenses={expenses} />
            </div>
        </div>
    );
};

export default Dashboard;
