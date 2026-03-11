import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DailyReview } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface MonthlyProfitsChartProps {
    dailyReview: DailyReview[];
}

const MonthlyProfitsChart: React.FC<MonthlyProfitsChartProps> = ({ dailyReview }) => {
    const data = useMemo(() => {
        const monthlyData: Record<string, number> = {};
        
        dailyReview.forEach(review => {
            const month = review.date.substring(0, 7); // YYYY-MM
            const netProfit = review.totalSales - (review.expensesTotal || 0);
            monthlyData[month] = (monthlyData[month] || 0) + netProfit;
        });

        const sortedMonths = Object.keys(monthlyData).sort().slice(-6); // Last 6 months
        
        return sortedMonths.map(month => {
            const date = new Date(`${month}-01`);
            return {
                name: date.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' }),
                profit: monthlyData[month]
            };
        });
    }, [dailyReview]);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                <p>لا توجد بيانات أرباح شهرية كافية.</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} tick={{ fill: 'currentColor', fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: '#4b5563', borderRadius: '0.75rem', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [formatCurrency(value), 'صافي الربح']}
                />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default MonthlyProfitsChart;
