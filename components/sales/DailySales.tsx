import React, { useState, useMemo, useEffect } from 'react';
import { DailySale, User } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import DailySaleModal from './DailySaleModal';
import ConfirmationModal from '../shared/ConfirmationModal';
import Modal from '../shared/Modal';
import { formatCurrency, normalizeSaleItems, formatDateTime } from '../../lib/utils';
import { generateInvoiceContent } from '../../lib/reportTemplates';
import useStore from '../../lib/store';

import ProductName from '../shared/ProductName';

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
        updateProductStock,
        addExpense,
        fetchDataByDateRange
    } = useStore(state => ({
        dailySales: state.appData?.dailySales || [],
        products: state.appData?.products || [],
        addDailySale: state.addDailySale,
        updateDailySale: state.updateDailySale,
        deleteDailySale: state.deleteDailySale,
        addTreasuryTransaction: state.addTreasuryTransaction,
        setProducts: state.setProducts,
        updateProduct: state.updateProduct,
        updateProductStock: state.updateProductStock,
        addExpense: state.addExpense,
        fetchDataByDateRange: state.fetchDataByDateRange
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
            if (sale.direction === 'بيع' || sale.direction === 'مرتجع' || sale.direction === 'تبديل') {
                return sum + sale.totalAmount;
            }
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
                let quantityToRevert = 0;
                if (originalSale.direction === 'بيع') {
                    quantityToRevert = item.quantity;
                } else if (originalSale.direction === 'مرتجع') {
                    quantityToRevert = -item.quantity;
                } else if (originalSale.direction === 'تبديل') {
                    quantityToRevert = item.isReturn ? -item.quantity : item.quantity;
                } else {
                    quantityToRevert = item.quantity; // Default fallback
                }
                stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) + quantityToRevert);
            });
        }
        
        const finalItems = normalizeSaleItems(finalSaleData as DailySale);
        finalItems.forEach(item => {
            let quantityToApply = 0;
            if (finalSaleData.direction === 'بيع') {
                quantityToApply = -item.quantity;
            } else if (finalSaleData.direction === 'مرتجع') {
                quantityToApply = item.quantity;
            } else if (finalSaleData.direction === 'تبديل') {
                quantityToApply = item.isReturn ? item.quantity : -item.quantity;
            } else {
                quantityToApply = -item.quantity; // Default fallback
            }
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) + quantityToApply);
        });

        // Update only the products that changed
        for (const [productId, change] of stockChanges.entries()) {
            await updateProductStock(productId, finalSaleData.branchSoldFrom, change);
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
                let transactionType: 'إيراد مبيعات' | 'مرتجع مبيعات' = 'إيراد مبيعات';
                let amountIn = 0;
                let amountOut = 0;

                const totalPaid = (newSale.cashAmount || 0) + (newSale.electronicAmount || 0);

                if (newSale.direction === 'بيع') {
                    transactionType = 'إيراد مبيعات';
                    amountIn = Math.abs(totalPaid);
                } else if (newSale.direction === 'مرتجع') {
                    transactionType = 'مرتجع مبيعات';
                    amountOut = Math.abs(totalPaid);
                } else if (newSale.direction === 'تبديل') {
                    if (newSale.totalAmount >= 0) {
                        transactionType = 'إيراد مبيعات';
                        amountIn = Math.abs(totalPaid);
                    } else {
                        transactionType = 'مرتجع مبيعات';
                        amountOut = Math.abs(totalPaid);
                    }
                }

                if (newSale.paymentMethod === 'مختلط' && newSale.cashAmount && newSale.electronicAmount) {
                    const cashIn = amountIn > 0 ? Math.abs(newSale.cashAmount) : 0;
                    const cashOut = amountOut > 0 ? Math.abs(newSale.cashAmount) : 0;
                    const elecIn = amountIn > 0 ? Math.abs(newSale.electronicAmount) : 0;
                    const elecOut = amountOut > 0 ? Math.abs(newSale.electronicAmount) : 0;

                    if (cashIn > 0 || cashOut > 0) {
                        await addTreasuryTransaction({
                            date: newSale.date, type: transactionType, description: `${newSale.direction} فاتورة #${newSale.invoiceNumber} (نقدي)`,
                            amountIn: cashIn,
                            amountOut: cashOut, relatedId: newSale.id, paymentMethod: 'cash'
                        });
                    }
                    if (elecIn > 0 || elecOut > 0) {
                        await addTreasuryTransaction({
                            date: newSale.date, type: transactionType, description: `${newSale.direction} فاتورة #${newSale.invoiceNumber} (إلكتروني)`,
                            amountIn: elecIn,
                            amountOut: elecOut, relatedId: newSale.id, paymentMethod: 'electronic'
                        });
                    }
                } else if (newSale.paymentMethod !== 'آجل') {
                    const method = newSale.paymentMethod === 'إلكترونى' ? 'electronic' : 'cash';
                    if (amountIn > 0 || amountOut > 0) {
                        await addTreasuryTransaction({
                            date: newSale.date, type: transactionType, description: `${newSale.direction} فاتورة #${newSale.invoiceNumber}`,
                            amountIn: amountIn,
                            amountOut: amountOut, relatedId: newSale.id, paymentMethod: method
                        });
                    }
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

    const [saleToView, setSaleToView] = useState<DailySale | null>(null);

    const handleViewInvoice = (sale: DailySale) => {
        setSaleToView(sale);
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
                    <div className="flex gap-2">
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={(e) => setFilterDate(e.target.value)} 
                            className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        />
                        <button 
                            onClick={() => {
                                let startDate = filterDate;
                                let endDate = filterDate;
                                const filterD = new Date(filterDate);
                                if (filterPeriod === 'weekly') {
                                    const startOfWeek = new Date(filterD);
                                    startOfWeek.setDate(filterD.getDate() - filterD.getDay());
                                    const endOfWeek = new Date(startOfWeek);
                                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                                    startDate = startOfWeek.toISOString().split('T')[0];
                                    endDate = endOfWeek.toISOString().split('T')[0];
                                } else if (filterPeriod === 'monthly') {
                                    const startOfMonth = new Date(filterD.getFullYear(), filterD.getMonth(), 1);
                                    const endOfMonth = new Date(filterD.getFullYear(), filterD.getMonth() + 1, 0);
                                    startDate = startOfMonth.toISOString().split('T')[0];
                                    endDate = endOfMonth.toISOString().split('T')[0];
                                } else if (filterPeriod === 'yearly') {
                                    const startOfYear = new Date(filterD.getFullYear(), 0, 1);
                                    const endOfYear = new Date(filterD.getFullYear(), 11, 31);
                                    startDate = startOfYear.toISOString().split('T')[0];
                                    endDate = endOfYear.toISOString().split('T')[0];
                                }
                                fetchDataByDateRange('dailySales', startDate, endDate);
                            }}
                            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            title="جلب بيانات من الخادم"
                        >
                            <i className="fas fa-cloud-download-alt"></i>
                        </button>
                    </div>
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
                            <th scope="col" className="px-6 py-3">طريقة الدفع</th>
                            <th scope="col" className="px-6 py-3">التوجيه</th>
                            <th scope="col" className="px-6 py-3">البائع</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todaySales.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-gray-500">لا توجد فواتير مسجلة اليوم.</td>
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
                                    <td className="px-6 py-4">{sale.paymentMethod === 'إلكترونى' ? 'إلكتروني' : sale.paymentMethod === 'آجل' ? 'آجل' : 'نقدي'}</td>
                                    <td className="px-6 py-4">{sale.direction}</td>
                                    <td className="px-6 py-4">{sale.sellerName}</td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => handlePrintInvoice(sale)} className="text-green-500 hover:text-green-700 text-lg" aria-label={`طباعة فاتورة ${sale.invoiceNumber}`}><i className="fas fa-print"></i></button>
                                        <button onClick={() => handleViewInvoice(sale)} className="text-blue-600 hover:text-blue-800 text-lg" aria-label={`عرض تفاصيل فاتورة ${sale.invoiceNumber}`}><i className="fas fa-eye"></i></button>
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
            {saleToView && (
                <Modal isOpen={!!saleToView} onClose={() => setSaleToView(null)} title={`تفاصيل الفاتورة #${saleToView.invoiceNumber}`}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><strong>التاريخ:</strong> {formatDateTime(saleToView.date, saleToView.timestamp)}</div>
                            <div><strong>البائع:</strong> {saleToView.sellerName}</div>
                            {saleToView.customerName && <div><strong>العميل:</strong> {saleToView.customerName}</div>}
                            {saleToView.customerPhone && <div><strong>هاتف العميل:</strong> {saleToView.customerPhone}</div>}
                            <div><strong>التوجيه:</strong> {saleToView.direction}</div>
                            <div><strong>طريقة الدفع:</strong> {saleToView.paymentMethod || 'نقدى'}</div>
                        </div>
                        <div className="border-t pt-4">
                            <h4 className="font-bold mb-2">الأصناف</h4>
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="p-2">الصنف</th>
                                        <th className="p-2">الكمية</th>
                                        <th className="p-2">السعر</th>
                                        <th className="p-2">الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {normalizeSaleItems(saleToView).map((item, idx) => (
                                        <tr key={idx} className="border-b dark:border-gray-600">
                                            <td className="p-2">
                                                <ProductName productId={item.productId} fallbackName={item.productName} />
                                                {item.serialNumbers && item.serialNumbers.length > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1">S/N: {item.serialNumbers.join(', ')}</div>
                                                )}
                                            </td>
                                            <td className="p-2">{item.quantity}</td>
                                            <td className="p-2">{formatCurrency(item.unitPrice)}</td>
                                            <td className="p-2">{formatCurrency(item.quantity * item.unitPrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t pt-4 space-y-2 text-sm">
                            <div className="flex justify-between font-bold">
                                <span>الإجمالي:</span>
                                <span>{formatCurrency(saleToView.totalAmount)}</span>
                            </div>
                            {saleToView.discount ? (
                                <div className="flex justify-between text-red-500">
                                    <span>خصم ({saleToView.discount}%):</span>
                                    <span>-{formatCurrency(Math.abs((saleToView.totalAmount / (1 - (saleToView.discount/100))) * (saleToView.discount/100)))}</span>
                                </div>
                            ) : null}
                            {saleToView.cashAmount ? (
                                <div className="flex justify-between">
                                    <span>المدفوع نقداً:</span>
                                    <span>{formatCurrency(saleToView.cashAmount)}</span>
                                </div>
                            ) : null}
                            {saleToView.electronicAmount ? (
                                <div className="flex justify-between">
                                    <span>المدفوع إلكترونياً:</span>
                                    <span>{formatCurrency(saleToView.electronicAmount)}</span>
                                </div>
                            ) : null}
                            {saleToView.remainingDebt ? (
                                <div className="flex justify-between font-bold text-red-600">
                                    <span>المتبقي (آجل):</span>
                                    <span>{formatCurrency(saleToView.remainingDebt)}</span>
                                </div>
                            ) : null}
                        </div>
                        {saleToView.notes && (
                            <div className="border-t pt-4 text-sm">
                                <strong>ملاحظات:</strong> {saleToView.notes}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DailySales;