
import React, { useMemo, useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import StatCard from './StatCard';
import SalesChart from './SalesChart';
import ExpensesChart from './ExpensesChart';
import RecentActivities from './RecentActivities';
import ActionableAlerts from './ActionableAlerts';
// Fix: Corrected import paths
import { AppData, User, DailySale, Product, Role } from '../../types';
import useStore from '../../lib/store';

const AIInsights: React.FC<{ profit: number; balance: number }> = ({ profit, balance }) => {
    const [insight, setInsight] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const appData = useStore(state => state.appData);

    const getInsights = useCallback(async () => {
        if (!appData) return;
        setIsLoading(true);
        setError('');
        setInsight('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const todayStr = new Date().toISOString().split('T')[0];
            const todaySalesCount = appData.dailySales.filter(s => s.date === todayStr).length;
            const todayExpenses = appData.expenses
                .filter(e => e.date === todayStr)
                .reduce((sum, e) => sum + e.amount, 0);

            const prompt = `
                أنت محلل أعمال خبير في شركة "بطاح" لقطع غيار السيارات. بناءً على ملخص البيانات التالي لليوم، قدم 3 رؤى أو توصيات قابلة للتنفيذ باللغة العربية. اجعلها موجزة وفي نقاط.

                - صافي الربح اليومي: ${profit.toFixed(2)} جنيه مصري
                - رصيد الخزينة الحالي: ${balance.toFixed(2)} جنيه مصري
                - عدد المبيعات اليومية: ${todaySalesCount}
                - إجمالي المصروفات اليومية: ${todayExpenses.toFixed(2)} جنيه مصري
                - عدد الأصناف التي وصلت لحد الطلب: ${appData.products.filter(p => (p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3) <= (p.reorderPoint || 0)).length}
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setInsight(response.text);

        } catch (err) {
            console.error("Gemini API error:", err);
            setError('حدث خطأ أثناء توليد التحليل. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsLoading(false);
        }
    }, [appData, profit, balance]);

    if (!appData) return null;

    return (
        <div className="bg-blue-50 dark:bg-gray-800/50 p-6 rounded-2xl shadow-lg border-r-4 border-blue-500">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                <i className="fas fa-brain text-blue-500"></i>
                تحليلات ذكية من Gemini
            </h3>
            {insight && !isLoading && (
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: insight.replace(/\*/g, '•') }}></div>
            )}
            {isLoading && <p>جاري تحليل البيانات...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!insight && !isLoading && (
                 <button onClick={getInsights} className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2 hover:bg-blue-600 transition shadow-md">
                    <i className="fas fa-magic"></i>
                    احصل على تحليل لليوم
                </button>
            )}
        </div>
    );
};


const Dashboard: React.FC = () => {
    const { appData, currentUser } = useStore();
    
    const { employees, advances, expenses, dailyReview, treasury, dailySales, products, users } = appData!;

    const todayStr = new Date().toISOString().split('T')[0];

    const { currentTreasuryBalance, dailyNetProfit, sellerTodaySales } = useMemo(() => {
        let balance = 0;
        treasury.forEach(t => {
            balance = balance + t.amountIn - t.amountOut;
        });

        const salesToConsider = currentUser?.role === Role.BranchManager
            ? dailySales.filter(s => users.find(u => u.id === s.sellerId)?.branch === currentUser.branch)
            : dailySales;
            
        const todaySales = salesToConsider.filter(s => s.date === todayStr);
        let profit = 0;
        todaySales.forEach(sale => {
            const product = products.find(p => p.id === sale.productId);
            if (product) {
                const cost = product.purchasePrice * sale.quantity;
                const revenue = sale.totalAmount;
                if (sale.direction === 'بيع') {
                    profit += (revenue - cost);
                } else if (sale.direction === 'مرتجع') {
                    profit -= (revenue - cost);
                }
            }
        });
        
        let sellerSales = null;
        if(currentUser?.role === 'seller') {
            sellerSales = todaySales
                .filter(s => s.sellerId === currentUser.id)
                .reduce((sum, s) => sum + (s.direction === 'بيع' ? s.totalAmount : -s.totalAmount), 0);
        }

        return { currentTreasuryBalance: balance, dailyNetProfit: profit, sellerTodaySales: sellerSales };
    }, [treasury, dailySales, products, todayStr, currentUser, users]);

    const lowStockProducts = useMemo(() => {
        return products.filter(p => {
            const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
            return totalStock <= (p.reorderPoint || 0);
        });
    }, [products]);


    return (
        <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon="fa-wallet" title="رصيد الخزينة الحالي" value={currentTreasuryBalance} isCurrency />
                <StatCard icon="fa-chart-pie" title={currentUser?.role === Role.BranchManager ? `صافي ربح فرعك اليوم` : `صافي الربح اليومي`} value={dailyNetProfit} isCurrency />
                <StatCard icon="fa-users" title="إجمالي الموظفين" value={employees.length.toString()} />
                {sellerTodaySales !== null && (
                     <StatCard icon="fa-user-tag" title="مبيعاتك اليوم" value={sellerTodaySales} isCurrency />
                )}
            </div>

            <AIInsights profit={dailyNetProfit} balance={currentTreasuryBalance} />
            
            {lowStockProducts.length > 0 && <ActionableAlerts lowStockProducts={lowStockProducts} />}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">المبيعات اليومية - آخر أسبوع</h3>
                    <div className="h-80">
                        <SalesChart dailyReview={dailyReview} />
                    </div>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                     <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">توزيع المصاريف حسب النوع</h3>
                    <div className="h-80">
                       <ExpensesChart expenses={expenses} />
                    </div>
                </div>
            </div>

             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <RecentActivities employees={employees} advances={advances} expenses={expenses} />
            </div>
        </div>
    );
};

export default Dashboard;
