
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Expense } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface ExpensesChartProps {
    expenses: Expense[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

const ExpensesChart: React.FC<ExpensesChartProps> = ({ expenses }) => {
    const expenseTypes: ('شخصية' | 'عامة' | 'موظفين')[] = ['شخصية', 'عامة', 'موظفين'];

    const data = expenseTypes.map(type => ({
        name: type,
        value: expenses.filter(exp => exp.type === type).reduce((sum, exp) => sum + exp.amount, 0),
    })).filter(d => d.value > 0);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.9)', 
                        borderColor: '#4b5563', 
                        borderRadius: '0.75rem',
                        direction: 'rtl',
                    }}
                    labelStyle={{ color: '#f9fafb' }}
                    formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default ExpensesChart;
