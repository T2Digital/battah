import React, { useState, useRef } from 'react';
import { CartItem, Order } from '../../types';
import Modal from '../shared/Modal';
import { formatCurrency } from '../../lib/utils';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onPlaceOrder: (customerDetails: { name: string; phone: string; address: string }, paymentMethod: Order['paymentMethod'], paymentProof?: File) => Promise<void>;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, onPlaceOrder }) => {
    const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', address: '' });
    const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>('electronic');
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const subtotal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCustomerDetails({ ...customerDetails, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPaymentProof(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (paymentMethod === 'electronic' && !paymentProof) {
            alert('يرجى إرفاق إيصال الدفع لإتمام الطلب الإلكتروني.');
            return;
        }
        setIsPlacingOrder(true);
        try {
            await onPlaceOrder(customerDetails, paymentMethod, paymentProof || undefined);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const inputBaseClasses = "mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 focus:border-primary focus:ring-primary";

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={isPlacingOrder ? () => {} : onClose} // Prevent closing while order is processing
            title="إتمام الطلب" 
            onSave={handleSubmit}
        >
            <div className="space-y-6">
                 {isPlacingOrder && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-gray-800/70 flex flex-col items-center justify-center z-10 rounded-2xl">
                        <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
                        <p className="font-bold text-lg">جاري إرسال طلبك...</p>
                    </div>
                )}
                <div>
                    <h3 className="font-bold text-lg mb-2">ملخص الطلب</h3>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                         {cartItems.map(item => (
                            <div key={item.product.id} className="flex justify-between text-sm">
                                <span>{item.product.name} (x{item.quantity})</span>
                                <span className="font-semibold">{formatCurrency(item.product.sellingPrice * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between font-bold text-xl border-t pt-2 mt-2 dark:border-gray-600">
                        <span>الإجمالي</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                </div>

                <div>
                     <h3 className="font-bold text-lg mb-2">بياناتك</h3>
                     <div className="grid grid-cols-1 gap-4">
                         <input type="text" name="name" placeholder="الاسم الكامل" onChange={handleChange} required className={inputBaseClasses} />
                         <input type="tel" name="phone" placeholder="رقم الهاتف" onChange={handleChange} required className={inputBaseClasses} />
                         <textarea name="address" placeholder="العنوان بالتفصيل" onChange={handleChange} required className={inputBaseClasses} rows={3}></textarea>
                     </div>
                </div>
                
                <div>
                    <h3 className="font-bold text-lg mb-2">اختر طريقة الدفع</h3>
                    <div className="flex gap-4">
                        <label className="flex items-center p-3 border rounded-lg cursor-pointer flex-grow dark:border-gray-600 has-[:checked]:border-primary has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20">
                            <input type="radio" name="paymentMethod" value="electronic" checked={paymentMethod === 'electronic'} onChange={() => setPaymentMethod('electronic')} className="h-4 w-4 text-primary focus:ring-primary"/>
                            <span className="ml-2">دفع إلكتروني</span>
                        </label>
                         <label className="flex items-center p-3 border rounded-lg cursor-pointer flex-grow dark:border-gray-600 has-[:checked]:border-primary has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20">
                            <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="h-4 w-4 text-primary focus:ring-primary"/>
                            <span className="ml-2">الدفع عند الاستلام</span>
                        </label>
                    </div>
                </div>

                {paymentMethod === 'electronic' && (
                     <div>
                        <h3 className="font-bold text-lg mb-2">إثبات الدفع</h3>
                        <p className="text-sm text-gray-500 mb-2 dark:text-gray-400">
                            يرجى تحويل المبلغ الإجمالي إلى أحد الحسابات التالية ثم إرفاق إيصال الدفع:
                            <br/>- <strong>فودافون كاش:</strong> 01012345678
                            <br/>- <strong>انستاباي:</strong> 01012345678
                        </p>
                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} required className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900"/>
                        {paymentProof && <p className="text-xs text-green-600 mt-1">تم اختيار الملف: {paymentProof.name}</p>}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default CheckoutModal;