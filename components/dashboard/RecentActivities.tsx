

import React from 'react';
// Fix: Corrected import path
import { Employee, Advance, Expense } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';

interface RecentActivitiesProps {
    employees: Employee[];
    advances: Advance[];
    expenses: Expense[];
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({ employees, advances, expenses }) => {
    
    const getEmployeeName = (employeeId: number) => {
        const employee = employees.find(emp => emp.id === employeeId);
        return employee ? employee.name : 'موظف غير محدد';
    };

    const allActivities = [
        ...employees.map(e => ({ type: 'employee', data: e, date: new Date(e.hireDate) })),
        ...advances.map(a => ({ type: 'advance', data: a, date: new Date(a.date) })),
        ...expenses.map(e => ({ type: 'expense', data: e, date: new Date(e.date) })),
    ];

    const sortedActivities = allActivities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

    const renderActivity = (activity: any) => {
        switch (activity.type) {
            case 'employee':
                return {
                    icon: 'fa-user-plus',
                    message: `تم إضافة الموظف: ${activity.data.name}`,
                    date: activity.data.hireDate,
                };
            case 'advance':
                return {
                    icon: 'fa-hand-holding-usd',
                    message: `سلفة جديدة لـ ${getEmployeeName(activity.data.employeeId)} بقيمة ${formatCurrency(activity.data.amount)}`,
                    date: activity.data.date,
                };
            case 'expense':
                return {
                    icon: 'fa-receipt',
                    message: `مصروف جديد: ${activity.data.name} بقيمة ${formatCurrency(activity.data.amount)}`,
                    date: activity.data.date,
                };
            default:
                return null;
        }
    };
    
    return (
        <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                <i className="fas fa-history text-primary"></i>
                الأنشطة الأخيرة
            </h3>
            <div className="space-y-4">
                {sortedActivities.length > 0 ? sortedActivities.map((activity, index) => {
                    const details = renderActivity(activity);
                    if (!details) return null;
                    return (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            <div className="w-10 h-10 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light rounded-full flex justify-center items-center flex-shrink-0">
                                <i className={`fas ${details.icon}`}></i>
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{details.message}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(details.date)}</p>
                            </div>
                        </div>
                    );
                }) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد أنشطة حديثة.</p>
                )}
            </div>
        </div>
    );
};

export default RecentActivities;
