
import React, { useMemo, useState } from 'react';
import { Order } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import { formatDate, formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';
import Modal from '../shared/Modal';

const OrderDetailsModal: React.FC<{
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
}> = ({ order, isOpen, onClose }) => {
    if (!order) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل الطلب رقم #${order.id}`}>
            <div className="space-y-4">
                <div>
                    <h3 className="font-bold">بيانات العميل</h3>
                    <p>الاسم: {order.customerName}</p>
                    <p>الهاتف: {order.customerPhone}</p>
                    <p>العنوان: {order.customerAddress}</p>
                </div>
                <div>
                    <h3 className="font-bold">المنتجات</h3>
                    <ul>
                        {order.items.map(item => (
                             <li key={item.productId} className="flex justify-between">
                                <span>{item.productName} (x{item.quantity})</span>
                                <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="font-bold text-lg flex justify-between border-t pt-2">
                    <span>الإجمالي:</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                </div>
                 <div>
                    <h3 className="font-bold">طريقة الدفع</h3>
                    <p>{order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'دفع إلكتروني'}</p>
                </div>
                {order.paymentProofUrl && (
                    <div>
                        <h3 className="font-bold">إثبات الدفع</h3>
                        <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            عرض صورة الإيصال
                        </a>
                        <img src={order.paymentProofUrl} alt="Payment Proof" className="mt-2 rounded-lg max-w-full h-auto"/>
                    </div>
                )}
            </div>
        </Modal>
    );
};


const Orders: React.FC = () => {
    const { orders, updateOrderStatus } = useStore(state => ({
        orders: state.appData?.orders || [],
        updateOrderStatus: state.updateOrderStatus,
    }));
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders]);

    const statusMap: Record<Order['status'], { text: string; color: string }> = {
        pending: { text: 'معلق', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
        confirmed: { text: 'مؤكد', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
        shipped: { text: 'تم الشحن', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
        cancelled: { text: 'ملغي', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    };

    const handleStatusChange = async (orderId: number, newStatus: Order['status']) => {
        await updateOrderStatus(orderId, newStatus);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-receipt" title="إدارة الطلبات" />
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">رقم الطلب</th>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">العميل</th>
                            <th className="px-6 py-3">الإجمالي</th>
                            <th className="px-6 py-3">الدفع</th>
                            <th className="px-6 py-3">الحالة</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.map(order => (
                            <tr key={order.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-bold">#{order.id}</td>
                                <td className="px-6 py-4">{formatDate(order.date)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.customerName}</td>
                                <td className="px-6 py-4">{formatCurrency(order.totalAmount)}</td>
                                <td className="px-6 py-4">{order.paymentMethod === 'cod' ? 'عند الاستلام' : 'إلكتروني'}</td>
                                <td className="px-6 py-4">
                                    <select 
                                        value={order.status}
                                        onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                                        className={`p-1 rounded text-xs border-none ${statusMap[order.status].color}`}
                                    >
                                        <option value="pending">معلق</option>
                                        <option value="confirmed">مؤكد</option>
                                        <option value="shipped">تم الشحن</option>
                                        <option value="cancelled">ملغي</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => setSelectedOrder(order)} className="text-blue-500 hover:text-blue-700 text-lg" title="عرض التفاصيل">
                                        <i className="fas fa-eye"></i>
                                    </button>
                                     {order.paymentProofUrl && <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-700 text-lg" title="عرض إيصال الدفع">
                                        <i className="fas fa-file-invoice-dollar"></i>
                                    </a>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <OrderDetailsModal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
            />
        </div>
    );
};

export default Orders;
