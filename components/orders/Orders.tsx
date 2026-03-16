import React, { useMemo, useState } from 'react';
import { Order, Role } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import { formatDate, formatCurrency, formatDateTime } from '../../lib/utils';
import useStore from '../../lib/store';
import Modal from '../shared/Modal';
import ConfirmationModal from '../shared/ConfirmationModal';

const OrderDetailsModal: React.FC<{
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
}> = ({ order, isOpen, onClose }) => {
    if (!order) return null;
    const getWhatsAppLink = (phone: string, order: Order) => {
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        if (!cleanPhone.startsWith('20')) cleanPhone = '20' + cleanPhone;

        const locationText = order.locationLink ? `\nرابط الموقع: ${order.locationLink}` : '';
        const message = `مرحباً ${order.customerName}،\nتم استلام طلبك رقم #${order.id}.\nالإجمالي: ${formatCurrency(order.totalAmount)}.${locationText}\nشكراً لتسوقك معنا!`;
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل الطلب رقم #${order.id}`}>
            <div className="space-y-4">
                <div>
                    <h3 className="font-bold">بيانات العميل</h3>
                    <p>الاسم: {order.customerName}</p>
                    <p className="flex items-center gap-2">
                        الهاتف: {order.customerPhone}
                        <a 
                            href={getWhatsAppLink(order.customerPhone, order)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-green-500 hover:text-green-600"
                            title="إرسال عبر واتساب"
                        >
                            <i className="fab fa-whatsapp text-xl"></i>
                        </a>
                    </p>
                    <p>العنوان: {order.customerAddress}</p>
                    {order.locationLink && (
                        <p>
                            <a href={order.locationLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                                <i className="fas fa-map-marker-alt"></i>
                                عرض الموقع على الخريطة
                            </a>
                        </p>
                    )}
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
    const { orders, updateOrderStatus, deleteOrder } = useStore(state => ({
        orders: state.appData?.orders || [],
        updateOrderStatus: state.updateOrderStatus,
        deleteOrder: state.deleteOrder,
    }));
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Filtering and Pagination State
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const sortedOrders = useMemo(() => {
        if (!orders || !Array.isArray(orders)) return [];
        let filtered = [...orders];
        
        if (filterStatus !== 'all') {
            filtered = filtered.filter(order => order.status === filterStatus);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
            filtered = filtered.filter(o => {
                const d = new Date(o.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            });
        } else if (dateFilter === 'week') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            filtered = filtered.filter(o => {
                const d = new Date(o.date);
                d.setHours(0, 0, 0, 0);
                return d >= lastWeek;
            });
        } else if (dateFilter === 'month') {
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            filtered = filtered.filter(o => {
                const d = new Date(o.date);
                d.setHours(0, 0, 0, 0);
                return d >= lastMonth;
            });
        }

        return filtered.sort((a, b) => {
            const getTime = (dateObj: any, dateStr: string) => {
                if (!dateObj) return new Date(dateStr).getTime() || 0;
                // Handle Firestore Timestamp instance
                if (typeof dateObj.toMillis === 'function') return dateObj.toMillis();
                // Handle serialized Timestamp object (e.g. from JSON)
                if (typeof dateObj.seconds === 'number') return dateObj.seconds * 1000;
                // Handle Date object or string
                const time = new Date(dateObj).getTime();
                return isNaN(time) ? (new Date(dateStr).getTime() || 0) : time;
            };
            
            const timeA = getTime(a.createdAt, a.date);
            const timeB = getTime(b.createdAt, b.date);
            
            return timeB - timeA;
        });
    }, [orders, filterStatus, dateFilter]);

    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedOrders.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedOrders, currentPage]);

    const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);

    const statusMap: Record<string, { text: string; color: string }> = {
        pending: { text: 'معلق', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
        confirmed: { text: 'مؤكد', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
        shipped: { text: 'تم الشحن', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
        collected: { text: 'تم التحصيل', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
        cancelled: { text: 'ملغي', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    };

    const handleStatusChange = async (orderId: number | string, newStatus: Order['status']) => {
        await updateOrderStatus(orderId, newStatus);
    };

    const handleDeleteClick = (order: Order) => {
        if (!order.id) {
            alert("هذا الطلب تالف ولا يمكن حذفه. يرجى حذفه يدوياً من قاعدة بيانات Firebase.");
            return;
        }
        setOrderToDelete(order);
    };

    const confirmDelete = async () => {
        if (!orderToDelete) return;
        setIsDeleting(true);
        try {
            await deleteOrder(orderToDelete.id);
            setOrderToDelete(null);
        } catch (error) {
            console.error("Failed to delete order:", error);
            alert(`حدث خطأ أثناء حذف الطلب: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const getDeleteWarningMessage = (order: Order | null): string => {
        if (!order) return '';
        if (['confirmed', 'shipped', 'collected'].includes(order.status)) {
            return 'هذا الطلب تم تأكيده بالفعل. هل أنت متأكد من حذفه؟ سيتم عكس جميع العمليات المرتبطة به (فاتورة البيع، حركة الخزينة، والمخزون).';
        }
        return 'هل أنت متأكد من حذف هذا الطلب؟';
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-receipt" title="إدارة الطلبات" />
            
            {/* Filter Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">تصفية حسب الحالة:</span>
                        <select
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                            className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="all">الكل</option>
                            <option value="pending">معلق</option>
                            <option value="confirmed">مؤكد</option>
                            <option value="shipped">تم الشحن</option>
                            <option value="collected">تم التحصيل</option>
                            <option value="cancelled">ملغي</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الفترة:</span>
                        <select
                            value={dateFilter}
                            onChange={(e) => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
                            className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="all">الكل</option>
                            <option value="today">اليوم</option>
                            <option value="week">هذا الأسبوع</option>
                            <option value="month">هذا الشهر</option>
                        </select>
                    </div>
                </div>
                <div className="text-sm text-gray-500">
                    إجمالي الطلبات: {sortedOrders.length}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">رقم الطلب</th>
                            <th className="px-6 py-3">التاريخ والوقت</th>
                            <th className="px-6 py-3">العميل</th>
                            <th className="px-6 py-3">الإجمالي</th>
                            <th className="px-6 py-3">الدفع</th>
                            <th className="px-6 py-3">الحالة</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedOrders.map((order, index) => {
                            const isCorrupted = !order.id;
                            return (
                            <tr key={order.id || `corrupted-${index}`} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className={`px-6 py-4 font-bold ${isCorrupted ? 'text-red-500' : ''}`}>#{order.id || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(order.date, order.timestamp)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    <div>{order.customerName}</div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                        <a href={`tel:${order.customerPhone}`} className="hover:text-blue-500" title="اتصال">
                                            <i className="fas fa-phone"></i> {order.customerPhone}
                                        </a>
                                        {order.locationLink && (
                                            <a href={order.locationLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="الموقع">
                                                <i className="fas fa-map-marker-alt"></i>
                                            </a>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">{formatCurrency(order.totalAmount)}</td>
                                <td className="px-6 py-4">{order.paymentMethod === 'cod' ? 'عند الاستلام' : 'إلكتروني'}</td>
                                <td className="px-6 py-4">
                                    <select 
                                        value={order.status}
                                        onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                                        className={`p-1 rounded text-xs border-none ${statusMap[order.status]?.color || 'bg-gray-100 text-gray-800'}`}
                                        disabled={isCorrupted}
                                    >
                                        <option value="pending">معلق</option>
                                        <option value="confirmed">مؤكد</option>
                                        <option value="shipped">تم الشحن</option>
                                        <option value="collected">تم التحصيل</option>
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
                                    <button 
                                        onClick={() => handleDeleteClick(order)} 
                                        className="text-red-500 hover:text-red-700 text-lg w-6 text-center" 
                                        title="حذف الطلب"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        )})}
                        {paginatedOrders.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    لا توجد طلبات للعرض
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                    >
                        السابق
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        صفحة {currentPage} من {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                    >
                        التالي
                    </button>
                </div>
            )}

            <OrderDetailsModal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
            />

            {orderToDelete && (
                <ConfirmationModal
                    isOpen={!!orderToDelete}
                    onClose={() => setOrderToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد حذف الطلب"
                    message={getDeleteWarningMessage(orderToDelete)}
                    isLoading={isDeleting}
                />
            )}
        </div>
    );
};

export default Orders;