
import React, { useMemo } from 'react';
import useStore from '../../lib/store';
import { Supplier, Payment } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import SectionHeader from '../shared/SectionHeader';
import { generateSuppliersReportContent } from '../../lib/reportTemplates';

interface SuppliersReportViewProps {
    setActiveReport: (report: string | null) => void;
}

const SuppliersReportView: React.FC<SuppliersReportViewProps> = ({ setActiveReport }) => {
    const { appData, fetchDataByDateRange } = useStore(state => ({
        appData: state.appData,
        fetchDataByDateRange: state.fetchDataByDateRange
    }));
    const { suppliers = [], payments = [], purchaseOrders = [] } = appData || {};
    const [dateFilter, setDateFilter] = React.useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = React.useState('');
    const [customEndDate, setCustomEndDate] = React.useState('');
    const [isLoadingData, setIsLoadingData] = React.useState(false);

    const handleFetchCustomData = async () => {
        if (!customStartDate || !customEndDate) return;
        setIsLoadingData(true);
        await fetchDataByDateRange('payments', customStartDate, customEndDate);
        await fetchDataByDateRange('purchaseOrders', customStartDate, customEndDate);
        setIsLoadingData(false);
    };

    const filteredPayments = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
            return payments.filter(item => {
                const d = new Date(item.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            });
        } else if (dateFilter === 'week') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            return payments.filter(item => {
                const d = new Date(item.date);
                d.setHours(0, 0, 0, 0);
                return d >= lastWeek;
            });
        } else if (dateFilter === 'month') {
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            return payments.filter(item => {
                const d = new Date(item.date);
                d.setHours(0, 0, 0, 0);
                return d >= lastMonth;
            });
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
            return payments.filter(item => {
                return item.date >= customStartDate && item.date <= customEndDate;
            });
        }
        return payments;
    }, [payments, dateFilter, customStartDate, customEndDate]);

    const paymentsWithDetails = useMemo(() => {
        return filteredPayments
            .map(p => ({...p, supplierName: suppliers.find(s => s.id === p.supplierId)?.name || 'غير معروف'}))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredPayments, suppliers]);

    const filteredPurchaseOrders = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
            return purchaseOrders.filter(item => {
                const d = new Date(item.orderDate);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            });
        } else if (dateFilter === 'week') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            return purchaseOrders.filter(item => {
                const d = new Date(item.orderDate);
                d.setHours(0, 0, 0, 0);
                return d >= lastWeek;
            });
        } else if (dateFilter === 'month') {
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            return purchaseOrders.filter(item => {
                const d = new Date(item.orderDate);
                d.setHours(0, 0, 0, 0);
                return d >= lastMonth;
            });
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
            return purchaseOrders.filter(item => {
                return item.orderDate >= customStartDate && item.orderDate <= customEndDate;
            });
        }
        return purchaseOrders;
    }, [purchaseOrders, dateFilter, customStartDate, customEndDate]);

    const totalPayments = useMemo(() => filteredPayments.reduce((sum, p) => sum + p.payment, 0), [filteredPayments]);
    const totalInvoices = useMemo(() => filteredPurchaseOrders.filter(po => po.status === 'مكتمل').reduce((sum, po) => sum + (po.type === 'مرتجع' ? -po.totalAmount : po.totalAmount), 0), [filteredPurchaseOrders]);

    const handlePrint = () => {
        if (!appData) return;
        const content = generateSuppliersReportContent(appData);
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(content);
            reportWindow.document.close();
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-truck" title="تقرير الموردين والدفعات">
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

                    <button onClick={handlePrint} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-md">
                        <i className="fas fa-print"></i>
                        طباعة
                    </button>
                    <button onClick={() => setActiveReport(null)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                        <i className="fas fa-arrow-right"></i>
                        العودة
                    </button>
                </div>
            </SectionHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
                    <h4 className="text-gray-500">إجمالي المدفوعات للموردين</h4>
                    <p className="text-3xl font-bold text-red-500">{formatCurrency(totalPayments)}</p>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
                    <h4 className="text-gray-500">إجمالي قيمة الفواتير</h4>
                    <p className="text-3xl font-bold text-green-500">{formatCurrency(totalInvoices)}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">التاريخ والوقت</th>
                            <th className="px-6 py-3">اسم المورد</th>
                            <th className="px-6 py-3">مبلغ الدفعة</th>
                            <th className="px-6 py-3">إجمالي الفاتورة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paymentsWithDetails.map(p => (
                            <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(p.date, p.timestamp)}</td>
                                <td className="px-6 py-4">{p.supplierName}</td>
                                <td className="px-6 py-4">{formatCurrency(p.payment)}</td>
                                <td className="px-6 py-4">{formatCurrency(p.invoiceTotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SuppliersReportView;
