import React, { useState, useMemo } from 'react';
import { DailySale, User, Product, TreasuryTransaction, Role } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import DailySaleModal from './DailySaleModal';
import { formatCurrency } from '../../lib/utils';
import { generateInvoiceContent } from '../../lib/reportTemplates';

interface DailySalesProps {
    dailySales: DailySale[];
    setDailySales: (sales: DailySale[]) => void;
    products: Product[];
    setProducts: (products: Product[]) => void;
    addTreasuryTransaction: (transaction: Omit<TreasuryTransaction, 'id'>) => void;
    currentUser: User;
}

const DailySales: React.FC<DailySalesProps> = ({ dailySales, setDailySales, products, setProducts, addTreasuryTransaction, currentUser }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<DailySale | null>(null);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

    const todaySales = useMemo(() => {
        return dailySales
            .filter(sale => {
                if (currentUser.role === Role.Seller) {
                    return sale.date === todayStr && sale.sellerId === currentUser.id;
                }
                return sale.date === todayStr;
            })
            .sort((a,b) => b.id - a.id);
    }, [dailySales, todayStr, currentUser]);

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
        if (window.confirm('هل أنت متأكد من حذف هذه المبيعة؟ سيتم إرجاع الكمية للمخزون وعكس الحركة المالية.')) {
            const saleToDelete = dailySales.find(s => s.id === saleId);
            if (!saleToDelete) return;
            
            // Revert stock immutably
            setProducts(prevProducts => prevProducts.map(p => {
                if (p.id === saleToDelete.productId) {
                    const quantityToReturn = saleToDelete.direction === 'بيع' ? saleToDelete.quantity : -saleToDelete.quantity;
                    return {
                        ...p,
                        stock: {
                            ...p.stock,
                            [saleToDelete.branchSoldFrom]: p.stock[saleToDelete.branchSoldFrom] + quantityToReturn
                        }
                    };
                }
                return p;
            }));

             // Add reversing treasury transaction
            if (saleToDelete.direction === 'بيع') {
                 addTreasuryTransaction({
                    date: saleToDelete.date,
                    type: 'مرتجع مبيعات',
                    description: `إلغاء فاتورة #${saleToDelete.invoiceNumber}`,
                    amountIn: 0,
                    amountOut: saleToDelete.totalAmount,
                    relatedId: saleToDelete.id,
                });
            } else if (saleToDelete.direction === 'مرتجع') {
                 addTreasuryTransaction({
                    date: saleToDelete.date,
                    type: 'إيراد مبيعات',
                    description: `إلغاء مرتجع للفاتورة #${saleToDelete.invoiceNumber}`,
                    amountIn: saleToDelete.totalAmount,
                    amountOut: 0,
                    relatedId: saleToDelete.id,
                });
            }

            setDailySales(dailySales.filter(s => s.id !== saleId));
        }
    };
    
    const handleSaveSale = (saleData: Omit<DailySale, 'id'> & { id?: number }) => {
        const isEditing = saleData.id !== undefined;
        let finalSale: DailySale;

        if (isEditing) {
            const originalSale = dailySales.find(s => s.id === saleData.id);
            if (!originalSale) return;

            // Revert original stock impact
            setProducts(prev => prev.map(p => {
                if (p.id === originalSale.productId) {
                    const quantityToRevert = originalSale.direction === 'بيع' ? originalSale.quantity : -originalSale.quantity;
                    return { ...p, stock: { ...p.stock, [originalSale.branchSoldFrom]: p.stock[originalSale.branchSoldFrom] + quantityToRevert } };
                }
                return p;
            }));
            finalSale = { ...originalSale, ...saleData };
        } else {
            const newId = (dailySales.length > 0 ? Math.max(...dailySales.map(s => s.id)) : 0) + 1;
            finalSale = { ...saleData, id: newId } as DailySale;
        }

        // Apply new stock impact
        setProducts(prev => prev.map(p => {
            if (p.id === finalSale.productId) {
                const quantityToApply = finalSale.direction === 'بيع' ? -finalSale.quantity : finalSale.quantity;
                return { ...p, stock: { ...p.stock, [finalSale.branchSoldFrom]: p.stock[finalSale.branchSoldFrom] + quantityToApply } };
            }
            return p;
        }));

        // TODO: Handle treasury transaction for edits properly. This is a simplification.
        if (!isEditing) {
            const transactionType = finalSale.direction === 'بيع' ? 'إيراد مبيعات' : 'مرتجع مبيعات';
            addTreasuryTransaction({
                date: finalSale.date,
                type: transactionType,
                description: `${finalSale.direction} فاتورة #${finalSale.invoiceNumber}`,
                amountIn: finalSale.direction === 'بيع' ? finalSale.totalAmount : 0,
                amountOut: finalSale.direction !== 'بيع' ? finalSale.totalAmount : 0,
                relatedId: finalSale.id,
            });
        }
        
        // Update sales state
        if (isEditing) {
            setDailySales(dailySales.map(s => s.id === finalSale.id ? finalSale : s));
        } else {
            setDailySales([...dailySales, finalSale]);
        }
        
        setModalOpen(false);
    };

     const handlePrintInvoice = (sale: DailySale) => {
        const product = products.find(p => p.id === sale.productId);
        const content = generateInvoiceContent(sale, product);
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(content);
            reportWindow.document.close();
        }
    };

    const getProductName = (productId: number) => {
        return products.find(p => p.id === productId)?.name || 'صنف محذوف';
    }

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-hand-holding-usd" title="مبيعات اليوم">
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
                    <p className="text-gray-600 dark:text-gray-300">المستخدم: <strong className="font-semibold">{currentUser.name}</strong></p>
                </div>
                <div className="flex gap-4 sm:gap-8">
                    <div className="text-center">
                        <span className="block text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalSales)}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبيعات</span>
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
                                    <td className="px-6 py-4">{getProductName(sale.productId)}</td>
                                    <td className="px-6 py-4">{sale.quantity}</td>
                                    <td className="px-6 py-4 font-semibold">{formatCurrency(sale.totalAmount)}</td>
                                    <td className="px-6 py-4">{sale.direction}</td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => handlePrintInvoice(sale)} className="text-green-500 hover:text-green-700 text-lg"><i className="fas fa-print"></i></button>
                                        <button onClick={() => handleEditSale(sale)} className="text-blue-500 hover:text-blue-700 text-lg"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => handleDeleteSale(sale.id)} className="text-red-500 hover:text-red-700 text-lg"><i className="fas fa-trash"></i></button>
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
                    products={products}
                />
            )}
        </div>
    );
};

export default DailySales;