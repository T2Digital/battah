import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { DailySale, Product } from '../../types';
import { normalizeSaleItems } from '../../lib/utils';

interface BestSellingChartProps {
    dailySales: DailySale[];
    products: Product[];
}

const BestSellingChart: React.FC<BestSellingChartProps> = ({ dailySales, products }) => {
    const data = useMemo(() => {
        const productSales: Record<number, number> = {};
        
        dailySales.forEach(sale => {
            if (sale.direction === 'بيع') {
                const items = normalizeSaleItems(sale);
                items.forEach(item => {
                    productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
                });
            }
        });

        const sortedProducts = Object.entries(productSales)
            .map(([id, quantity]) => {
                const product = products.find(p => p.id === Number(id));
                return {
                    name: product ? product.name.substring(0, 15) + (product.name.length > 15 ? '...' : '') : `منتج ${id}`,
                    quantity
                };
            })
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5); // Top 5

        return sortedProducts;
    }, [dailySales, products]);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                <p>لا توجد بيانات مبيعات كافية لعرض أكثر المنتجات مبيعاً.</p>
            </div>
        );
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: '#4b5563', borderRadius: '0.75rem', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`${value} قطعة`, 'الكمية المباعة']}
                />
                <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default BestSellingChart;
