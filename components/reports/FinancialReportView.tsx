
import React, { useState, useMemo } from 'react';
import useStore from '../../lib/store';
import { Advance, Employee, Expense, Payroll } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import SectionHeader from '../shared/SectionHeader';

interface FinancialReportViewProps {
    setActiveReport: (report: string | null) => void;
}

type ActiveTab = 'expenses' | 'advances' | 'payroll';

const FinancialReportView: React.FC<FinancialReportViewProps> = ({ setActiveReport }) => {
    const appData = useStore(state => state.appData);
    const expenses = appData?.expenses || [];
    const advances = appData?.advances || [];
    const payroll = appData?.payroll || [];
    const employees = appData?.employees || [];
    const [activeTab, setActiveTab] = useState<ActiveTab>('expenses');

    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    
    const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
    const totalAdvances = useMemo(() => advances.reduce((sum, a) => sum + a.amount, 0), [advances]);
    const totalPayroll = useMemo(() => payroll.reduce((sum, p) => sum + p.disbursed, 0), [payroll]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-hand-holding-usd" title="التقارير المالية">
                <button onClick={() => setActiveReport(null)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                    <i className="fas fa-arrow-right"></i>
                    العودة
                </button>
            </SectionHeader>

            <div className="flex border-b dark:border-gray-700">
                <button onClick={() => setActiveTab('expenses')} className={`px-6 py-3 font-semibold ${activeTab === 'expenses' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>المصاريف</button>
                <button onClick={() => setActiveTab('advances')} className={`px-6 py-3 font-semibold ${activeTab === 'advances' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>السلف</button>
                <button onClick={() => setActiveTab('payroll')} className={`px-6 py-3 font-semibold ${activeTab === 'payroll' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>المرتبات</button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                {activeTab === 'expenses' && (
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">التاريخ</th><th className="px-6 py-3">النوع</th><th className="px-6 py-3">الاسم</th><th className="px-6 py-3">المبلغ</th></tr>
                        </thead>
                        <tbody>{expenses.map(e => <tr key={e.id} className="border-b dark:border-gray-700"><td>{formatDate(e.date)}</td><td>{e.type}</td><td>{e.name}</td><td>{formatCurrency(e.amount)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={3} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3">{formatCurrency(totalExpenses)}</td></tr></tfoot>
                    </table>
                )}
                 {activeTab === 'advances' && (
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">التاريخ</th><th className="px-6 py-3">الموظف</th><th className="px-6 py-3">المبلغ</th><th className="px-6 py-3">المتبقي</th></tr>
                        </thead>
                        <tbody>{advances.map(a => <tr key={a.id} className="border-b dark:border-gray-700"><td>{formatDate(a.date)}</td><td>{getEmployeeName(a.employeeId)}</td><td>{formatCurrency(a.amount)}</td><td>{formatCurrency(a.amount - a.payment)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={2} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3">{formatCurrency(totalAdvances)}</td><td></td></tr></tfoot>
                    </table>
                )}
                {activeTab === 'payroll' && (
                     <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">التاريخ</th><th className="px-6 py-3">الموظف</th><th className="px-6 py-3">الراتب الأساسي</th><th className="px-6 py-3">المصروف</th></tr>
                        </thead>
                        <tbody>{payroll.map(p => <tr key={p.id} className="border-b dark:border-gray-700"><td>{formatDate(p.date)}</td><td>{getEmployeeName(p.employeeId)}</td><td>{formatCurrency(p.basicSalary)}</td><td>{formatCurrency(p.disbursed)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={3} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3">{formatCurrency(totalPayroll)}</td></tr></tfoot>
                    </table>
                )}
            </div>
        </div>
    );
};

export default FinancialReportView;
