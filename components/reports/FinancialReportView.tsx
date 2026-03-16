
import React, { useState, useMemo } from 'react';
import useStore from '../../lib/store';
import { Advance, Employee, Expense, Payroll } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import SectionHeader from '../shared/SectionHeader';

interface FinancialReportViewProps {
    setActiveReport: (report: string | null) => void;
}

type ActiveTab = 'expenses' | 'advances' | 'payroll' | 'debts';

const FinancialReportView: React.FC<FinancialReportViewProps> = ({ setActiveReport }) => {
    const appData = useStore(state => state.appData);
    const expenses = appData?.expenses || [];
    const advances = appData?.advances || [];
    const payroll = appData?.payroll || [];
    const employees = appData?.employees || [];
    const dailySales = appData?.dailySales || [];
    const [activeTab, setActiveTab] = useState<ActiveTab>('expenses');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    
    const filterByDate = <T extends { date: string }>(data: T[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
            return data.filter(item => {
                const d = new Date(item.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            });
        } else if (dateFilter === 'week') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            return data.filter(item => {
                const d = new Date(item.date);
                d.setHours(0, 0, 0, 0);
                return d >= lastWeek;
            });
        } else if (dateFilter === 'month') {
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            return data.filter(item => {
                const d = new Date(item.date);
                d.setHours(0, 0, 0, 0);
                return d >= lastMonth;
            });
        }
        return data;
    };

    const filteredExpenses = useMemo(() => filterByDate(expenses), [expenses, dateFilter]);
    const filteredAdvances = useMemo(() => filterByDate(advances), [advances, dateFilter]);
    const filteredPayroll = useMemo(() => filterByDate(payroll), [payroll, dateFilter]);
    const filteredSales = useMemo(() => filterByDate(dailySales), [dailySales, dateFilter]);

    const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);
    const totalAdvances = useMemo(() => filteredAdvances.reduce((sum, a) => sum + a.amount, 0), [filteredAdvances]);
    const totalPayroll = useMemo(() => filteredPayroll.reduce((sum, p) => sum + p.disbursed, 0), [filteredPayroll]);
    
    const customerDebts = useMemo(() => {
        const debts = new Map<string, { name: string, phone: string, totalDebt: number, invoices: string[] }>();
        filteredSales.forEach(sale => {
            if (sale.remainingDebt && sale.remainingDebt > 0 && sale.customerName) {
                const key = sale.customerPhone || sale.customerName;
                if (!debts.has(key)) {
                    debts.set(key, { name: sale.customerName, phone: sale.customerPhone || '', totalDebt: 0, invoices: [] });
                }
                const debt = debts.get(key)!;
                debt.totalDebt += sale.remainingDebt;
                debt.invoices.push(sale.invoiceNumber);
            }
        });
        return Array.from(debts.values());
    }, [filteredSales]);
    
    const totalDebts = useMemo(() => customerDebts.reduce((sum, d) => sum + d.totalDebt, 0), [customerDebts]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-hand-holding-usd" title="التقارير المالية">
                <div className="flex items-center gap-4">
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">كل الأوقات</option>
                        <option value="today">اليوم</option>
                        <option value="week">هذا الأسبوع</option>
                        <option value="month">هذا الشهر</option>
                    </select>
                    <button onClick={() => setActiveReport(null)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                        <i className="fas fa-arrow-right"></i>
                        العودة
                    </button>
                </div>
            </SectionHeader>

            <div className="flex border-b dark:border-gray-700">
                <button onClick={() => setActiveTab('expenses')} className={`px-6 py-3 font-semibold ${activeTab === 'expenses' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>المصاريف</button>
                <button onClick={() => setActiveTab('advances')} className={`px-6 py-3 font-semibold ${activeTab === 'advances' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>السلف</button>
                <button onClick={() => setActiveTab('payroll')} className={`px-6 py-3 font-semibold ${activeTab === 'payroll' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>المرتبات</button>
                <button onClick={() => setActiveTab('debts')} className={`px-6 py-3 font-semibold ${activeTab === 'debts' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>مديونيات العملاء</button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                {activeTab === 'expenses' && (
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">التاريخ والوقت</th><th className="px-6 py-3">النوع</th><th className="px-6 py-3">الاسم</th><th className="px-6 py-3">المبلغ</th></tr>
                        </thead>
                        <tbody>{filteredExpenses.map(e => <tr key={e.id} className="border-b dark:border-gray-700"><td className="whitespace-nowrap" dir="ltr">{formatDateTime(e.date, e.timestamp)}</td><td>{e.type}</td><td>{e.name}</td><td>{formatCurrency(e.amount)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={3} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3">{formatCurrency(totalExpenses)}</td></tr></tfoot>
                    </table>
                )}
                 {activeTab === 'advances' && (
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">التاريخ والوقت</th><th className="px-6 py-3">الموظف</th><th className="px-6 py-3">المبلغ</th><th className="px-6 py-3">المتبقي</th></tr>
                        </thead>
                        <tbody>{filteredAdvances.map(a => <tr key={a.id} className="border-b dark:border-gray-700"><td className="whitespace-nowrap" dir="ltr">{formatDateTime(a.date, a.timestamp)}</td><td>{getEmployeeName(a.employeeId)}</td><td>{formatCurrency(a.amount)}</td><td>{formatCurrency(a.amount - a.payment)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={2} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3">{formatCurrency(totalAdvances)}</td><td></td></tr></tfoot>
                    </table>
                )}
                {activeTab === 'payroll' && (
                     <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">التاريخ والوقت</th><th className="px-6 py-3">الموظف</th><th className="px-6 py-3">الراتب الأساسي</th><th className="px-6 py-3">المصروف</th></tr>
                        </thead>
                        <tbody>{filteredPayroll.map(p => <tr key={p.id} className="border-b dark:border-gray-700"><td className="whitespace-nowrap" dir="ltr">{formatDateTime(p.date, p.timestamp)}</td><td>{getEmployeeName(p.employeeId)}</td><td>{formatCurrency(p.basicSalary)}</td><td>{formatCurrency(p.disbursed)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={3} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3">{formatCurrency(totalPayroll)}</td></tr></tfoot>
                    </table>
                )}
                {activeTab === 'debts' && (
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">اسم العميل</th><th className="px-6 py-3">رقم الهاتف</th><th className="px-6 py-3">الفواتير</th><th className="px-6 py-3">إجمالي المديونية</th></tr>
                        </thead>
                        <tbody>{customerDebts.map((d, i) => <tr key={i} className="border-b dark:border-gray-700"><td>{d.name}</td><td>{d.phone}</td><td>{d.invoices.join(', ')}</td><td className="font-bold text-red-600">{formatCurrency(d.totalDebt)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={3} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3 text-red-600">{formatCurrency(totalDebts)}</td></tr></tfoot>
                    </table>
                )}
            </div>
        </div>
    );
};

export default FinancialReportView;
