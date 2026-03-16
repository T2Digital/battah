

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import StatCard from './StatCard';
import SalesChart from './SalesChart';
import ExpensesChart from './ExpensesChart';
import BestSellingChart from './BestSellingChart';
import BranchSalesChart from './BranchSalesChart';
import MonthlyProfitsChart from './MonthlyProfitsChart';
import RecentActivities from './RecentActivities';
import ActionableAlerts from './ActionableAlerts';
import { AppData, User, DailySale, Product, Role, Section } from '../../types';
import useStore from '../../lib/store';
import { normalizeSaleItems } from '../../lib/utils';
import CustomizeDashboardModal from './CustomizeDashboardModal';

interface DashboardProps {
    setActiveSection: (section: Section) => void;
}

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
            const todaySalesCount = (appData.dailySales || []).filter(s => s.date === todayStr).length;
            const todayExpenses = (appData.expenses || [])
                .filter(e => e.date === todayStr)
                .reduce((sum, e) => sum + e.amount, 0);

            const prompt = `
                أنت محلل أعمال خبير في شركة "بطاح الأصلي" لقطع غيار السيارات. بناءً على ملخص البيانات التالي لليوم، قدم 3 رؤى أو توصيات قابلة للتنفيذ باللغة العربية. اجعلها موجزة وفي نقاط.

                - صافي الربح اليومي: ${profit.toFixed(2)} جنيه مصري
                - رصيد الخزينة الحالي: ${balance.toFixed(2)} جنيه مصري
                - عدد فواتير المبيعات اليومية: ${todaySalesCount}
                - إجمالي المصروفات اليومية: ${todayExpenses.toFixed(2)} جنيه مصري
                - عدد الأصناف التي وصلت لحد الطلب: ${(appData.products || []).filter(p => (p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3) <= (p.reorderPoint || 0)).length}
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

const Dashboard: React.FC<DashboardProps> = ({ setActiveSection }) => {
    const { appData, currentUser } = useStore();
    const [isCustomizeModalOpen, setCustomizeModalOpen] = useState(false);
    
    // Default visible cards
    const defaultVisibleCards = {
        treasury: true,
        profit: true,
        todaySalesTotal: true,
        todayBranchSales: true,
        todayOnlineSales: true,
        sellerSales: true,
        todayInvoices: true,
        todayExpenses: true,
        reorderPoint: true,
        pendingOrders: true,
    };

    const [visibleCards, setVisibleCards] = useState(() => {
        try {
            const saved = localStorage.getItem('dashboardVisibleCards');
            const parsed = saved ? JSON.parse(saved) : {};
            return { ...defaultVisibleCards, ...parsed }; // Merge to ensure new cards are visible by default
        } catch (error) {
            return defaultVisibleCards;
        }
    });

    useEffect(() => {
        localStorage.setItem('dashboardVisibleCards', JSON.stringify(visibleCards));
    }, [visibleCards]);
    
    const { 
        employees = [], 
        advances = [],
        expenses = [], 
        dailyReview = [], 
        treasury = [], 
        dailySales = [], 
        products = [], 
        users = [],
        orders = []
    } = appData || {};

    const todayStr = new Date().toISOString().split('T')[0];

    const { 
        currentTreasuryBalance, dailyNetProfit, sellerTodaySales,
        todayInvoicesCount, todayExpensesTotal, reorderPointProductsCount, pendingOrdersCount, dailySalesTotal,
        todayBranchSales, todayOnlineSales
    } = useMemo(() => {
        let balance = (treasury || []).reduce((sum, t) => sum + (t.amountIn || 0) - (t.amountOut || 0), 0);

        const salesToConsider = currentUser?.role === Role.BranchManager
            ? (dailySales || []).filter(s => (users || []).find(u => u.id === s.sellerId)?.branch === currentUser.branch)
            : (dailySales || []);
            
        const todaySales = salesToConsider.filter(s => s.date === todayStr);
        
        let profit = 0;
        let totalSalesAmount = 0;
        let branchSales = 0;
        let onlineSales = 0;

        todaySales.forEach(sale => {
            const saleRevenue = sale.totalAmount;
            const items = normalizeSaleItems(sale);
            const saleCost = items.reduce((sum, item) => {
                const product = (products || []).find(p => p.id === item.productId);
                return sum + (product ? product.purchasePrice * item.quantity : 0);
            }, 0);

            if (sale.direction === 'بيع') {
                profit += (saleRevenue - saleCost);
                totalSalesAmount += saleRevenue;
                if (sale.source === 'أونلاين') {
                    onlineSales += saleRevenue;
                } else {
                    branchSales += saleRevenue;
                }
            } else if (sale.direction === 'مرتجع') {
                profit -= (saleRevenue - saleCost);
                totalSalesAmount -= saleRevenue;
                if (sale.source === 'أونلاين') {
                    onlineSales -= saleRevenue;
                } else {
                    branchSales -= saleRevenue;
                }
            }
        });
        
        let sellerSales = null;
        if(currentUser?.role === 'seller') {
            sellerSales = todaySales
                .filter(s => s.sellerId === currentUser.id)
                .reduce((sum, s) => sum + (s.direction === 'بيع' ? s.totalAmount : -s.totalAmount), 0);
        }

        const invoicesCount = todaySales.length;
        const expensesTotal = (expenses || []).filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0);
        const lowStockCount = (products || []).filter(p => {
            const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
            return totalStock <= (p.reorderPoint || 0);
        }).length;
        const pendingCount = (orders || []).filter(o => o.status === 'pending').length;


        return { 
            currentTreasuryBalance: balance, 
            dailyNetProfit: profit, 
            sellerTodaySales: sellerSales,
            todayInvoicesCount: invoicesCount,
            todayExpensesTotal: expensesTotal,
            reorderPointProductsCount: lowStockCount,
            pendingOrdersCount: pendingCount,
            dailySalesTotal: totalSalesAmount,
            todayBranchSales: branchSales,
            todayOnlineSales: onlineSales
        };
    }, [treasury, dailySales, products, expenses, orders, todayStr, currentUser, users]);

    const lowStockProducts = useMemo(() => {
        return (products || []).filter(p => {
            const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
            return totalStock <= (p.reorderPoint || 0);
        });
    }, [products]);


    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-bold text-gray-800 dark:text-white">لوحة التحكم الرئيسية</h1>
                <button onClick={() => setCustomizeModalOpen(true)} className="px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition shadow">
                    <i className="fas fa-cog"></i>
                    تخصيص
                </button>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleCards.treasury && (
                    <div onClick={() => setActiveSection(Section.Treasury)} className="cursor-pointer">
                        <StatCard icon="fa-wallet" title="رصيد الخزينة الحالي" value={currentTreasuryBalance} isCurrency />
                    </div>
                )}
                {visibleCards.profit && (
                    <div onClick={() => setActiveSection(Section.DailySales)} className="cursor-pointer">
                        <StatCard icon="fa-chart-pie" title={currentUser?.role === Role.BranchManager ? `صافي ربح فرعك اليوم` : `صافي الربح اليومي`} value={dailyNetProfit} isCurrency />
                    </div>
                )}
                {visibleCards.todaySalesTotal && (
                     <div onClick={() => setActiveSection(Section.DailySales)} className="cursor-pointer">
                        <StatCard icon="fa-shopping-cart" title="إجمالي مبيعات اليوم" value={dailySalesTotal} isCurrency />
                    </div>
                )}
                {visibleCards.todayBranchSales && (
                     <div onClick={() => setActiveSection(Section.DailySales)} className="cursor-pointer">
                        <StatCard icon="fa-store" title="مبيعات الفروع اليوم" value={todayBranchSales} isCurrency />
                    </div>
                )}
                {visibleCards.todayOnlineSales && (
                     <div onClick={() => setActiveSection(Section.DailySales)} className="cursor-pointer">
                        <StatCard icon="fa-globe" title="مبيعات الأونلاين اليوم" value={todayOnlineSales} isCurrency />
                    </div>
                )}
                {visibleCards.sellerSales && sellerTodaySales !== null && (
                     <StatCard icon="fa-user-tag" title="مبيعاتك اليوم" value={sellerTodaySales} isCurrency />
                )}
                {visibleCards.todayInvoices && (
                     <StatCard icon="fa-file-invoice" title="عدد فواتير اليوم" value={todayInvoicesCount.toString()} />
                )}
                {visibleCards.todayExpenses && (
                    <div onClick={() => setActiveSection(Section.Expenses)} className="cursor-pointer">
                        <StatCard icon="fa-receipt" title="مصروفات اليوم" value={todayExpensesTotal} isCurrency />
                    </div>
                )}
                {visibleCards.reorderPoint && (
                    <div onClick={() => setActiveSection(Section.StoreManagement)} className="cursor-pointer">
                        <StatCard icon="fa-exclamation-triangle" title="منتجات وصلت لحد الطلب" value={reorderPointProductsCount.toString()} />
                    </div>
                )}
                {visibleCards.pendingOrders && (
                    <div onClick={() => setActiveSection(Section.Orders)} className="cursor-pointer">
                        <StatCard icon="fa-box" title="طلبات أونلاين معلقة" value={pendingOrdersCount.toString()} />
                    </div>
                )}
            </div>

            <AIInsights profit={dailyNetProfit} balance={currentTreasuryBalance} />
            
            {lowStockProducts.length > 0 && <ActionableAlerts lowStockProducts={lowStockProducts} />}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">المبيعات اليومية - آخر أسبوع</h3>
                    <div className="h-80">
                        <SalesChart dailyReview={dailyReview || []} />
                    </div>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                     <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">توزيع المصاريف حسب النوع</h3>
                    <div className="h-80">
                       <ExpensesChart expenses={expenses || []} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">أكثر المنتجات مبيعاً</h3>
                    <div className="h-80">
                        <BestSellingChart dailySales={dailySales || []} products={products || []} />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">مقارنة مبيعات الفروع</h3>
                    <div className="h-80">
                        <BranchSalesChart dailySales={dailySales || []} />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">أرباح الأشهر الماضية</h3>
                    <div className="h-80">
                        <MonthlyProfitsChart dailyReview={dailyReview || []} />
                    </div>
                </div>
            </div>

             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <RecentActivities employees={employees || []} advances={advances || []} expenses={expenses || []} />
            </div>

            <CustomizeDashboardModal
                isOpen={isCustomizeModalOpen}
                onClose={() => setCustomizeModalOpen(false)}
                visibleCards={visibleCards}
                setVisibleCards={setVisibleCards}
            />
        </div>
    );
};

export default Dashboard;
