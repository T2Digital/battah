
import React, { useState, useMemo } from 'react';
import useStore from '../../lib/store';
import { Advance, Employee, Expense, Payroll } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import SectionHeader from '../shared/SectionHeader';
import { generateFinancialClosingReportContent } from '../../lib/reportTemplates';

interface FinancialReportViewProps {
    setActiveReport: (report: string | null) => void;
}

type ActiveTab = 'expenses' | 'advances' | 'payroll' | 'debts' | 'closing';

const FinancialReportView: React.FC<FinancialReportViewProps> = ({ setActiveReport }) => {
    const { appData, fetchDataByDateRange } = useStore(state => ({
        appData: state.appData,
        fetchDataByDateRange: state.fetchDataByDateRange
    }));
    const expenses = appData?.expenses || [];
    const advances = appData?.advances || [];
    const payroll = appData?.payroll || [];
    const employees = appData?.employees || [];
    const dailySales = appData?.dailySales || [];
    const [activeTab, setActiveTab] = useState<ActiveTab>('expenses');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [isLoadingData, setIsLoadingData] = useState(false);

    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    
    const handleFetchCustomData = async () => {
        if (!customStartDate || !customEndDate) return;
        setIsLoadingData(true);
        await Promise.all([
            fetchDataByDateRange('expenses', customStartDate, customEndDate),
            fetchDataByDateRange('advances', customStartDate, customEndDate),
            fetchDataByDateRange('payroll', customStartDate, customEndDate),
            fetchDataByDateRange('dailySales', customStartDate, customEndDate)
        ]);
        setIsLoadingData(false);
    };

    const filterByDate = <T extends { date: string }>(data: T[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
            return data.filter(item => {
                const d = new Date(item.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            });
        } else if (dateFilter === 'week') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            return data.filter(item => {
                const d = new Date(item.date);
                d.setHours(0, 0, 0, 0);
                return d >= lastWeek;
            });
        } else if (dateFilter === 'month') {
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            return data.filter(item => {
                const d = new Date(item.date);
                d.setHours(0, 0, 0, 0);
                return d >= lastMonth;
            });
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
            return data.filter(item => {
                return item.date >= customStartDate && item.date <= customEndDate;
            });
        }
        return data;
    };

    const filteredExpenses = useMemo(() => filterByDate(expenses), [expenses, dateFilter]);
    const filteredAdvances = useMemo(() => filterByDate(advances), [advances, dateFilter]);
    const filteredPayroll = useMemo(() => filterByDate(payroll), [payroll, dateFilter]);
    const filteredSales = useMemo(() => filterByDate(dailySales), [dailySales, dateFilter]);

    const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);
    const totalAdvances = useMemo(() => filteredAdvances.reduce((sum, a) => sum + a.amount, 0), [filteredAdvances]);
    const totalPayroll = useMemo(() => filteredPayroll.reduce((sum, p) => sum + p.disbursed, 0), [filteredPayroll]);
    
    const customerDebts = useMemo(() => {
        const debts = new Map<string, { name: string, phone: string, totalDebt: number, invoices: string[] }>();
        filteredSales.forEach(sale => {
            if (sale.remainingDebt && sale.remainingDebt > 0 && sale.customerName) {
                const key = sale.customerPhone || sale.customerName;
                if (!debts.has(key)) {
                    debts.set(key, { name: sale.customerName, phone: sale.customerPhone || '', totalDebt: 0, invoices: [] });
                }
                const debt = debts.get(key)!;
                debt.totalDebt += sale.remainingDebt;
                debt.invoices.push(sale.invoiceNumber);
            }
        });
        return Array.from(debts.values());
    }, [filteredSales]);
    
    const totalDebts = useMemo(() => customerDebts.reduce((sum, d) => sum + d.totalDebt, 0), [customerDebts]);

    const closingData = useMemo(() => {
        let totalSalesRevenue = 0;
        let totalSalesReturns = 0;
        let totalCOGS = 0;
        let totalReturnsCOGS = 0;

        filteredSales.forEach(sale => {
            const items = sale.items || (sale.productId ? [{ productId: sale.productId, quantity: sale.quantity || 1, unitPrice: sale.unitPrice || 0, itemType: sale.itemType || 'قطع غيار' }] : []);
            
            if (sale.direction === 'بيع') {
                totalSalesRevenue += sale.totalAmount;
                items.forEach(item => {
                    const product = appData?.products?.find(p => p.id === item.productId);
                    if (product) {
                        totalCOGS += (product.purchasePrice * item.quantity);
                    }
                });
            } else if (sale.direction === 'مرتجع') {
                totalSalesReturns += sale.totalAmount;
                items.forEach(item => {
                    const product = appData?.products?.find(p => p.id === item.productId);
                    if (product) {
                        totalReturnsCOGS += (product.purchasePrice * item.quantity);
                    }
                });
            }
        });

        const netSales = totalSalesRevenue - totalSalesReturns;
        const netCOGS = totalCOGS - totalReturnsCOGS;
        const grossProfit = netSales - netCOGS;
        const netProfit = grossProfit - totalExpenses - totalPayroll;

        return {
            totalSalesRevenue,
            totalSalesReturns,
            netSales,
            netCOGS,
            grossProfit,
            totalExpenses,
            totalPayroll,
            netProfit
        };
    }, [filteredSales, totalExpenses, totalPayroll, appData?.products]);

    const handlePrintClosingReport = () => {
        let startDate = '';
        let endDate = '';
        
        if (dateFilter === 'custom') {
            startDate = customStartDate;
            endDate = customEndDate;
        } else {
            const today = new Date();
            endDate = today.toISOString().split('T')[0];
            
            if (dateFilter === 'today') {
                startDate = endDate;
            } else if (dateFilter === 'week') {
                const lastWeek = new Date(today);
                lastWeek.setDate(today.getDate() - 7);
                startDate = lastWeek.toISOString().split('T')[0];
            } else if (dateFilter === 'month') {
                const lastMonth = new Date(today);
                lastMonth.setMonth(today.getMonth() - 1);
                startDate = lastMonth.toISOString().split('T')[0];
            } else {
                // all time
                startDate = '2000-01-01';
            }
        }

        const reportHTML = generateFinancialClosingReportContent(appData, startDate, endDate);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(reportHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-hand-holding-usd" title="التقارير المالية">
                <div className="flex flex-wrap items-center gap-4">
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">كل الأوقات</option>
                        <option value="today">اليوم</option>
                        <option value="week">هذا الأسبوع</option>
                        <option value="month">هذا الشهر</option>
                        <option value="custom">مخصص</option>
                    </select>
                    
                    {dateFilter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input 
                                type="date" 
                                value={customStartDate} 
                                onChange={e => setCustomStartDate(e.target.value)}
                                className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <span>إلى</span>
                            <input 
                                type="date" 
                                value={customEndDate} 
                                onChange={e => setCustomEndDate(e.target.value)}
                                className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <button 
                                onClick={handleFetchCustomData}
                                disabled={isLoadingData || !customStartDate || !customEndDate}
                                className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                            >
                                {isLoadingData ? 'جاري الجلب...' : 'جلب البيانات'}
                            </button>
                        </div>
                    )}

                    <button onClick={() => setActiveReport(null)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                        <i className="fas fa-arrow-right"></i>
                        العودة
                    </button>
                </div>
            </SectionHeader>

            <div className="flex border-b dark:border-gray-700">
                <button onClick={() => setActiveTab('expenses')} className={`px-6 py-3 font-semibold ${activeTab === 'expenses' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>المصاريف</button>
                <button onClick={() => setActiveTab('advances')} className={`px-6 py-3 font-semibold ${activeTab === 'advances' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>السلف</button>
                <button onClick={() => setActiveTab('payroll')} className={`px-6 py-3 font-semibold ${activeTab === 'payroll' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>المرتبات</button>
                <button onClick={() => setActiveTab('debts')} className={`px-6 py-3 font-semibold ${activeTab === 'debts' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>مديونيات العملاء</button>
                <button onClick={() => setActiveTab('closing')} className={`px-6 py-3 font-semibold ${activeTab === 'closing' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>تقفيل الحسابات</button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                {activeTab === 'expenses' && (
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">التاريخ والوقت</th><th className="px-6 py-3">النوع</th><th className="px-6 py-3">الاسم</th><th className="px-6 py-3">المبلغ</th></tr>
                        </thead>
                        <tbody>{filteredExpenses.map(e => <tr key={e.id} className="border-b dark:border-gray-700"><td className="whitespace-nowrap" dir="ltr">{formatDateTime(e.date, e.timestamp)}</td><td>{e.type}</td><td>{e.name}</td><td>{formatCurrency(e.amount)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={3} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3">{formatCurrency(totalExpenses)}</td></tr></tfoot>
                    </table>
                )}
                 {activeTab === 'advances' && (
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">التاريخ والوقت</th><th className="px-6 py-3">الموظف</th><th className="px-6 py-3">المبلغ</th><th className="px-6 py-3">المتبقي</th></tr>
                        </thead>
                        <tbody>{filteredAdvances.map(a => <tr key={a.id} className="border-b dark:border-gray-700"><td className="whitespace-nowrap" dir="ltr">{formatDateTime(a.date, a.timestamp)}</td><td>{getEmployeeName(a.employeeId)}</td><td>{formatCurrency(a.amount)}</td><td>{formatCurrency(a.amount - a.payment)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={2} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3">{formatCurrency(totalAdvances)}</td><td></td></tr></tfoot>
                    </table>
                )}
                {activeTab === 'payroll' && (
                     <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">التاريخ والوقت</th><th className="px-6 py-3">الموظف</th><th className="px-6 py-3">الراتب الأساسي</th><th className="px-6 py-3">المصروف</th></tr>
                        </thead>
                        <tbody>{filteredPayroll.map(p => <tr key={p.id} className="border-b dark:border-gray-700"><td className="whitespace-nowrap" dir="ltr">{formatDateTime(p.date, p.timestamp)}</td><td>{getEmployeeName(p.employeeId)}</td><td>{formatCurrency(p.basicSalary)}</td><td>{formatCurrency(p.disbursed)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={3} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3">{formatCurrency(totalPayroll)}</td></tr></tfoot>
                    </table>
                )}
                {activeTab === 'debts' && (
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr><th className="px-6 py-3">اسم العميل</th><th className="px-6 py-3">رقم الهاتف</th><th className="px-6 py-3">الفواتير</th><th className="px-6 py-3">إجمالي المديونية</th></tr>
                        </thead>
                        <tbody>{customerDebts.map((d, i) => <tr key={i} className="border-b dark:border-gray-700"><td>{d.name}</td><td>{d.phone}</td><td>{d.invoices.join(', ')}</td><td className="font-bold text-red-600">{formatCurrency(d.totalDebt)}</td></tr>).map(el => React.cloneElement(el, { className: `${el.props.className} hover:bg-gray-50 dark:hover:bg-gray-600`, children: el.props.children.map((c:any) => React.cloneElement(c, {className: 'px-6 py-4'}))}))}</tbody>
                        <tfoot><tr className="font-bold bg-gray-100 dark:bg-gray-700"><td colSpan={3} className="px-6 py-3">الإجمالي</td><td className="px-6 py-3 text-red-600">{formatCurrency(totalDebts)}</td></tr></tfoot>
                    </table>
                )}
                {activeTab === 'closing' && (
                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">ملخص الأرباح والخسائر</h3>
                            <button onClick={handlePrintClosingReport} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                                <i className="fas fa-print"></i>
                                طباعة قائمة الدخل
                            </button>
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded-lg flex items-start gap-3">
                            <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                            <div>
                                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">لماذا لا يظهر الموردون والدفعات هنا؟</p>
                                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                    تقرير تقفيل الحسابات (قائمة الدخل) يركز على حساب <strong>الربح أو الخسارة</strong> بناءً على المبيعات وتكلفة البضاعة المباعة والمصروفات التشغيلية. 
                                    دفعات الموردين تعتبر حركة نقدية (Cash Flow) ولا تؤثر مباشرة على الربح، لأن تكلفة البضاعة (COGS) يتم حسابها بالفعل عند بيعها. إدراج دفعات الموردين هنا سيؤدي إلى حساب التكلفة مرتين.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي المبيعات</p>
                                <p className="text-lg font-bold text-gray-800 dark:text-white">{formatCurrency(closingData.totalSalesRevenue)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي المرتجعات</p>
                                <p className="text-lg font-bold text-gray-800 dark:text-white">{formatCurrency(closingData.totalSalesReturns)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">صافي المبيعات</p>
                                <p className="text-lg font-bold text-primary">{formatCurrency(closingData.netSales)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تكلفة البضاعة المباعة</p>
                                <p className="text-lg font-bold text-gray-800 dark:text-white">{formatCurrency(closingData.netCOGS)}</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                <p className="text-sm text-green-700 dark:text-green-400 mb-1 font-bold">مجمل الربح</p>
                                <p className="text-xl font-bold text-green-800 dark:text-green-300">{formatCurrency(closingData.grossProfit)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي المصروفات</p>
                                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(closingData.totalExpenses)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي المرتبات المنصرفة</p>
                                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(closingData.totalPayroll)}</p>
                            </div>
                            <div className={`p-4 rounded-xl border ${closingData.netProfit >= 0 ? 'bg-green-100 border-green-300 dark:bg-green-900/40 dark:border-green-700' : 'bg-red-100 border-red-300 dark:bg-red-900/40 dark:border-red-700'}`}>
                                <p className={`text-sm mb-1 font-bold ${closingData.netProfit >= 0 ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>صافي الربح / الخسارة</p>
                                <p className={`text-2xl font-bold ${closingData.netProfit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{formatCurrency(closingData.netProfit)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialReportView;
