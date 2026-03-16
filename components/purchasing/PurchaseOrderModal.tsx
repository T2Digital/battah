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
    addProduct?: (product: Omit<Product, 'id'>) => Promise<Product>;
    isDirectStatement?: boolean;
    onSaveDirect?: (order: Omit<PurchaseOrder, 'id'> & { id?: number }, branch: 'main' | 'branch1' | 'branch2' | 'branch3') => void;
    isViewOnly?: boolean;
    isReturn?: boolean;
}

type EditablePurchaseOrderItem = Omit<PurchaseOrderItem, 'quantity' | 'purchasePrice'> & { id: number; quantity: number | ''; purchasePrice: number | '' };

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ isOpen, onClose, onSave, orderToEdit, suppliers, products, addProduct, isDirectStatement, onSaveDirect, isViewOnly, isReturn }) => {
    const [formData, setFormData] = useState({
        supplierId: 0,
        orderDate: new Date().toISOString().split('T')[0],
        status: (isReturn ? 'مكتمل' : 'معلق') as PurchaseOrder['status'],
        type: (isReturn ? 'مرتجع' : 'شراء') as PurchaseOrder['type'],
        items: [] as EditablePurchaseOrderItem[],
        notes: ''
    });
    const [receiveBranch, setReceiveBranch] = useState<'main' | 'branch1' | 'branch2' | 'branch3'>('main');
    
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

    const handleAddNewProduct = async () => {
        if (!productSearch.trim() || !addProduct) return;
        
        try {
            const newProductData: Omit<Product, 'id'> = {
                name: productSearch.trim(),
                sku: `NEW-${Date.now()}`,
                mainCategory: 'قطع غيار',
                category: 'غير مصنف',
                brand: 'غير محدد',
                purchasePrice: 0,
                sellingPrice: 0,
                stock: { main: 0, branch1: 0, branch2: 0, branch3: 0 },
                images: []
            };
            
            const addedProduct = await addProduct(newProductData);
            addItem(addedProduct);
        } catch (error) {
            console.error("Failed to add new product:", error);
            alert("حدث خطأ أثناء إضافة المنتج الجديد.");
        }
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
        if (formData.items.some(item => item.quantity === '' || Number(item.quantity) <= 0 || item.purchasePrice === '' || Number(item.purchasePrice) < 0)) {
            alert('يجب أن تكون كمية وسعر كل صنف أرقاماً صالحة، وأن تكون الكمية أكبر من صفر.');
            return;
        }
        const finalOrderData = {
            ...formData,
            status: isDirectStatement ? 'مكتمل' as const : formData.status,
            totalAmount,
            items: formData.items.map(i => ({
                productId: i.productId,
                quantity: Number(i.quantity),
                purchasePrice: Number(i.purchasePrice)
            }))
        };
        if (isDirectStatement && onSaveDirect) {
            onSaveDirect(orderToEdit ? { ...finalOrderData, id: orderToEdit.id } : finalOrderData, receiveBranch);
        } else {
            onSave(orderToEdit ? { ...finalOrderData, id: orderToEdit.id } : finalOrderData);
        }
    };

    const getProductName = (id: number) => products.find(p => p.id === id)?.name || 'N/A';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isViewOnly ? 'تفاصيل أمر الشراء' : (isReturn ? 'إضافة مردودات مشتريات' : (isDirectStatement ? 'إضافة بيان بضاعة مباشر' : (orderToEdit ? 'تعديل أمر شراء' : 'إنشاء أمر شراء جديد')))} onSave={isViewOnly ? undefined : handleSubmit}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>المورد *</label>
                        <select name="supplierId" value={formData.supplierId} onChange={handleChange} required disabled={isViewOnly} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 disabled:opacity-50">
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>التاريخ *</label>
                        <input type="date" name="orderDate" value={formData.orderDate} onChange={handleChange} required disabled={isViewOnly} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 disabled:opacity-50" />
                    </div>
                    {isDirectStatement && (
                        <div className="md:col-span-2">
                            <label>استلام في الفرع *</label>
                            <select value={receiveBranch} onChange={e => setReceiveBranch(e.target.value as any)} disabled={isViewOnly} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 disabled:opacity-50">
                                <option value="main">الرئيسي</option>
                                <option value="branch1">فرع 1</option>
                                <option value="branch2">فرع 2</option>
                                <option value="branch3">فرع 3</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="border-t pt-4 mt-4">
                    <h4 className="font-bold mb-2">الأصناف</h4>
                    {!isViewOnly && (
                        <div className="relative mb-2">
                            <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="ابحث لإضافة صنف..." className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                            {showSuggestions && (productSearch.trim() !== '' || filteredProducts.length > 0) && (
                                <ul className="absolute z-10 w-full bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                    {filteredProducts.map(p => <li key={p.id} onMouseDown={() => addItem(p)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer">{p.name}</li>)}
                                    {productSearch.trim() !== '' && !filteredProducts.some(p => p.name.toLowerCase() === productSearch.trim().toLowerCase()) && addProduct && (
                                        <li onMouseDown={handleAddNewProduct} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer text-primary font-bold">
                                            + إضافة "{productSearch.trim()}" كمنتج جديد
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                    )}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {formData.items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50 rounded">
                                <span className="col-span-5 truncate">{getProductName(item.productId)}</span>
                                <input 
                                    type="number" 
                                    value={item.quantity === 0 ? '' : item.quantity} 
                                    onChange={e => handleItemChange(index, 'quantity', e.target.value)} 
                                    placeholder="الكمية" 
                                    className="col-span-3 p-1 border rounded dark:bg-gray-600 disabled:opacity-50" 
                                    ref={index === formData.items.length - 1 ? lastAddedItemRef : null}
                                    disabled={isViewOnly}
                                />
                                <input 
                                    type="number" 
                                    value={item.purchasePrice === 0 ? '' : item.purchasePrice} 
                                    onChange={e => handleItemChange(index, 'purchasePrice', e.target.value)} 
                                    placeholder="السعر" 
                                    className="col-span-3 p-1 border rounded dark:bg-gray-600 disabled:opacity-50" 
                                    step="0.01"
                                    disabled={isViewOnly}
                                />
                                {!isViewOnly && (
                                    <button type="button" onClick={() => removeItem(index)} className="col-span-1 text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                
                 <div className="text-right font-bold text-xl mt-4">الإجمالي: {formatCurrency(totalAmount)}</div>

                <div>
                    <label>ملاحظات</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} disabled={isViewOnly} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 disabled:opacity-50"></textarea>
                </div>
            </div>
        </Modal>
    );
};

export default PurchaseOrderModal;