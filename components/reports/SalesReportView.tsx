


import React, { useMemo } from 'react';
import useStore from '../../lib/store';
import { DailySale, Product } from '../../types';
import { normalizeSaleItems, formatCurrency, formatDate } from '../../lib/utils';
import SectionHeader from '../shared/SectionHeader';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { generateSalesReportContent } from '../../lib/reportTemplates';

interface SalesReportViewProps {
    setActiveReport: (report: string | null) => void;
}

const SalesReportView: React.FC<SalesReportViewProps> = ({ setActiveReport }) => {
    const appData = useStore(state => state.appData);
    const { dailySales = [], products = [] } = appData || {};

    const salesByDate = useMemo(() => {
        const data = dailySales.reduce((acc: Record<string, { revenue: number; cost: number }>, sale) => {
            const date = sale.date;
            if (!acc[date]) {
                acc[date] = { revenue: 0, cost: 0 };
            }
            
            const items = normalizeSaleItems(sale);
            const saleCost = items.reduce((sum, item) => {
                 const product = products.find(p => p.id === item.productId);
                 return sum + (product ? product.purchasePrice * item.quantity : 0);
            }, 0);
            
            if (sale.direction === 'بيع') {
                acc[date].revenue += sale.totalAmount;
                acc[date].cost += saleCost;
            } else if (sale.direction === 'مرتجع') {
                acc[date].revenue -= sale.totalAmount;
                acc[date].cost -= saleCost;
            }
            return acc;
        }, {} as Record<string, { revenue: number; cost: number }>);
        
        // FIX: Replaced Object.entries with Object.keys to fix type inference issue.
        return Object.keys(data).map((date) => {
            const values = data[date];
            return {
                date,
                ...values,
                profit: values.revenue - values.cost,
            };
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailySales, products]);
    
    const chartData = useMemo(() => {
        return salesByDate.slice(0, 15).reverse(); // Show last 15 days
    }, [salesByDate]);

    const handlePrint = () => {
        if (!appData) return;
        const content = generateSalesReportContent(appData);
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(content);
            reportWindow.document.close();
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-dollar-sign" title="تقرير المبيعات التفصيلي">
                 <button onClick={handlePrint} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-md">
                    <i className="fas fa-print"></i>
                    طباعة التقرير
                </button>
                <button onClick={() => setActiveReport(null)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                    <i className="fas fa-arrow-right"></i>
                    العودة
                </button>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">أداء المبيعات (آخر 15 يوم)</h3>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="date" tickFormatter={formatDate} angle={-45} textAnchor="end" height={80} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <YAxis tickFormatter={(value) => `${value / 1000}k`} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: '#4b5563', borderRadius: '0.75rem' }}
                                labelStyle={{ color: '#f9fafb' }}
                                formatter={(value: number) => [formatCurrency(value), '']}
                                labelFormatter={formatDate}
                            />
                            <Legend />
                            <Bar dataKey="revenue" fill="#3b82f6" name="المبيعات" />
                            <Bar dataKey="profit" fill="#10b981" name="الربح" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">إجمالي المبيعات</th>
                            <th className="px-6 py-3">تكلفة البضاعة</th>
                            <th className="px-6 py-3">صافي الربح</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salesByDate.map(day => (
                            <tr key={day.date} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{formatDate(day.date)}</td>
                                <td className="px-6 py-4">{formatCurrency(day.revenue)}</td>
                                <td className="px-6 py-4">{formatCurrency(day.cost)}</td>
                                <td className={`px-6 py-4 font-bold ${day.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(day.profit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesReportView;