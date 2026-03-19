import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, Product, PurchaseOrderItem } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import PurchaseOrderModal from './PurchaseOrderModal';
import ReceiveOrderModal from './ReceiveOrderModal';
import PriceComparisonModal from './PriceComparisonModal';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatDate, formatCurrency, formatDateTime } from '../../lib/utils';
import useStore from '../../lib/store';

const Purchasing: React.FC = () => {
    const { 
        products, 
        setProducts,
        addProduct,
        updateProduct,
        updateProductStock,
        purchaseOrders,
        addPurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder,
        suppliers,
        fetchDataByDateRange
    } = useStore(state => ({
        products: state.appData?.products || [],
        setProducts: state.setProducts,
        addProduct: state.addProduct,
        updateProduct: state.updateProduct,
        updateProductStock: state.updateProductStock,
        purchaseOrders: state.appData?.purchaseOrders || [],
        addPurchaseOrder: state.addPurchaseOrder,
        updatePurchaseOrder: state.updatePurchaseOrder,
        deletePurchaseOrder: state.deletePurchaseOrder,
        suppliers: state.appData?.suppliers || [],
        fetchDataByDateRange: state.fetchDataByDateRange
    }));

    const [isOrderModalOpen, setOrderModalOpen] = useState(false);
    const [isReceiveModalOpen, setReceiveModalOpen] = useState(false);
    const [isPriceComparisonModalOpen, setPriceComparisonModalOpen] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
    const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
    const [filterPeriod, setFilterPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');

    const getSupplierName = (id: number) => suppliers.find(s => s.id === id)?.name || 'غير معروف';

    const handleAddOrder = () => {
        setOrderToEdit(null);
        setOrderModalOpen(true);
    };

    const handleEditOrder = (order: PurchaseOrder) => {
        setOrderToEdit(order);
        setOrderModalOpen(true);
    };
    
    const handleReceiveOrder = (order: PurchaseOrder) => {
        setOrderToReceive(order);
        setReceiveModalOpen(true);
    };

    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;
        setIsDeleting(true);
        try {
            await deletePurchaseOrder(orderToDelete.id);
            setOrderToDelete(null);
        } catch (error) {
            console.error("Failed to delete purchase order:", error);
            alert(`فشل حذف أمر الشراء: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleSaveOrder = (order: Omit<PurchaseOrder, 'id'> & { id?: number }) => {
        if (order.id) {
            updatePurchaseOrder(order.id, order);
        } else {
            addPurchaseOrder(order);
        }
        setOrderModalOpen(false);
    };

    const handleConfirmReception = async (orderId: number, receivedItems: PurchaseOrderItem[], receivedInto: 'main' | 'branch1' | 'branch2' | 'branch3') => {
        await updatePurchaseOrder(orderId, { 
            status: 'مكتمل', 
            items: receivedItems,
            branch: receivedInto
        });
        setReceiveModalOpen(false);
    };

    const ordersWithDetails = useMemo(() => {
        return purchaseOrders
            .filter(po => {
                let dateMatch = true;
                if (filters.dateFrom && filters.dateTo) {
                    const poDate = new Date(po.orderDate);
                    poDate.setHours(0, 0, 0, 0);
                    const from = new Date(filters.dateFrom);
                    from.setHours(0, 0, 0, 0);
                    const to = new Date(filters.dateTo);
                    to.setHours(0, 0, 0, 0);
                    dateMatch = poDate >= from && poDate <= to;
                }
                return dateMatch;
            })
            .map(po => ({ ...po, supplierName: getSupplierName(po.supplierId) }))
            .sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [purchaseOrders, suppliers, filters]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-shopping-cart" title="المشتريات">
                <div className="flex gap-2">
                    <button onClick={() => setPriceComparisonModalOpen(true)} className="px-4 py-2 bg-secondary text-white rounded-lg flex items-center gap-2 hover:bg-secondary-dark transition shadow-md">
                        <i className="fas fa-balance-scale"></i>
                        مقارنة الأسعار
                    </button>
                    <button onClick={handleAddOrder} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                        <i className="fas fa-plus"></i>
                        إنشاء أمر شراء
                    </button>
                </div>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 flex-wrap">
                <select value={filterPeriod} onChange={e => {
                    setFilterPeriod(e.target.value as any);
                    if (e.target.value === 'daily') {
                        setFilters(f => ({ ...f, dateFrom: new Date().toISOString().split('T')[0], dateTo: new Date().toISOString().split('T')[0] }));
                    } else if (e.target.value === 'monthly') {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), now.getMonth(), 1);
                        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        setFilters(f => ({ ...f, dateFrom: start.toISOString().split('T')[0], dateTo: end.toISOString().split('T')[0] }));
                    } else if (e.target.value === 'yearly') {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), 0, 1);
                        const end = new Date(now.getFullYear(), 11, 31);
                        setFilters(f => ({ ...f, dateFrom: start.toISOString().split('T')[0], dateTo: end.toISOString().split('T')[0] }));
                    }
                }} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="daily">يومي</option>
                    <option value="monthly">شهري</option>
                    <option value="yearly">سنوي</option>
                </select>
                <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500">من:</span>
                    <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500">إلى:</span>
                    <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <button 
                    onClick={() => {
                        if (filters.dateFrom && filters.dateTo) {
                            fetchDataByDateRange('purchaseOrders', filters.dateFrom, filters.dateTo);
                        }
                    }}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    title="جلب بيانات من الخادم"
                >
                    <i className="fas fa-cloud-download-alt"></i>
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">رقم الأمر</th>
                            <th className="px-6 py-3">التاريخ والوقت</th>
                            <th className="px-6 py-3">المورد</th>
                            <th className="px-6 py-3">الإجمالي</th>
                            <th className="px-6 py-3">الحالة</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ordersWithDetails.map(po => (
                            <tr key={po.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-bold">PO-{po.id.toString().padStart(4, '0')}</td>
                                <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(po.orderDate, po.timestamp)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{po.supplierName}</td>
                                <td className="px-6 py-4">{formatCurrency(po.totalAmount)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        po.status === 'مكتمل' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                        po.status === 'ملغي' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                    }`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex gap-3">
                                    {po.status === 'معلق' && (
                                        <button onClick={() => handleReceiveOrder(po)} className="text-green-500 hover:text-green-700 text-lg" title="استلام البضاعة"><i className="fas fa-check-circle"></i></button>
                                    )}
                                    <button onClick={() => handleEditOrder(po)} className="text-blue-500 hover:text-blue-700 text-lg" title="تعديل"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => setOrderToDelete(po)} className="text-red-500 hover:text-red-700 text-lg w-6 text-center" title="حذف">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {isOrderModalOpen && (
                <PurchaseOrderModal 
                    isOpen={isOrderModalOpen}
                    onClose={() => setOrderModalOpen(false)}
                    onSave={handleSaveOrder}
                    orderToEdit={orderToEdit}
                    suppliers={suppliers}
                    products={products}
                    addProduct={addProduct}
                />
            )}
             {isReceiveModalOpen && orderToReceive && (
                <ReceiveOrderModal 
                    isOpen={isReceiveModalOpen}
                    onClose={() => setReceiveModalOpen(false)}
                    onConfirm={handleConfirmReception}
                    order={orderToReceive}
                    products={products}
                />
            )}
            
            {orderToDelete && (
                <ConfirmationModal
                    isOpen={!!orderToDelete}
                    onClose={() => setOrderToDelete(null)}
                    onConfirm={confirmDeleteOrder}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف أمر الشراء رقم "PO-${orderToDelete.id.toString().padStart(4, '0')}"؟`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}

            {isPriceComparisonModalOpen && (
                <PriceComparisonModal
                    isOpen={isPriceComparisonModalOpen}
                    onClose={() => setPriceComparisonModalOpen(false)}
                    products={products}
                    suppliers={suppliers}
                    purchaseOrders={purchaseOrders}
                />
            )}

        </div>
    );
};

export default Purchasing;