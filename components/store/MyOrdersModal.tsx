

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

const statusMap: Record<Order['status'], { text: string; color: string; icon: string; bg: string }> = {
    pending: { text: 'قيد المراجعة', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'fa-clock' },
    confirmed: { text: 'تم التأكيد', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'fa-check-circle' },
    shipped: { text: 'جاري التوصيل', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'fa-truck' },
    cancelled: { text: 'ملغي', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', icon: 'fa-times-circle' },
    collected: { text: 'تم التسليم', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'fa-box-open' },
    returned: { text: 'مرتجع', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', icon: 'fa-undo' },
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
        <Modal isOpen={isOpen} onClose={handleClose} title="تتبع طلباتي">
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-3 items-start">
                    <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                    <div>
                        <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 mb-1">كيف أتتبع طلبي؟</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-400">أدخل رقم الهاتف الذي استخدمته عند إتمام الطلب لعرض حالة جميع طلباتك السابقة والحالية.</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2 relative">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <i className="fas fa-phone text-gray-400"></i>
                        </div>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="رقم الهاتف (مثال: 01012345678)"
                            required
                            dir="ltr"
                            className="block w-full pl-3 pr-10 py-3 rounded-xl border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-800 focus:border-primary focus:ring-primary transition-colors text-left"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading || !phone.trim()} 
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center gap-2 hover:bg-primary-dark transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                        <span className="hidden sm:inline">بحث</span>
                    </button>
                </form>

                <div className="min-h-[250px] relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 rounded-xl">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">جاري البحث عن طلباتك...</p>
                        </div>
                    )}
                    
                    {!isLoading && hasSearched && orders.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <i className="fas fa-box-open text-2xl text-gray-400"></i>
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-1">لا توجد طلبات</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px]">لم نتمكن من العثور على أي طلبات مرتبطة برقم الهاتف المدخل.</p>
                        </div>
                    )}

                    {!isLoading && orders.length > 0 && (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                                <i className="fas fa-history text-primary"></i>
                                سجل الطلبات ({orders.length})
                            </h4>
                            {orders.map(order => {
                                const statusInfo = statusMap[order.status];
                                return (
                                    <div key={order.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        {/* Order Header */}
                                        <div className="p-4 border-b border-gray-50 dark:border-gray-700/50 flex flex-wrap justify-between items-center gap-2 bg-gray-50/50 dark:bg-gray-800/50">
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">رقم الطلب</p>
                                                <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">#{String(order.id).slice(-6).toUpperCase()}</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">تاريخ الطلب</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(order.date)}</p>
                                            </div>
                                            <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                                                <i className={`fas ${statusInfo.icon}`}></i>
                                                <span>{statusInfo.text}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Order Items */}
                                        <div className="p-4">
                                            <div className="space-y-2 mb-4">
                                                {order.items.map(item => (
                                                    <div key={item.productId} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>
                                                            <span className="text-gray-700 dark:text-gray-300 truncate">{item.productName}</span>
                                                            <span className="text-gray-400 text-xs whitespace-nowrap">x{item.quantity}</span>
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap mr-4">
                                                            {formatCurrency(item.unitPrice * item.quantity)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {/* Order Footer */}
                                            <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">الإجمالي</span>
                                                <span className="font-black text-lg text-primary dark:text-primary-light">{formatCurrency(order.totalAmount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default MyOrdersModal;