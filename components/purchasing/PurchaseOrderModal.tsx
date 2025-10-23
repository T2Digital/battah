import React, { useState, useEffect, useMemo, useRef } from 'react';
// Fix: Corrected import path
import { PurchaseOrder, Supplier, Product, PurchaseOrderItem } from '../../types';
import Modal from '../shared/Modal';
import { formatCurrency } from '../../lib/utils';

interface PurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (order: Omit<PurchaseOrder, 'id'> & { id?: number }) => void;
    orderToEdit: PurchaseOrder | null;
    suppliers: Supplier[];
    products: Product[];
}

// FIX: Define a type for editable items to allow empty strings for better UX
type EditablePurchaseOrderItem = Omit<PurchaseOrderItem, 'quantity' | 'purchasePrice'> & { id: number; quantity: number | ''; purchasePrice: number | '' };

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ isOpen, onClose, onSave, orderToEdit, suppliers, products }) => {
    const [formData, setFormData] = useState({
        supplierId: 0,
        orderDate: new Date().toISOString().split('T')[0],
        status: 'معلق' as PurchaseOrder['status'],
        items: [] as EditablePurchaseOrderItem[],
        notes: ''
    });
    
    const [productSearch, setProductSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const lastAddedItemRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (orderToEdit) {
            setFormData({ ...orderToEdit, items: orderToEdit.items.map(item => ({...item, id: item.productId})), notes: orderToEdit.notes || '' });
        } else {
            setFormData({
                supplierId: suppliers[0]?.id || 0,
                orderDate: new Date().toISOString().split('T')[0],
                status: 'معلق',
                items: [],
                notes: ''
            });
        }
    }, [orderToEdit, isOpen, suppliers]);

    useEffect(() => {
        if (lastAddedItemRef.current) {
            lastAddedItemRef.current.focus();
            lastAddedItemRef.current.select();
        }
    }, [formData.items.length]);


    const totalAmount = useMemo(() => {
        return formData.items.reduce((sum, item) => {
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.purchasePrice) || 0;
            return sum + (quantity * price);
        }, 0);
    }, [formData.items]);
    
    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5);
    }, [productSearch, products]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'supplierId' ? Number(value) : value }));
    };
    
    const handleItemChange = (index: number, field: 'quantity' | 'purchasePrice', value: string) => {
        const newItems = [...formData.items];
        const numValue = value === '' ? '' : parseFloat(value); // Allow empty string for editing
        newItems[index] = { ...newItems[index], [field]: numValue };
        setFormData(prev => ({ ...prev, items: newItems }));
    };
    
    const addItem = (product: Product) => {
        setProductSearch('');
        setShowSuggestions(false);
        if (formData.items.some(item => item.productId === product.id)) return;
        const newItem: EditablePurchaseOrderItem = {
            id: product.id, // for react key
            productId: product.id,
            quantity: 1,
            purchasePrice: product.purchasePrice
        };
        setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.items.length === 0) {
            alert('يجب إضافة صنف واحد على الأقل.');
            return;
        }
        // FIX: Update validation to handle empty strings
        if (formData.items.some(item => item.quantity === '' || Number(item.quantity) <= 0 || item.purchasePrice === '' || Number(item.purchasePrice) < 0)) {
            alert('يجب أن تكون كمية وسعر كل صنف أرقاماً صالحة، وأن تكون الكمية أكبر من صفر.');
            return;
        }
        // FIX: Convert items back to numbers before saving
        const finalOrderData = {
            ...formData,
            totalAmount,
            items: formData.items.map(i => ({
                productId: i.productId,
                quantity: Number(i.quantity),
                purchasePrice: Number(i.purchasePrice)
            }))
        };
        onSave(orderToEdit ? { ...finalOrderData, id: orderToEdit.id } : finalOrderData);
    };

    const getProductName = (id: number) => products.find(p => p.id === id)?.name || 'N/A';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={orderToEdit ? 'تعديل أمر شراء' : 'إنشاء أمر شراء جديد'} onSave={handleSubmit}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>المورد *</label>
                        <select name="supplierId" value={formData.supplierId} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>التاريخ *</label>
                        <input type="date" name="orderDate" value={formData.orderDate} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                    </div>
                </div>

                <div className="border-t pt-4 mt-4">
                    <h4 className="font-bold mb-2">الأصناف</h4>
                    <div className="relative mb-2">
                        <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="ابحث لإضافة صنف..." className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        {filteredProducts.length > 0 && showSuggestions && (
                            <ul className="absolute z-10 w-full bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                {filteredProducts.map(p => <li key={p.id} onMouseDown={() => addItem(p)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer">{p.name}</li>)}
                            </ul>
                        )}
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {formData.items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50 rounded">
                                <span className="col-span-5 truncate">{getProductName(item.productId)}</span>
                                <input 
                                    type="number" 
                                    // FIX: Simplify value prop; state now supports empty string
                                    value={item.quantity} 
                                    onChange={e => handleItemChange(index, 'quantity', e.target.value)} 
                                    placeholder="الكمية" 
                                    className="col-span-3 p-1 border rounded dark:bg-gray-600" 
                                    ref={index === formData.items.length - 1 ? lastAddedItemRef : null}
                                />
                                <input 
                                    type="number" 
                                    // FIX: Simplify value prop; state now supports empty string
                                    value={item.purchasePrice} 
                                    onChange={e => handleItemChange(index, 'purchasePrice', e.target.value)} 
                                    placeholder="السعر" 
                                    className="col-span-3 p-1 border rounded dark:bg-gray-600" 
                                    step="0.01"
                                />
                                <button type="button" onClick={() => removeItem(index)} className="col-span-1 text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                            </div>
                        ))}
                    </div>
                </div>
                
                 <div className="text-right font-bold text-xl mt-4">الإجمالي: {formatCurrency(totalAmount)}</div>

                <div>
                    <label>ملاحظات</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea>
                </div>
            </div>
        </Modal>
    );
};

export default PurchaseOrderModal;