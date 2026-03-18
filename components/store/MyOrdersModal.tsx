

import React, { useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Order } from '../../types';
import Modal from '../shared/Modal';
import { formatCurrency, formatDate } from '../../lib/utils';

interface MyOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const statusMap: Record<Order['status'], { text: string; color: string }> = {
    pending: { text: 'معلق', color: 'text-yellow-500' },
    confirmed: { text: 'مؤكد', color: 'text-blue-500' },
    shipped: { text: 'تم الشحن', color: 'text-green-500' },
    cancelled: { text: 'ملغي', color: 'text-red-500' },
    collected: { text: 'تم الاستلام', color: 'text-purple-500' },
};

const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose }) => {
    const [phone, setPhone] = useState('');
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone.trim()) {
            alert('يرجى إدخال رقم الهاتف.');
            return;
        }
        setIsLoading(true);
        setHasSearched(true);
        setOrders([]);
        try {
            // Query for orders associated with the phone number
            const q = query(
                collection(db, "orders"), 
                where("customerPhone", "==", phone.trim())
            );
            const querySnapshot = await getDocs(q);
            let foundOrders = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
            
            // Sort client-side by creation date
            foundOrders.sort((a, b) => {
                const getTime = (dateVal: any) => {
                    if (!dateVal) return 0;
                    if (typeof dateVal.toMillis === 'function') return dateVal.toMillis();
                    if (typeof dateVal === 'string' || typeof dateVal === 'number') return new Date(dateVal).getTime();
                    if (dateVal instanceof Date) return dateVal.getTime();
                    if (dateVal.seconds) return dateVal.seconds * 1000;
                    return 0;
                };
                return getTime(b.createdAt) - getTime(a.createdAt);
            });

            setOrders(foundOrders);
        } catch (error: any) {
            if (error.message?.includes('Missing or insufficient permissions')) {
                handleFirestoreError(error, OperationType.LIST, 'orders');
            }
            console.error("Error searching for orders:", error);
            alert(`حدث خطأ أثناء البحث عن طلباتك: ${error.message || 'تأكد من تفعيل الدخول المجهول (Anonymous Auth) في Firebase أو تحقق من صلاحيات Firestore.'}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Reset state when modal is closed
    const handleClose = () => {
        setPhone('');
        setOrders([]);
        setHasSearched(false);
        setIsLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="متابعة طلباتك">
            <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="أدخل رقم هاتفك المسجل بالطلب"
                        required
                        className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                    <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md disabled:opacity-50">
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                        <span>بحث</span>
                    </button>
                </form>

                <div className="border-t dark:border-gray-600 pt-4 mt-4 min-h-[200px]">
                    {isLoading && (
                        <div className="text-center p-8">
                            <i className="fas fa-spinner fa-spin text-3xl text-primary"></i>
                            <p>جاري البحث...</p>
                        </div>
                    )}
                    {!isLoading && hasSearched && orders.length === 0 && (
                        <div className="text-center p-8">
                            <i className="fas fa-box-open text-4xl text-gray-400 mb-4"></i>
                            <h4 className="font-bold">لا توجد طلبات</h4>
                            <p className="text-gray-500">لم نتمكن من العثور على أي طلبات مرتبطة بهذا الرقم.</p>
                        </div>
                    )}
                    {!isLoading && orders.length > 0 && (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {orders.map(order => (
                                <div key={order.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex justify-between items-center font-bold text-sm">
                                        <span>طلب بتاريخ: {formatDate(order.date)}</span>
                                        <span className={statusMap[order.status].color}>{statusMap[order.status].text}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <ul className="text-xs list-disc pr-4 text-gray-600 dark:text-gray-300">
                                            {order.items.map(item => <li key={item.productId}>{item.productName} (x{item.quantity})</li>)}
                                        </ul>
                                        <span className="font-bold">{formatCurrency(order.totalAmount)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default MyOrdersModal;