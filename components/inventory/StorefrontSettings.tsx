import React, { useState, useEffect } from 'react';
import { Product, StorefrontSettings as SettingsType } from '../../types';
import Modal from '../shared/Modal';

interface StorefrontSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    settings: SettingsType;
    onSave: (newSettings: SettingsType) => void;
    products: Product[];
}

const StorefrontSettings: React.FC<StorefrontSettingsProps> = ({ isOpen, onClose, settings, onSave, products }) => {
    const [featured, setFeatured] = useState<number[]>([]);
    const [newArrivals, setNewArrivals] = useState<number[]>([]);
    const [adminPassword, setAdminPassword] = useState('');

    useEffect(() => {
        if (settings) {
            setFeatured(settings.featuredProductIds || []);
            setNewArrivals(settings.newArrivalProductIds || []);
            setAdminPassword(settings.adminPassword || '');
        }
    }, [settings, isOpen]);

    const handleToggle = (list: 'featured' | 'newArrivals', productId: number) => {
        const setter = list === 'featured' ? setFeatured : setNewArrivals;
        setter(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ featuredProductIds: featured, newArrivalProductIds: newArrivals, adminPassword });
        onClose();
    };

    const ProductList: React.FC<{ title: string; selectedIds: number[]; onToggle: (id: number) => void }> = ({ title, selectedIds, onToggle }) => (
        <div>
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            <div className="h-64 overflow-y-auto border rounded-md p-2 space-y-1 dark:border-gray-600">
                {products.map(p => (
                    <div key={p.id} className="flex items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input
                            type="checkbox"
                            id={`${title}-${p.id}`}
                            checked={selectedIds.includes(p.id)}
                            onChange={() => onToggle(p.id)}
                            className="ml-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor={`${title}-${p.id}`} className="text-sm cursor-pointer flex-grow">{p.name}</label>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إعدادات واجهة المتجر" onSave={handleSubmit}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProductList title="المنتجات المميزة (الأكثر مبيعاً)" selectedIds={featured} onToggle={(id) => handleToggle('featured', id)} />
                    <ProductList title="المنتجات الجديدة (وصل حديثاً)" selectedIds={newArrivals} onToggle={(id) => handleToggle('newArrivals', id)} />
                </div>
                <div className="border-t pt-4">
                    <h3 className="font-bold text-lg mb-2 text-red-600">إعدادات الأمان</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">كلمة مرور العمليات الحساسة (للمدير)</label>
                        <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="اتركه فارغاً لتعطيل الخاصية"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">تستخدم لتأكيد الحذف والتعديل والإضافة في الأقسام الحساسة.</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default StorefrontSettings;
