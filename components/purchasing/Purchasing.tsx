import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, Product } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import PurchaseOrderModal from './PurchaseOrderModal';
import ReceiveOrderModal from './ReceiveOrderModal';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatDate, formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';

const Purchasing: React.FC = () => {
    const { 
        products, 
        setProducts,
        purchaseOrders,
        addPurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder,
        suppliers
    } = useStore(state => ({
        products: state.appData?.products || [],
        setProducts: state.setProducts,
        purchaseOrders: state.appData?.purchaseOrders || [],
        addPurchaseOrder: state.addPurchaseOrder,
        updatePurchaseOrder: state.updatePurchaseOrder,
        deletePurchaseOrder: state.deletePurchaseOrder,
        suppliers: state.appData?.suppliers || [],
    }));

    const [isOrderModalOpen, setOrderModalOpen] = useState(false);
    const [isReceiveModalOpen, setReceiveModalOpen] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
    const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleConfirmReception = (orderId: number, receivedItems: { productId: number; quantity: number }[], receivedInto: 'main' | 'branch1' | 'branch2' | 'branch3') => {
        const newProducts = products.map(p => {
            const receivedItem = receivedItems.find(item => item.productId === p.id);
            if (receivedItem) {
                const newStock = { ...p.stock };
                newStock[receivedInto] += receivedItem.quantity;
                return { ...p, stock: newStock };
            }
            return p;
        });
        setProducts(newProducts);

        updatePurchaseOrder(orderId, { status: 'مكتمل' });
        setReceiveModalOpen(false);
    };

    const ordersWithDetails = useMemo(() => {
        return purchaseOrders
            .map(po => ({ ...po, supplierName: getSupplierName(po.supplierId) }))
            .sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [purchaseOrders, suppliers]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-shopping-cart" title="المشتريات">
                <button onClick={handleAddOrder} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    إنشاء أمر شراء
                </button>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">رقم الأمر</th>
                            <th className="px-6 py-3">التاريخ</th>
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
                                <td className="px-6 py-4">{formatDate(po.orderDate)}</td>
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
                />
            )}

        </div>
    );
};

export default Purchasing;