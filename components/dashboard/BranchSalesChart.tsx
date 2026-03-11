import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { DailySale } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface BranchSalesChartProps {
    dailySales: DailySale[];
}

const BranchSalesChart: React.FC<BranchSalesChartProps> = ({ dailySales }) => {
    const data = useMemo(() => {
        const branchSales: Record<string, number> = {
            'main': 0,
            'branch1': 0,
            'branch2': 0,
            'branch3': 0
        };
        
        dailySales.forEach(sale => {
            if (sale.direction === 'بيع') {
                branchSales[sale.branchSoldFrom] += sale.totalAmount;
            } else if (sale.direction === 'مرتجع') {
                branchSales[sale.branchSoldFrom] -= sale.totalAmount;
            }
        });

        return [
            { name: 'الرئيسي', value: Math.max(0, branchSales['main']) },
            { name: 'فرع 1', value: Math.max(0, branchSales['branch1']) },
            { name: 'فرع 2', value: Math.max(0, branchSales['branch2']) },
            { name: 'فرع 3', value: Math.max(0, branchSales['branch3']) }
        ].filter(b => b.value > 0);
    }, [dailySales]);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                <p>لا توجد بيانات مبيعات للفروع.</p>
            </div>
        );
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: '#4b5563', borderRadius: '0.75rem', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [formatCurrency(value), 'المبيعات']}
                />
                <Legend verticalAlign="bottom" height={36} />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default BranchSalesChart;
