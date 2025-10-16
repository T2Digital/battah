
import React, { useMemo, useState } from 'react';
// Fix: Corrected import path
import { TreasuryTransaction } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import { formatDate, formatCurrency } from '../../lib/utils';

interface TreasuryProps {
    treasury: TreasuryTransaction[];
}

const Treasury: React.FC<TreasuryProps> = ({ treasury }) => {
    const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', type: '' });

    const processedTransactions = useMemo(() => {
        let balance = 0;
        return treasury
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(t => {
                balance += t.amountIn - t.amountOut;
                return { ...t, balance };
            });
    }, [treasury]);

    const filteredTransactions = useMemo(() => {
        return processedTransactions.filter(t => {
            const date = new Date(t.date);
            const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
            const to = filters.dateTo ? new Date(filters.dateTo) : null;

            if (from && date < from) return false;
            if (to && date > to) return false;
            if (filters.type && t.type !== filters.type) return false;

            return true;
        }).reverse();
    }, [processedTransactions, filters]);
    
    const finalBalance = processedTransactions[processedTransactions.length - 1]?.balance || 0;


    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-cash-register" title="الخزينة" />
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">الرصيد الحالي للخزينة</h3>
                <p className={`text-4xl font-bold mt-2 ${finalBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(finalBalance)}
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4">
                <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="">كل الأنواع</option>
                    <option value="إيراد مبيعات">إيراد مبيعات</option>
                    <option value="مرتجع مبيعات">مرتجع مبيعات</option>
                    <option value="مصروف">مصروف</option>
                    <option value="راتب">راتب</option>
                    <option value="دفعة لمورد">دفعة لمورد</option>
                    <option value="سلفة">سلفة</option>
                </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">النوع</th>
                            <th className="px-6 py-3">الوصف</th>
                            <th className="px-6 py-3">الوارد</th>
                            <th className="px-6 py-3">المنصرف</th>
                            <th className="px-6 py-3">الرصيد</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{formatDate(t.date)}</td>
                                <td className="px-6 py-4">{t.type}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                <td className="px-6 py-4 text-green-500 font-semibold">{t.amountIn > 0 ? formatCurrency(t.amountIn) : '-'}</td>
                                <td className="px-6 py-4 text-red-500 font-semibold">{t.amountOut > 0 ? formatCurrency(t.amountOut) : '-'}</td>
                                <td className="px-6 py-4 font-bold">{formatCurrency(t.balance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Treasury;
