import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DailySale, User, Product, Branch, SaleItem, Role } from '../../types';
import { formatCurrency, normalizeSaleItems } from '../../lib/utils';
import Modal from '../shared/Modal';

type EditableSaleItem = SaleItem & { productName: string; stock: number };

interface DailySaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (sale: Omit<DailySale, 'id'> & { id?: number }) => void;
    currentUser: User;
    existingSale: DailySale | null;
    dailySales: DailySale[];
    products: Product[];
}

const DailySaleModal: React.FC<DailySaleModalProps> = ({ isOpen, onClose, onSave, currentUser, existingSale, dailySales, products }) => {
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [items, setItems] = useState<EditableSaleItem[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [direction, setDirection] = useState<DailySale['direction']>('بيع');
    const [branchSoldFrom, setBranchSoldFrom] = useState<Branch>(currentUser.branch);
    const [notes, setNotes] = useState('');
    
    const [productSearch, setProductSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const lastAddedItemRef = useRef<HTMLInputElement>(null);

    const branchNames: Record<Branch, string> = {
        main: 'المخزن الرئيسي',
        branch1: 'فرع 1',
        branch2: 'فرع 2',
        branch3: 'فرع 3',
    };

    const getStockBreakdown = (product: Product): string => {
        return `رصيد: الرئيسي(${product.stock.main}), ف1(${product.stock.branch1}), ف2(${product.stock.branch2}), ف3(${product.stock.branch3})`;
    };

    useEffect(() => {
        const generateInvoiceNumber = () => {
            const today = new Date();
            const prefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const todaySalesCount = dailySales.filter(s => s.invoiceNumber.startsWith(prefix)).length;
            return `${prefix}${String(todaySalesCount + 1).padStart(3, '0')}`;
        };

        if (existingSale) {
            setInvoiceNumber(existingSale.invoiceNumber);
            setDate(existingSale.date);
            setDirection(existingSale.direction);
            setBranchSoldFrom(existingSale.branchSoldFrom);
            setNotes(existingSale.notes || '');
            const itemsToEdit = normalizeSaleItems(existingSale);
            const editableItems = itemsToEdit.map(item => {
                const product = products.find(p => p.id === item.productId);
                return {
                    ...item,
                    productName: product?.name || 'صنف محذوف',
                    stock: product?.stock[existingSale.branchSoldFrom] || 0,
                };
            });
            setItems(editableItems);
        } else {
            setInvoiceNumber(generateInvoiceNumber());
            setDate(new Date().toISOString().split('T')[0]);
            setDirection('بيع');
            setBranchSoldFrom(currentUser.branch);
            setNotes('');
            setItems([]);
        }
    }, [existingSale, dailySales, currentUser, products, isOpen]);

    useEffect(() => {
        if (lastAddedItemRef.current) {
            lastAddedItemRef.current.focus();
            lastAddedItemRef.current.select();
        }
    }, [items.length]);

    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    }, [items]);
    
    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        return products
            .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
            .slice(0, 5);
    }, [productSearch, products]);

    const handleProductSelect = (product: Product) => {
        if (items.some(item => item.productId === product.id)) return;
        const newItem: EditableSaleItem = {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: product.sellingPrice,
            itemType: product.category as SaleItem['itemType'] || 'أخرى',
            stock: product.stock[branchSoldFrom],
        };
        setItems(prev => [...prev, newItem]);
        setProductSearch('');
        setShowSuggestions(false);
    };

    const handleItemChange = (index: number, field: 'quantity' | 'unitPrice', value: number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) {
            alert('يجب إضافة صنف واحد على الأقل للفاتورة.');
            return;
        }

        for (const item of items) {
             const product = products.find(p => p.id === item.productId);
             if (product && item.quantity > product.stock[branchSoldFrom] && direction === 'بيع') {
                alert(`الكمية المطلوبة (${item.quantity}) من صنف "${item.productName}" أكبر من الرصيد المتاح في هذا الفرع (${product.stock[branchSoldFrom]})`);
                return;
             }
        }

        const saleData = {
            date, invoiceNumber, direction, branchSoldFrom, notes, totalAmount,
            sellerId: currentUser.id,
            sellerName: currentUser.name,
            source: 'المحل' as const,
            items: items.map(({ productName, stock, ...rest }) => rest), // Remove productName & stock before saving
        };
        onSave(existingSale ? { ...saleData, id: existingSale.id } : saleData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingSale ? 'تعديل فاتورة' : 'فاتورة جديدة'} onSave={handleSubmit}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label>التاريخ</label><input type="date" value={date} readOnly className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 bg-gray-100" /></div>
                    <div><label>رقم الفاتورة</label><input type="text" value={invoiceNumber} readOnly className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 bg-gray-100" /></div>
                    <div><label>الاتجاه</label><select value={direction} onChange={e => setDirection(e.target.value as DailySale['direction'])} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"><option>بيع</option><option>مرتجع</option><option>تبديل</option><option>ضمان</option></select></div>
                    <div>
                        <label>البيع من فرع</label>
                        <select 
                            value={branchSoldFrom} 
                            onChange={e => setBranchSoldFrom(e.target.value as Branch)} 
                            className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                            disabled={currentUser.role !== Role.Admin}
                        >
                            {Object.entries(branchNames).map(([key, name]) => (
                                <option key={key} value={key}>{name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                    <h4 className="font-bold mb-2">الأصناف</h4>
                    <div className="relative mb-2">
                        <input 
                            type="text" 
                            value={productSearch} 
                            onChange={e => { setProductSearch(e.target.value); setShowSuggestions(true); }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" 
                            placeholder="اكتب اسم الصنف أو الكود لإضافته..."/>
                        {filteredProducts.length > 0 && showSuggestions && (
                            <ul className="absolute z-10 w-full bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                                {filteredProducts.map(p => (
                                    <li key={p.id} onMouseDown={() => handleProductSelect(p)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer flex flex-col">
                                        <div>{p.name} ({p.sku}) - <span className="font-semibold text-primary-dark dark:text-primary-light">الرصيد الحالي: {p.stock[branchSoldFrom]}</span></div>
                                        <small className="text-xs text-gray-500 dark:text-gray-400">{getStockBreakdown(p)}</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                     <div className="space-y-2 max-h-60 overflow-y-auto">
                        {items.map((item, index) => {
                            const product = products.find(p => p.id === item.productId);
                            return (
                                <div key={item.productId} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                                    <div className="col-span-5">
                                        <span className="truncate block">{item.productName}</span>
                                        {product && <small className="text-xs text-gray-500 dark:text-gray-400 block">{getStockBreakdown(product)}</small>}
                                    </div>
                                    <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} placeholder="الكمية" className="col-span-3 p-1 border rounded dark:bg-gray-600" ref={index === items.length - 1 ? lastAddedItemRef : null} />
                                    <input type="number" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))} placeholder="السعر" className="col-span-3 p-1 border rounded dark:bg-gray-600" step="0.01" />
                                    <button type="button" onClick={() => handleRemoveItem(index)} className="col-span-1 text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-right font-bold text-2xl mt-4">الإجمالي: {formatCurrency(totalAmount)}</div>
                
                <div><label>ملاحظات</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"></textarea></div>
            </div>
        </Modal>
    );
};

export default DailySaleModal;
