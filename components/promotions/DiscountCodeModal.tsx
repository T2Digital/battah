

import React, { useState, useEffect } from 'react';
import { DiscountCode } from '../../types';
import Modal from '../shared/Modal';

interface DiscountCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (code: Omit<DiscountCode, 'id'> & { id?: string }) => void;
    existingCode: DiscountCode | null;
}

const DiscountCodeModal: React.FC<DiscountCodeModalProps> = ({ isOpen, onClose, onSave, existingCode }) => {
    const [formData, setFormData] = useState<Omit<DiscountCode, 'id'>>({
        code: '',
        type: 'percentage',
        value: 10,
        minPurchase: 0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
    });

    useEffect(() => {
        if (existingCode) {
            const { id, ...dataToEdit } = existingCode;
            setFormData(dataToEdit);
        } else {
             setFormData({
                code: '',
                type: 'percentage',
                value: 10,
                minPurchase: 0,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                isActive: true,
            });
        }
    }, [existingCode, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (['value', 'minPurchase'].includes(name) ? Number(value) : value),
        }));
    };

    const handleGenerateCode = () => {
        const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        setFormData(prev => ({ ...prev, code: randomCode }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code) {
            alert('كود الخصم لا يمكن أن يكون فارغاً.');
            return;
        }
        // If we are editing, pass the ID along with the data. Otherwise, don't.
        const dataToSave = existingCode
            ? { ...formData, id: existingCode.id }
            : formData;
        
        onSave(dataToSave);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={existingCode ? 'تعديل كود خصم' : 'إضافة كود خصم جديد'}
            onSave={handleSubmit}
        >
            <div className="space-y-4">
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium">كود الخصم *</label>
                        <input type="text" name="code" value={formData.code} onChange={handleChange} required 
                        readOnly={!!existingCode}
                        className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 ${!!existingCode ? 'bg-gray-100 dark:bg-gray-600' : ''}`} />
                    </div>
                    {!existingCode && (
                        <button type="button" onClick={handleGenerateCode} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">توليد كود</button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium">نوع الخصم *</label>
                        <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                            <option value="percentage">نسبة مئوية (%)</option>
                            <option value="fixed">مبلغ ثابت (ج.م)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">قيمة الخصم *</label>
                        <input type="number" name="value" value={formData.value} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">الحد الأدنى للشراء (ج.م)</label>
                        <input type="number" name="minPurchase" value={formData.minPurchase} onChange={handleChange} min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">تاريخ الانتهاء *</label>
                        <input type="date" name="expiresAt" value={formData.expiresAt} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                    </div>
                </div>
                <div className="flex items-center">
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} id="isActiveCheckbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                    <label htmlFor="isActiveCheckbox" className="ml-2 block text-sm">تفعيل الكود</label>
                </div>
            </div>
        </Modal>
    );
};

export default DiscountCodeModal;