import React, { useState, useMemo } from 'react';
import { DailySale, User } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import DailySaleModal from './DailySaleModal';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatCurrency, normalizeSaleItems } from '../../lib/utils';
import { generateInvoiceContent } from '../../lib/reportTemplates';
import useStore from '../../lib/store';

const DailySales: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const { 
        dailySales, 
        products, 
        addDailySale, 
        updateDailySale, 
        deleteDailySale,
        addTreasuryTransaction, 
        setProducts 
    } = useStore(state => ({
        dailySales: state.appData?.dailySales || [],
        products: state.appData?.products || [],
        addDailySale: state.addDailySale,
        updateDailySale: state.updateDailySale,
        deleteDailySale: state.deleteDailySale,
        addTreasuryTransaction: state.addTreasuryTransaction,
        setProducts: state.setProducts
    }));
    
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<DailySale | null>(null);
    const [saleToDelete, setSaleToDelete] = useState<DailySale | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

    const todaySales = useMemo(() => {
        return dailySales
            .filter(sale => {
                if (currentUser.role === 'seller') {
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

    const confirmDeleteSale = async () => {
        if (!saleToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDailySale(saleToDelete.id);
            setSaleToDelete(null);
        } catch (error) {
            console.error("Failed to delete sale:", error);
            alert(`فشل حذف الفاتورة: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleSaveSale = async (saleData: Omit<DailySale, 'id'> & { id?: number }) => {
        const isEditing = saleData.id !== undefined;
        let finalSaleData: Omit<DailySale, 'id'> = saleData;

        const originalSale = isEditing ? dailySales.find(s => s.id === saleData.id) : undefined;

        const stockChanges = new Map<number, number>();
        
        if (isEditing && originalSale) {
            const originalItems = normalizeSaleItems(originalSale);
            originalItems.forEach(item => {
                const quantityToRevert = originalSale.direction === 'بيع' ? item.quantity : -item.quantity;
                stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) + quantityToRevert);
            });
        }
        
        const finalItems = normalizeSaleItems(finalSaleData as DailySale);
        finalItems.forEach(item => {
            const quantityToApply = finalSaleData.direction === 'بيع' ? -item.quantity : item.quantity;
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) + quantityToApply);
        });

        const updatedProducts = products.map(p => {
            if (stockChanges.has(p.id)) {
                return { ...p, stock: { ...p.stock, [finalSaleData.branchSoldFrom]: p.stock[finalSaleData.branchSoldFrom] + (stockChanges.get(p.id) || 0) } };
            }
            return p;
        });
        await setProducts(updatedProducts);

        if (isEditing && saleData.id) {
            await updateDailySale(saleData.id, saleData);
        } else {
            const newSale = await addDailySale(finalSaleData);
            const transactionType = newSale.direction === 'بيع' ? 'إيراد مبيعات' : 'مرتجع مبيعات';
            await addTreasuryTransaction({
                date: newSale.date, type: transactionType, description: `${newSale.direction} فاتورة #${newSale.invoiceNumber}`,
                amountIn: newSale.direction === 'بيع' ? newSale.totalAmount : 0,
                amountOut: newSale.direction !== 'بيع' ? newSale.totalAmount : 0, relatedId: newSale.id
            });
        }
        
        setModalOpen(false);
    };

    const handlePrintInvoice = (sale: DailySale) => {
        const content = generateInvoiceContent(sale, products);
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(content);
            reportWindow.document.close();
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-hand-holding-usd" title="مبيعات اليوم">
                <button onClick={handleAddSale} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    فاتورة جديدة
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
                        <span className="text-sm text-gray-500 dark:text-gray-400">عدد الفواتير</span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">رقم الفاتورة</th>
                            <th scope="col" className="px-6 py-3">عدد الأصناف</th>
                            <th scope="col" className="px-6 py-3">الإجمالي</th>
                            <th scope="col" className="px-6 py-3">الاتجاه</th>
                            <th scope="col" className="px-6 py-3">البائع</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todaySales.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-500">لا توجد فواتير مسجلة اليوم.</td>
                            </tr>
                        ) : (
                            todaySales.map(sale => {
                                const items = normalizeSaleItems(sale);
                                return (
                                <tr key={sale.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{sale.invoiceNumber}</td>
                                    <td className="px-6 py-4">{items.length}</td>
                                    <td className="px-6 py-4 font-semibold">{formatCurrency(sale.totalAmount)}</td>
                                    <td className="px-6 py-4">{sale.direction}</td>
                                    <td className="px-6 py-4">{sale.sellerName}</td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => handlePrintInvoice(sale)} className="text-green-500 hover:text-green-700 text-lg" aria-label={`طباعة فاتورة ${sale.invoiceNumber}`}><i className="fas fa-print"></i></button>
                                        <button onClick={() => handleEditSale(sale)} className="text-blue-500 hover:text-blue-700 text-lg" aria-label={`تعديل فاتورة ${sale.invoiceNumber}`}><i className="fas fa-edit"></i></button>
                                        <button onClick={() => setSaleToDelete(sale)} className="text-red-500 hover:text-red-700 text-lg w-6 text-center" aria-label={`حذف فاتورة ${sale.invoiceNumber}`}>
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                                );
                            })
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
            {saleToDelete && (
                <ConfirmationModal
                    isOpen={!!saleToDelete}
                    onClose={() => setSaleToDelete(null)}
                    onConfirm={confirmDeleteSale}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف الفاتورة رقم "${saleToDelete.invoiceNumber}"؟ سيتم إرجاع الكميات للمخزون وعكس الحركة المالية.`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}
        </div>
    );
};

export default DailySales;