import React, { useState, useMemo } from 'react';
import { Product, Supplier, PurchaseOrder } from '../../types';
import Modal from '../shared/Modal';
import { formatCurrency, formatDate } from '../../lib/utils';

interface PriceComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    suppliers: Supplier[];
    purchaseOrders: PurchaseOrder[];
}

const PriceComparisonModal: React.FC<PriceComparisonModalProps> = ({ isOpen, onClose, products, suppliers, purchaseOrders }) => {
    const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

    const priceHistory = useMemo(() => {
        if (!selectedProductId) return [];

        const history: { supplierName: string; price: number; date: string; orderId: number }[] = [];

        purchaseOrders.forEach(order => {
            if (order.status === 'ملغي') return;
            const item = order.items.find(i => i.productId === Number(selectedProductId));
            if (item) {
                const supplier = suppliers.find(s => s.id === order.supplierId);
                history.push({
                    supplierName: supplier?.name || 'غير معروف',
                    price: item.purchasePrice,
                    date: order.orderDate,
                    orderId: order.id
                });
            }
        });

        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedProductId, purchaseOrders, suppliers]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="مقارنة أسعار الموردين">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اختر المنتج</label>
                    <select 
                        value={selectedProductId} 
                        onChange={(e) => setSelectedProductId(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">-- اختر منتج --</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {selectedProductId && (
                    <div className="mt-6">
                        <h4 className="font-bold mb-4 text-lg">سجل أسعار الشراء</h4>
                        {priceHistory.length > 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                        <tr>
                                            <th className="px-4 py-3">التاريخ</th>
                                            <th className="px-4 py-3">المورد</th>
                                            <th className="px-4 py-3">السعر</th>
                                            <th className="px-4 py-3">رقم الأمر</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {priceHistory.map((entry, index) => (
                                            <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <td className="px-4 py-3 whitespace-nowrap" dir="ltr">{formatDate(entry.date)}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{entry.supplierName}</td>
                                                <td className="px-4 py-3 font-bold text-primary">{formatCurrency(entry.price)}</td>
                                                <td className="px-4 py-3">PO-{entry.orderId.toString().padStart(4, '0')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <i className="fas fa-info-circle text-2xl mb-2"></i>
                                <p>لا يوجد سجل مشتريات لهذا المنتج.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PriceComparisonModal;
