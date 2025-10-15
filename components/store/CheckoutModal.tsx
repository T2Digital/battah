import React, { useState } from 'react';
import { CartItem } from '../../types';
import Modal from '../shared/Modal';
import { formatCurrency } from '../../lib/utils';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    clearCart: () => void;
    companyPhone: string;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, clearCart, companyPhone }) => {
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
    const [isSubmitting, setSubmitting] = useState(false);

    const subtotal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCustomerInfo(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        
        let message = `🚗 *طلب جديد من متجر بطاح أونلاين* 🚗\n\n`;
        message += `👤 *بيانات العميل:*\n`;
        message += `• الاسم: ${customerInfo.name}\n`;
        message += `• الهاتف: ${customerInfo.phone}\n`;
        message += `• العنوان: ${customerInfo.address}\n\n`;
        
        message += `🛒 *المنتجات المطلوبة:*\n`;
        cartItems.forEach((item, index) => {
            message += `${index + 1}. ${item.product.name}\n`;
            message += `   *الكمية:* ${item.quantity} | *الإجمالي:* ${formatCurrency(item.quantity * item.product.sellingPrice)}\n`;
        });
        
        message += `\n💰 *الإجمالي النهائي: ${formatCurrency(subtotal)}*\n`;
        message += `\n✅ *يرجى تأكيد الطلب والتواصل مع العميل لترتيبات الشحن والدفع.*`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${companyPhone}&text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
        
        setTimeout(() => {
            setSubmitting(false);
            onClose();
            clearCart();
            // Could show a success message here
        }, 1000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إتمام الطلب" onSave={handleSubmit}>
            <div className="space-y-4">
                <div className="p-4 bg-slate-100 dark:bg-gray-700 rounded-lg max-h-40 overflow-y-auto">
                    <h4 className="font-bold mb-2">ملخص الطلب:</h4>
                    {cartItems.map(item => (
                        <div key={item.product.id} className="flex justify-between text-sm">
                            <span>{item.product.name} (x{item.quantity})</span>
                            <span>{formatCurrency(item.product.sellingPrice * item.quantity)}</span>
                        </div>
                    ))}
                     <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                        <span>الإجمالي</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                </div>

                <h4 className="font-bold pt-2">بيانات التوصيل:</h4>
                <div>
                    <label className="block text-sm font-medium">الاسم الكامل *</label>
                    <input type="text" name="name" value={customerInfo.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                 <div>
                    <label className="block text-sm font-medium">رقم الهاتف *</label>
                    <input type="tel" name="phone" value={customerInfo.phone} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                 <div>
                    <label className="block text-sm font-medium">العنوان بالتفصيل *</label>
                    <textarea name="address" value={customerInfo.address} onChange={handleChange} required rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea>
                </div>
            </div>
        </Modal>
    );
};

export default CheckoutModal;
