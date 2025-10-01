
import React, { useState, useEffect } from 'react';
import { DailySale, User } from '../../types';
// FIX: Imported formatCurrency to resolve "Cannot find name" error.
import { formatCurrency } from '../../lib/utils';

interface DailySaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (sale: Omit<DailySale, 'id'> & { id?: number }) => void;
    currentUser: User;
    existingSale: DailySale | null;
    dailySales: DailySale[];
}

const DailySaleModal: React.FC<DailySaleModalProps> = ({ isOpen, onClose, onSave, currentUser, existingSale, dailySales }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        sellerName: currentUser.name,
        sellerId: currentUser.id,
        source: 'المحل' as DailySale['source'],
        itemName: '',
        itemType: 'قطع غيار أصلية' as DailySale['itemType'],
        direction: 'بيع' as DailySale['direction'],
        quantity: 1,
        unitPrice: 0,
        notes: '',
    });
    
    const [totalAmount, setTotalAmount] = useState(0);
    
    useEffect(() => {
        const generateInvoiceNumber = () => {
            const today = new Date();
            const prefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const todaySalesCount = dailySales.filter(s => s.invoiceNumber.startsWith(prefix)).length;
            return `${prefix}${String(todaySalesCount + 1).padStart(3, '0')}`;
        };

        if (existingSale) {
            setFormData({
                date: existingSale.date,
                invoiceNumber: existingSale.invoiceNumber,
                sellerName: existingSale.sellerName,
                sellerId: existingSale.sellerId,
                source: existingSale.source,
                itemName: existingSale.itemName,
                itemType: existingSale.itemType,
                direction: existingSale.direction,
                quantity: existingSale.quantity,
                unitPrice: existingSale.unitPrice,
                notes: existingSale.notes || '',
            });
        } else {
             setFormData(prev => ({ ...prev, invoiceNumber: generateInvoiceNumber()}));
        }
    }, [existingSale, dailySales, currentUser]);

    useEffect(() => {
        const total = formData.quantity * formData.unitPrice;
        setTotalAmount(total);
    }, [formData.quantity, formData.unitPrice]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'quantity' || name === 'unitPrice' ? Number(value) : value,
        }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const saleData = {
            ...formData,
            totalAmount,
        };
        if (existingSale) {
            onSave({ ...saleData, id: existingSale.id });
        } else {
            onSave(saleData);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b dark:border-gray-700">
                        <h3 className="text-xl font-bold">{existingSale ? 'تعديل مبيعة' : 'تسجيل مبيعة جديدة'}</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Form fields */}
                        <div><label>التاريخ</label><input type="date" name="date" value={formData.date} onChange={handleChange} readOnly className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                        <div><label>رقم الفاتورة</label><input type="text" name="invoiceNumber" value={formData.invoiceNumber} readOnly className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 bg-gray-100" /></div>
                        <div><label>اسم البائع</label><input type="text" name="sellerName" value={formData.sellerName} readOnly className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 bg-gray-100" /></div>
                        <div><label>المصدر</label><select name="source" value={formData.source} onChange={handleChange} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"><option>المحل</option><option>أونلاين</option><option>تلفون</option><option>زيارة</option><option>معرض</option></select></div>
                        <div className="md:col-span-2"><label>اسم الصنف</label><input type="text" name="itemName" value={formData.itemName} onChange={handleChange} required className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                        <div><label>النوع</label><select name="itemType" value={formData.itemType} onChange={handleChange} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"><option>قطع غيار أصلية</option><option>قطع غيار تجارية</option><option>زيوت وشحوم</option><option>إطارات</option><option>بطاريات</option><option>إكسسوارات</option><option>أدوات</option><option>أخرى</option></select></div>
                        <div><label>الاتجاه</label><select name="direction" value={formData.direction} onChange={handleChange} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"><option>بيع</option><option>مرتجع</option><option>تبديل</option><option>ضمان</option></select></div>
                        <div><label>الكمية</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                        <div><label>السعر</label><input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleChange} min="0" step="0.01" required className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                        <div className="md:col-span-2"><label>الإجمالي</label><div className="w-full mt-1 p-3 text-lg font-bold bg-gray-100 dark:bg-gray-700 rounded text-center">{formatCurrency(totalAmount)}</div></div>
                        <div className="md:col-span-2"><label>ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"></textarea></div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DailySaleModal;
