import React, { useState, useEffect, useMemo } from 'react';
import { DailySale, User, Product, Branch } from '../../types';
import { formatCurrency } from '../../lib/utils';
import Modal from '../shared/Modal';

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
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        sellerName: currentUser.name,
        sellerId: currentUser.id,
        source: 'المحل' as DailySale['source'],
        productId: 0,
        branchSoldFrom: currentUser.branch as Branch,
        itemType: 'قطع غيار' as DailySale['itemType'],
        direction: 'بيع' as DailySale['direction'],
        quantity: 1,
        unitPrice: 0,
        notes: '',
    });
    
    const [totalAmount, setTotalAmount] = useState(0);
    const [productSearch, setProductSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    
    useEffect(() => {
        const generateInvoiceNumber = () => {
            const today = new Date();
            const prefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const todaySalesCount = dailySales.filter(s => s.invoiceNumber.startsWith(prefix)).length;
            return `${prefix}${String(todaySalesCount + 1).padStart(3, '0')}`;
        };

        if (existingSale) {
            const product = products.find(p => p.id === existingSale.productId);
            setSelectedProduct(product || null);
            setProductSearch(product?.name || '');
            setFormData({
                ...existingSale,
                notes: existingSale.notes || '',
            });
        } else {
             setFormData({
                date: new Date().toISOString().split('T')[0],
                invoiceNumber: generateInvoiceNumber(),
                sellerName: currentUser.name,
                sellerId: currentUser.id,
                source: 'المحل',
                productId: 0,
                branchSoldFrom: currentUser.branch,
                itemType: 'قطع غيار',
                direction: 'بيع',
                quantity: 1,
                unitPrice: 0,
                notes: '',
            });
             setSelectedProduct(null);
             setProductSearch('');
        }
    }, [existingSale, dailySales, currentUser, products, isOpen]);

    useEffect(() => {
        const total = formData.quantity * formData.unitPrice;
        setTotalAmount(total);
    }, [formData.quantity, formData.unitPrice]);
    
    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5);
    }, [productSearch, products]);

    const handleProductSelect = (product: Product) => {
        setSelectedProduct(product);
        setProductSearch(product.name);
        setShowSuggestions(false);
        setFormData(prev => ({
            ...prev,
            productId: product.id,
            unitPrice: product.sellingPrice,
            itemType: product.category as DailySale['itemType'] || 'أخرى',
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'quantity' || name === 'unitPrice' ? Number(value) : value,
        }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) {
            alert('يرجى اختيار صنف صحيح من القائمة.');
            return;
        }
        if(formData.quantity > selectedProduct.stock[formData.branchSoldFrom] && formData.direction === 'بيع') {
            alert(`الكمية المطلوبة (${formData.quantity}) أكبر من الرصيد المتاح في هذا الفرع (${selectedProduct.stock[formData.branchSoldFrom]})`);
            return;
        }
        const saleData = { ...formData, totalAmount };
        onSave(existingSale ? { ...saleData, id: existingSale.id } : saleData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingSale ? 'تعديل مبيعة' : 'تسجيل مبيعة جديدة'} onSave={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label>التاريخ</label><input type="date" name="date" value={formData.date} readOnly className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 bg-gray-100" /></div>
                <div><label>رقم الفاتورة</label><input type="text" name="invoiceNumber" value={formData.invoiceNumber} readOnly className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 bg-gray-100" /></div>
                
                <div className="md:col-span-2 relative">
                    <label>بحث عن الصنف *</label>
                    <input 
                        type="text" 
                        value={productSearch} 
                        onChange={e => { setProductSearch(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        required 
                        className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" 
                        placeholder="اكتب اسم الصنف أو الكود..."/>
                    {filteredProducts.length > 0 && showSuggestions && (
                        <ul className="absolute z-10 w-full bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                            {filteredProducts.map(p => <li key={p.id} onMouseDown={() => handleProductSelect(p)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer">{p.name} ({p.sku})</li>)}
                        </ul>
                    )}
                </div>
                {selectedProduct && (
                    <div className="md:col-span-2 bg-blue-50 dark:bg-gray-700 p-3 rounded-lg text-sm">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">رصيد المخزون لـ "{selectedProduct.name}"</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            <div><strong>الرئيسي:</strong> <span className="text-blue-600 dark:text-blue-400 font-semibold">{selectedProduct.stock.main}</span></div>
                            <div><strong>فرع 1:</strong> <span className="text-blue-600 dark:text-blue-400 font-semibold">{selectedProduct.stock.branch1}</span></div>
                            <div><strong>فرع 2:</strong> <span className="text-blue-600 dark:text-blue-400 font-semibold">{selectedProduct.stock.branch2}</span></div>
                            <div><strong>فرع 3:</strong> <span className="text-blue-600 dark:text-blue-400 font-semibold">{selectedProduct.stock.branch3}</span></div>
                        </div>
                    </div>
                )}
                <div>
                    <label>البيع من *</label>
                    <select name="branchSoldFrom" value={formData.branchSoldFrom} onChange={handleChange} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                        <option value="main">المخزن الرئيسي</option>
                        <option value="branch1">فرع 1</option>
                        <option value="branch2">فرع 2</option>
                        <option value="branch3">فرع 3</option>
                    </select>
                </div>
                <div><label>الاتجاه</label><select name="direction" value={formData.direction} onChange={handleChange} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"><option>بيع</option><option>مرتجع</option><option>تبديل</option><option>ضمان</option></select></div>
                <div><label>الكمية *</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                <div><label>السعر *</label><input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleChange} min="0" step="0.01" required className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                <div className="md:col-span-2"><label>الإجمالي</label><div className="w-full mt-1 p-3 text-lg font-bold bg-gray-100 dark:bg-gray-700 rounded text-center">{formatCurrency(totalAmount)}</div></div>
                <div className="md:col-span-2"><label>ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"></textarea></div>
            </div>
        </Modal>
    );
};

export default DailySaleModal;