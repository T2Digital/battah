import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { DailySale } from '../../types';
import { formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';
import { getActiveBranches, getBranchLabel } from '../../lib/appConfig';

interface BranchSalesChartProps {
    dailySales: DailySale[];
}

const BranchSalesChart: React.FC<BranchSalesChartProps> = ({ dailySales }) => {
    const appCustomization = useStore(state => state.appData?.appCustomization);
    const activeBranches = useMemo(() => getActiveBranches(appCustomization), [appCustomization]);

    const data = useMemo(() => {
        const branchSales: Record<string, number> = {};
        for (const b of activeBranches) {
            branchSales[b.key] = 0;
        }
        
        dailySales.forEach(sale => {
            const key = sale.branchSoldFrom || activeBranches[0]?.key || 'main';
            if (!(key in branchSales)) branchSales[key] = 0;
            if (sale.direction === 'بيع') {
                branchSales[key] += sale.totalAmount;
            } else if (sale.direction === 'مرتجع') {
                branchSales[key] -= sale.totalAmount;
            }
        });

        return Object.entries(branchSales)
            .map(([key, val]) => ({
                name: getBranchLabel(key, activeBranches),
                value: Math.max(0, val),
            }))
            .filter(b => b.value > 0);
    }, [dailySales, activeBranches]);

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
