
import React, { useState, useMemo, useEffect } from 'react';
import { DailySale, User } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import DailySaleModal from './DailySaleModal';
import { formatCurrency, formatDate } from '../../lib/utils';

interface DailySalesProps {
    dailySales: DailySale[];
    setDailySales: React.Dispatch<React.SetStateAction<DailySale[]>>;
    currentUser: User;
}

const DailySales: React.FC<DailySalesProps> = ({ dailySales, setDailySales, currentUser }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<DailySale | null>(null);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

    const todaySales = useMemo(() => {
        return dailySales
            .filter(sale => sale.date === todayStr && sale.sellerId === currentUser.id)
            .sort((a,b) => b.id - a.id);
    }, [dailySales, todayStr, currentUser.id]);

    const { totalSales, transactionsCount } = useMemo(() => {
        const total = todaySales.reduce((sum, sale) => {
            if (sale.direction === 'بيع') return sum + sale.totalAmount;
            if (sale.direction === 'مرتجع') return sum - sale.totalAmount;
            return sum;
        }, 0);
        return { totalSales: total, transactionsCount: todaySales.length };
    }, [todaySales]);

    const handleAddSale = () => {
        setEditingSale(null);
        setModalOpen(true);
    };
    
    const handleEditSale = (sale: DailySale) => {
        setEditingSale(sale);
        setModalOpen(true);
    };

    const handleDeleteSale = (saleId: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذه المبيعة؟')) {
            setDailySales(prev => prev.filter(s => s.id !== saleId));
        }
    };
    
    const handleSaveSale = (sale: Omit<DailySale, 'id'> & { id?: number }) => {
        setDailySales(prev => {
            if (sale.id) {
                return prev.map(s => s.id === sale.id ? { ...s, ...sale } : s);
            }
            const newId = Math.max(0, ...prev.map(s => s.id)) + 1;
            return [...prev, { ...sale, id: newId }];
        });
        setModalOpen(false);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-cash-register" title="مبيعات اليوم">
                <button onClick={handleAddSale} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    تسجيل مبيعة جديدة
                </button>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-primary dark:text-primary-light">
                        📅 {today.toLocaleDateString("ar-EG")} - {arabicDays[today.getDay()]}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">البائع: <strong className="font-semibold">{currentUser.name}</strong></p>
                </div>
                <div className="flex gap-4 sm:gap-8">
                    <div className="text-center">
                        <span className="block text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalSales)}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي مبيعات اليوم</span>
                    </div>
                     <div className="text-center">
                        <span className="block text-2xl font-bold text-gray-800 dark:text-white">{transactionsCount}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">عدد المعاملات</span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">رقم الفاتورة</th>
                            <th scope="col" className="px-6 py-3">الصنف</th>
                            <th scope="col" className="px-6 py-3">الكمية</th>
                            <th scope="col" className="px-6 py-3">الإجمالي</th>
                            <th scope="col" className="px-6 py-3">الاتجاه</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todaySales.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-500">لا توجد مبيعات مسجلة اليوم.</td>
                            </tr>
                        ) : (
                            todaySales.map(sale => (
                                <tr key={sale.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{sale.invoiceNumber}</td>
                                    <td className="px-6 py-4">{sale.itemName}</td>
                                    <td className="px-6 py-4">{sale.quantity}</td>
                                    <td className="px-6 py-4 font-semibold">{formatCurrency(sale.totalAmount)}</td>
                                    <td className="px-6 py-4">{sale.direction}</td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button onClick={() => handleEditSale(sale)} className="text-blue-500 hover:text-blue-700"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => handleDeleteSale(sale.id)} className="text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <DailySaleModal
                    isOpen={isModalOpen}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSaveSale}
                    currentUser={currentUser}
                    existingSale={editingSale}
                    dailySales={dailySales}
                />
            )}
        </div>
    );
};

export default DailySales;
