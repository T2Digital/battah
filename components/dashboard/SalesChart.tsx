

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
// Fix: Corrected import path
import { DailyReview } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface SalesChartProps {
    dailyReview: DailyReview[];
}

const SalesChart: React.FC<SalesChartProps> = ({ dailyReview }) => {
    const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const daySales = dailyReview
            .filter(review => review.date === dateStr)
            .reduce((sum, review) => sum + (review.salesCash || 0) + (review.salesElectronic || 0), 0);

        return {
            name: date.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }),
            sales: daySales,
        };
    }).reverse();

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last7DaysData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.9)', 
                        borderColor: '#4b5563', 
                        borderRadius: '0.75rem',
                        direction: 'rtl',
                    }}
                    labelStyle={{ color: '#f9fafb' }}
                    formatter={(value: number) => [formatCurrency(value), 'المبيعات']}
                />
                <Legend formatter={() => 'المبيعات اليومية'} />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default SalesChart;
