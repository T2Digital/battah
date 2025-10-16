
import React, { useState } from 'react';
// Fix: Corrected import path
import { PurchaseOrder, Product } from '../../types';
import Modal from '../shared/Modal';

interface ReceiveOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (orderId: number, receivedItems: { productId: number; quantity: number }[], receivedInto: 'main' | 'branch1' | 'branch2' | 'branch3') => void;
    order: PurchaseOrder;
    products: Product[];
}

const ReceiveOrderModal: React.FC<ReceiveOrderModalProps> = ({ isOpen, onClose, onConfirm, order, products }) => {
    const [receivedItems, setReceivedItems] = useState(order.items);
    const [receivedInto, setReceivedInto] = useState<'main' | 'branch1' | 'branch2' | 'branch3'>('main');

    const handleQuantityChange = (index: number, quantity: number) => {
        const newItems = [...receivedItems];
        newItems[index] = { ...newItems[index], quantity };
        setReceivedItems(newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(order.id, receivedItems, receivedInto);
    };

    const getProductName = (id: number) => products.find(p => p.id === id)?.name || 'N/A';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`استلام أمر شراء PO-${order.id.toString().padStart(4, '0')}`} onSave={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label>استلام في مخزن *</label>
                    <select value={receivedInto} onChange={e => setReceivedInto(e.target.value as any)} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                        <option value="main">المخزن الرئيسي</option>
                        <option value="branch1">فرع 1</option>
                        <option value="branch2">فرع 2</option>
                        <option value="branch3">فرع 3</option>
                    </select>
                </div>

                <div className="border-t pt-4 mt-4">
                    <h4 className="font-bold mb-2">تأكيد الكميات المستلمة</h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {receivedItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                                <span>{getProductName(item.productId)}</span>
                                <div className="flex items-center gap-2">
                                    <label>الكمية:</label>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={e => handleQuantityChange(index, Number(e.target.value))}
                                        className="w-20 p-1 border rounded dark:bg-gray-600"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ReceiveOrderModal;
