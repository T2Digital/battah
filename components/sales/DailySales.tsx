import React, { useState, useMemo, useEffect } from 'react';
import { DailySale, User } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import DailySaleModal from './DailySaleModal';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatCurrency, normalizeSaleItems, formatDateTime } from '../../lib/utils';
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
        setProducts,
        updateProduct,
        addExpense
    } = useStore(state => ({
        dailySales: state.appData?.dailySales || [],
        products: state.appData?.products || [],
        addDailySale: state.addDailySale,
        updateDailySale: state.updateDailySale,
        deleteDailySale: state.deleteDailySale,
        addTreasuryTransaction: state.addTreasuryTransaction,
        setProducts: state.setProducts,
        updateProduct: state.updateProduct,
        addExpense: state.addExpense
    }));
    
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterPeriod, setFilterPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
    const [filterSeller, setFilterSeller] = useState<string>('all');
    const [filterBranch, setFilterBranch] = useState<string>(currentUser?.role === 'admin' ? 'all' : (currentUser?.branch || 'all'));
    const [filterSource, setFilterSource] = useState<'all' | 'المحل' | 'أونلاين'>('all');
    
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<DailySale | null>(null);
    const [saleToDelete, setSaleToDelete] = useState<DailySale | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

    const todaySales = useMemo(() => {
        return dailySales
            .filter(sale => {
                let dateMatch = false;
                const saleDate = new Date(sale.date);
                const filterD = new Date(filterDate);
                
                if (filterPeriod === 'daily') {
                    dateMatch = sale.date === filterDate;
                } else if (filterPeriod === 'weekly') {
                    const startOfWeek = new Date(filterD);
                    startOfWeek.setDate(filterD.getDate() - filterD.getDay());
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    dateMatch = saleDate >= startOfWeek && saleDate <= endOfWeek;
                } else if (filterPeriod === 'monthly') {
                    dateMatch = saleDate.getMonth() === filterD.getMonth() && saleDate.getFullYear() === filterD.getFullYear();
                } else if (filterPeriod === 'yearly') {
                    dateMatch = saleDate.getFullYear() === filterD.getFullYear();
                }

                const sellerMatch = filterSeller === 'all' || sale.sellerId === filterSeller;
                const branchMatch = filterBranch === 'all' || sale.branchSoldFrom === filterBranch;
                const sourceMatch = filterSource === 'all' || sale.source === filterSource;
                
                if (currentUser.role === 'seller') {
                    return dateMatch && sale.sellerId === currentUser.id && branchMatch && sourceMatch;
                }
                return dateMatch && sellerMatch && branchMatch && sourceMatch;
            })
            .sort((a,b) => b.id - a.id);
    }, [dailySales, filterDate, filterPeriod, filterSeller, filterBranch, filterSource, currentUser]);

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

        // Update only the products that changed
        for (const [productId, change] of stockChanges.entries()) {
            const product = products.find(p => p.id === productId);
            if (product) {
                const newStock = { ...product.stock, [finalSaleData.branchSoldFrom]: (product.stock[finalSaleData.branchSoldFrom] || 0) + change };
                await updateProduct(productId, { stock: newStock });
            }
        }

        if (isEditing && saleData.id) {
            await updateDailySale(saleData.id, saleData);
        } else {
            const newSale = await addDailySale(finalSaleData);
            
            if (newSale.direction === 'هدية') {
                // Add to expenses without deducting from treasury
                await addExpense({
                    date: newSale.date,
                    name: 'هدية',
                    amount: newSale.totalAmount, // Or calculate cost price if needed
                    notes: `هدية من فاتورة #${newSale.invoiceNumber}`,
                    type: 'عامة'
                }, true); // true to skip treasury
            } else {
                const transactionType = newSale.direction === 'بيع' ? 'إيراد مبيعات' : 'مرتجع مبيعات';
                
                if (newSale.paymentMethod === 'مختلط' && newSale.cashAmount && newSale.electronicAmount) {
                    await addTreasuryTransaction({
                        date: newSale.date, type: transactionType, description: `${newSale.direction} فاتورة #${newSale.invoiceNumber} (نقدي)`,
                        amountIn: newSale.direction === 'بيع' ? newSale.cashAmount : 0,
                        amountOut: newSale.direction !== 'بيع' ? newSale.cashAmount : 0, relatedId: newSale.id, paymentMethod: 'cash'
                    });
                    await addTreasuryTransaction({
                        date: newSale.date, type: transactionType, description: `${newSale.direction} فاتورة #${newSale.invoiceNumber} (إلكتروني)`,
                        amountIn: newSale.direction === 'بيع' ? newSale.electronicAmount : 0,
                        amountOut: newSale.direction !== 'بيع' ? newSale.electronicAmount : 0, relatedId: newSale.id, paymentMethod: 'electronic'
                    });
                } else {
                    const method = newSale.paymentMethod === 'إلكترونى' ? 'electronic' : 'cash';
                    await addTreasuryTransaction({
                        date: newSale.date, type: transactionType, description: `${newSale.direction} فاتورة #${newSale.invoiceNumber}`,
                        amountIn: newSale.direction === 'بيع' ? newSale.totalAmount : 0,
                        amountOut: newSale.direction !== 'بيع' ? newSale.totalAmount : 0, relatedId: newSale.id, paymentMethod: method
                    });
                }
            }
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

    const handleShareWhatsApp = (sale: DailySale) => {
        const items = normalizeSaleItems(sale);
        const itemsList = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return `- ${product?.name || 'صنف'} (${item.quantity}) ${formatCurrency(item.unitPrice)}`;
        }).join('%0a');

        const locationText = sale.locationLink ? `*رابط الموقع:* ${sale.locationLink}%0a` : '';
        const message = `*فاتورة رقم: ${sale.invoiceNumber}*%0a` +
            `*التاريخ:* ${sale.date}%0a` +
            `*الإجمالي:* ${formatCurrency(sale.totalAmount)}%0a` +
            locationText +
            `------------------%0a` +
            `*الأصناف:*%0a${itemsList}%0a` +
            `------------------%0a` +
            `شكراً لتعاملكم مع بطاح الأصلي!`;

        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const handlePrintFilteredSales = () => {
        import('../../lib/reportTemplates').then(({ generateFilteredSalesReportContent }) => {
            const content = generateFilteredSalesReportContent(todaySales, filterDate, filterPeriod);
            const reportWindow = window.open('', '_blank');
            if (reportWindow) {
                reportWindow.document.write(content);
                reportWindow.document.close();
            } else {
                alert("يرجى السماح بالنوافذ المنبثقة لفتح التقرير.");
            }
        });
    };

    const uniqueSellers = useMemo(() => {
        const sellers = new Set(dailySales.map(s => s.sellerName));
        return Array.from(sellers);
    }, [dailySales]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-hand-holding-usd" title="مبيعات اليوم">
                <div className="flex items-center gap-4">
                    {!isOnline && (
                        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse">
                            <i className="fas fa-wifi-slash"></i>
                            وضع عدم الاتصال (سيتم المزامنة لاحقاً)
                        </div>
                    )}
                    <button onClick={handlePrintFilteredSales} className="px-4 py-2 bg-secondary text-white rounded-lg flex items-center gap-2 hover:bg-secondary-dark transition shadow-md">
                        <i className="fas fa-print"></i>
                        طباعة المبيعات
                    </button>
                    <button onClick={handleAddSale} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                        <i className="fas fa-plus"></i>
                        فاتورة جديدة
                    </button>
                </div>
            </SectionHeader>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">فترة العرض</label>
                    <select 
                        value={filterPeriod} 
                        onChange={(e) => setFilterPeriod(e.target.value as any)}
                        className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-w-[120px]"
                    >
                        <option value="daily">يومي</option>
                        <option value="weekly">أسبوعي</option>
                        <option value="monthly">شهري</option>
                        <option value="yearly">سنوي</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التاريخ المرجعي</label>
                    <input 
                        type="date" 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)} 
                        className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                
                {currentUser.role !== 'seller' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البائع</label>
                        <select 
                            value={filterSeller} 
                            onChange={(e) => setFilterSeller(e.target.value)}
                            className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-w-[150px]"
                        >
                            <option value="all">الكل</option>
                            {uniqueSellers.map(seller => (
                                <option key={seller} value={dailySales.find(s => s.sellerName === seller)?.sellerId}>{seller}</option>
                            ))}
                        </select>
                    </div>
                )}

                {currentUser?.role === 'admin' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفرع</label>
                        <select 
                            value={filterBranch} 
                            onChange={(e) => setFilterBranch(e.target.value)}
                            className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-w-[150px]"
                        >
                            <option value="all">الكل</option>
                            <option value="main">المخزن</option>
                            <option value="branch1">الرئيسي</option>
                            <option value="branch2">فرع 1</option>
                            <option value="branch3">فرع 2</option>
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المصدر</label>
                    <select 
                        value={filterSource} 
                        onChange={(e) => setFilterSource(e.target.value as any)}
                        className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-w-[150px]"
                    >
                        <option value="all">الكل</option>
                        <option value="المحل">المحل</option>
                        <option value="أونلاين">أونلاين</option>
                    </select>
                </div>
            </div>

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
                            <th scope="col" className="px-6 py-3">التاريخ والوقت</th>
                            <th scope="col" className="px-6 py-3">عدد الأصناف</th>
                            <th scope="col" className="px-6 py-3">الإجمالي</th>
                            <th scope="col" className="px-6 py-3">التوجيه</th>
                            <th scope="col" className="px-6 py-3">البائع</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todaySales.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-gray-500">لا توجد فواتير مسجلة اليوم.</td>
                            </tr>
                        ) : (
                            todaySales.map(sale => {
                                const items = normalizeSaleItems(sale);
                                return (
                                <tr key={sale.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{sale.invoiceNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(sale.date, sale.timestamp)}</td>
                                    <td className="px-6 py-4">{items.length}</td>
                                    <td className="px-6 py-4 font-semibold">{formatCurrency(sale.totalAmount)}</td>
                                    <td className="px-6 py-4">{sale.direction}</td>
                                    <td className="px-6 py-4">{sale.sellerName}</td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => handlePrintInvoice(sale)} className="text-green-500 hover:text-green-700 text-lg" aria-label={`طباعة فاتورة ${sale.invoiceNumber}`}><i className="fas fa-print"></i></button>
                                        <button onClick={() => handleShareWhatsApp(sale)} className="text-green-600 hover:text-green-800 text-lg" aria-label={`إرسال واتساب ${sale.invoiceNumber}`}><i className="fab fa-whatsapp"></i></button>
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