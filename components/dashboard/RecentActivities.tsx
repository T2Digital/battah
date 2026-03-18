

import React from 'react';
import { AppData } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';

interface RecentActivitiesProps {
    appData: AppData;
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({ appData }) => {
    
    const getEmployeeName = (employeeId: number) => {
        const employee = appData.employees.find(emp => emp.id === employeeId);
        return employee ? employee.name : 'موظف غير محدد';
    };

    const getSupplierName = (supplierId: number) => {
        const supplier = appData.suppliers.find(sup => sup.id === supplierId);
        return supplier ? supplier.name : 'مورد غير محدد';
    };

    const getProductName = (productId: number) => {
        const product = appData.products.find(p => p.id === productId);
        return product ? product.name : 'منتج غير محدد';
    };

    const allActivities = [
        ...appData.employees.map(e => ({ type: 'employee', data: e, date: new Date(e.hireDate) })),
        ...appData.advances.map(a => ({ type: 'advance', data: a, date: new Date(a.date) })),
        ...appData.expenses.map(e => ({ type: 'expense', data: e, date: new Date(e.date) })),
        ...appData.dailySales.map(s => ({ type: 'sale', data: s, date: new Date(s.date) })),
        ...appData.purchaseOrders.map(p => ({ type: 'purchase', data: p, date: new Date(p.orderDate) })),
        ...appData.payments.map(p => ({ type: 'payment', data: p, date: new Date(p.date) })),
        ...appData.payroll.map(p => ({ type: 'payroll', data: p, date: new Date(p.date) })),
        ...appData.stockTransfers.map(t => ({ type: 'transfer', data: t, date: new Date(t.date) })),
        ...appData.attendance.map(a => ({ type: 'attendance', data: a, date: new Date(a.date) }))
    ];

    const sortedActivities = allActivities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

    const renderActivity = (activity: any) => {
        switch (activity.type) {
            case 'employee':
                return {
                    icon: 'fa-user-plus',
                    message: `تم إضافة الموظف: ${activity.data.name}`,
                    date: activity.data.hireDate,
                    color: 'text-blue-500',
                    bg: 'bg-blue-100 dark:bg-blue-900/30'
                };
            case 'advance':
                return {
                    icon: 'fa-hand-holding-usd',
                    message: `سلفة جديدة لـ ${getEmployeeName(activity.data.employeeId)} بقيمة ${formatCurrency(activity.data.amount)}`,
                    date: activity.data.date,
                    color: 'text-orange-500',
                    bg: 'bg-orange-100 dark:bg-orange-900/30'
                };
            case 'expense':
                return {
                    icon: 'fa-receipt',
                    message: `مصروف جديد (${activity.data.type}): ${activity.data.name} بقيمة ${formatCurrency(activity.data.amount)}`,
                    date: activity.data.date,
                    color: 'text-red-500',
                    bg: 'bg-red-100 dark:bg-red-900/30'
                };
            case 'sale':
                return {
                    icon: 'fa-shopping-cart',
                    message: `عملية ${activity.data.direction} بقيمة ${formatCurrency(activity.data.totalAmount)} (${activity.data.source})`,
                    date: activity.data.date,
                    color: 'text-green-500',
                    bg: 'bg-green-100 dark:bg-green-900/30'
                };
            case 'purchase':
                return {
                    icon: 'fa-truck-loading',
                    message: `أمر شراء جديد من ${getSupplierName(activity.data.supplierId)} بقيمة ${formatCurrency(activity.data.totalAmount)}`,
                    date: activity.data.orderDate,
                    color: 'text-purple-500',
                    bg: 'bg-purple-100 dark:bg-purple-900/30'
                };
            case 'payment':
                return {
                    icon: 'fa-money-bill-wave',
                    message: `دفعة للمورد ${getSupplierName(activity.data.supplierId)} بقيمة ${formatCurrency(activity.data.payment)}`,
                    date: activity.data.date,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-100 dark:bg-emerald-900/30'
                };
            case 'payroll':
                return {
                    icon: 'fa-file-invoice-dollar',
                    message: `صرف راتب لـ ${getEmployeeName(activity.data.employeeId)} بقيمة ${formatCurrency(activity.data.disbursed)}`,
                    date: activity.data.date,
                    color: 'text-teal-500',
                    bg: 'bg-teal-100 dark:bg-teal-900/30'
                };
            case 'transfer':
                return {
                    icon: 'fa-exchange-alt',
                    message: `نقل ${activity.data.quantity} من ${getProductName(activity.data.productId)} من ${activity.data.fromBranch} إلى ${activity.data.toBranch}`,
                    date: activity.data.date,
                    color: 'text-indigo-500',
                    bg: 'bg-indigo-100 dark:bg-indigo-900/30'
                };
            case 'attendance':
                return {
                    icon: 'fa-user-clock',
                    message: `تسجيل حضور/انصراف لـ ${getEmployeeName(activity.data.employeeId)}`,
                    date: activity.data.date,
                    color: 'text-cyan-500',
                    bg: 'bg-cyan-100 dark:bg-cyan-900/30'
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
                            <div className={`w-10 h-10 ${details.bg} ${details.color} rounded-full flex justify-center items-center flex-shrink-0`}>
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
