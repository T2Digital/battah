
import React, { useMemo } from 'react';
import useStore from '../../lib/store';
import { Supplier, Payment } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import SectionHeader from '../shared/SectionHeader';
import { generateSuppliersReportContent } from '../../lib/reportTemplates';

interface SuppliersReportViewProps {
    setActiveReport: (report: string | null) => void;
}

const SuppliersReportView: React.FC<SuppliersReportViewProps> = ({ setActiveReport }) => {
    const appData = useStore(state => state.appData);
    const { suppliers = [], payments = [] } = appData || {};

    const paymentsWithDetails = useMemo(() => {
        return payments
            .map(p => ({...p, supplierName: suppliers.find(s => s.id === p.supplierId)?.name || 'غير معروف'}))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [payments, suppliers]);

    const totalPayments = useMemo(() => payments.reduce((sum, p) => sum + p.payment, 0), [payments]);
    const totalInvoices = useMemo(() => payments.reduce((sum, p) => sum + p.invoiceTotal, 0), [payments]);

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
                 <button onClick={handlePrint} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-md">
                    <i className="fas fa-print"></i>
                    طباعة التقرير
                </button>
                <button onClick={() => setActiveReport(null)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                    <i className="fas fa-arrow-right"></i>
                    العودة
                </button>
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
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">اسم المورد</th>
                            <th className="px-6 py-3">مبلغ الدفعة</th>
                            <th className="px-6 py-3">إجمالي الفاتورة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paymentsWithDetails.map(p => (
                            <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{formatDate(p.date)}</td>
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
