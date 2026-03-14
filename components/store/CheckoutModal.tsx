

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CartItem, Order, DiscountCode } from '../../types';
import Modal from '../shared/Modal';
import { formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onPlaceOrder: (customerDetails: { name: string; phone: string; address: string }, paymentMethod: Order['paymentMethod'], paymentProof?: File, discountCode?: string, locationLink?: string) => Promise<string | undefined>;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, onPlaceOrder }) => {
    const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', address: '' });
    const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>('cod');
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationUrl, setLocationUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [discountInput, setDiscountInput] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
    const [discountMessage, setDiscountMessage] = useState({ text: '', type: 'info' });

    const { appData } = useStore();
    const electronicPaymentNumber = appData?.settings?.electronicPaymentNumber || '01080444447';
    const paymentSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (paymentMethod === 'electronic' && paymentSectionRef.current) {
            paymentSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [paymentMethod]);

    // Persist form data to localStorage
    useEffect(() => {
        if (isOpen) {
            const savedData = localStorage.getItem('checkoutData');
            if (savedData) {
                setCustomerDetails(JSON.parse(savedData));
            }
        } else {
            // Reset state on close
            setDiscountInput('');
            setAppliedDiscount(null);
            setDiscountMessage({ text: '', type: 'info' });
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newDetails = { ...customerDetails, [e.target.name]: e.target.value };
        setCustomerDetails(newDetails);
        localStorage.setItem('checkoutData', JSON.stringify(newDetails));
    };

    const subtotal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
    const deliveryFee = 50;
    
    const discountAmount = useMemo(() => {
        if (!appliedDiscount) return 0;
        if (subtotal < appliedDiscount.minPurchase) return 0;
        if (appliedDiscount.type === 'fixed') {
            return appliedDiscount.value;
        }
        return (subtotal * appliedDiscount.value) / 100;
    }, [appliedDiscount, subtotal]);

    const totalAmount = subtotal + deliveryFee - discountAmount;

    const handleApplyDiscount = async () => {
        if (!discountInput.trim()) {
            setDiscountMessage({ text: 'يرجى إدخال كود الخصم.', type: 'error' });
            return;
        }

        const codeRef = doc(db, "discountCodes", discountInput.toUpperCase());
        const codeSnap = await getDoc(codeRef);

        if (!codeSnap.exists()) {
            setDiscountMessage({ text: 'كود الخصم غير صالح.', type: 'error' });
            setAppliedDiscount(null);
            return;
        }

        const codeData = codeSnap.data() as DiscountCode;
        const today = new Date().toISOString().split('T')[0];

        if (!codeData.isActive || today > codeData.expiresAt) {
            setDiscountMessage({ text: 'هذا الكود منتهي الصلاحية.', type: 'error' });
            setAppliedDiscount(null);
            return;
        }
        if (subtotal < codeData.minPurchase) {
            setDiscountMessage({ text: `يجب أن تكون قيمة المشتريات ${formatCurrency(codeData.minPurchase)} على الأقل لاستخدام هذا الكود.`, type: 'error' });
            setAppliedDiscount(null);
            return;
        }
        setAppliedDiscount(codeData);
        setDiscountMessage({ text: 'تم تطبيق الخصم بنجاح!', type: 'success' });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPaymentProof(e.target.files[0]);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("المتصفح لا يدعم تحديد الموقع.");
            return;
        }
        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
                setLocationUrl(url);
                setIsGettingLocation(false);
            },
            () => {
                alert("لم نتمكن من الحصول على موقعك. يرجى التأكد من تفعيل الأذونات.");
                setIsGettingLocation(false);
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (paymentMethod === 'electronic' && !paymentProof) {
            alert('يرجى إرفاق إيصال الدفع لإتمام الطلب الإلكتروني.');
            return;
        }
        setIsPlacingOrder(true);
        try {
            const proofUrl = await onPlaceOrder(customerDetails, paymentMethod, paymentProof || undefined, appliedDiscount?.code, locationUrl);
            
            localStorage.removeItem('checkoutData');

            const businessPhoneNumber = '201080444447'; 
            let message = `*طلب جديد من متجر بطاح الأصلي*\n\n`;
            message += `*الاسم:* ${customerDetails.name}\n`;
            message += `*الهاتف:* ${customerDetails.phone}\n`;
            message += `*العنوان:* ${customerDetails.address}\n\n`;
            message += `*المنتجات:*\n`;
            cartItems.forEach(item => {
                message += `- ${item.product.name} (الكمية: ${item.quantity}) - ${formatCurrency(item.product.sellingPrice * item.quantity)}\n`;
            });
            if (appliedDiscount && discountAmount > 0) {
                message += `\n*الخصم (${appliedDiscount.code}):* -${formatCurrency(discountAmount)}\n`;
            }
            message += `\n*الإجمالي:* ${formatCurrency(totalAmount)}\n`;
            message += `*طريقة الدفع:* ${paymentMethod === 'cod' ? 'عند الاستلام' : 'دفع إلكتروني'}\n`;
            if (proofUrl) {
                message += `*إثبات الدفع:* ${proofUrl}\n`;
            }
            if (locationUrl) {
                message += `*موقع العميل:* ${locationUrl}\n`;
            }
            
            const whatsappUrl = `https://wa.me/${businessPhoneNumber}?text=${encodeURIComponent(message)}`;
            
            window.open(whatsappUrl, '_blank');

        } catch (error) {
            console.error("Order submission failed:", error);
            alert("فشل إرسال الطلب. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const inputBaseClasses = "mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 focus:border-primary focus:ring-primary";

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={isPlacingOrder ? () => {} : onClose}
            title="إتمام الطلب" 
            onSave={handleSubmit}
            saveLabel="ارسال الطلب الآن"
        >
            <div className="space-y-6">
                 {isPlacingOrder && (
                    <div className="absolute inset-0 bg-white bg-opacity-70 dark:bg-gray-800 dark:bg-opacity-70 flex flex-col items-center justify-center z-10 rounded-2xl">
                        <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
                        <p className="font-bold text-lg">جاري إعداد طلبك...</p>
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
                    <div className="space-y-1 border-t pt-2 mt-2 dark:border-gray-600">
                        <div className="flex justify-between text-sm">
                            <span>المجموع الفرعي</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {appliedDiscount && discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>الخصم ({appliedDiscount.code})</span>
                                <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                         <div className="flex justify-between text-sm">
                            <span>رسوم التوصيل</span>
                            <span>{formatCurrency(deliveryFee)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xl pt-1">
                            <span>المجموع الإجمالي</span>
                            <span>{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>

                <div>
                     <h3 className="font-bold text-lg mb-2">بياناتك</h3>
                     <div className="space-y-4">
                         <input type="text" name="name" value={customerDetails.name} placeholder="الاسم الكامل" onChange={handleChange} required className={inputBaseClasses} />
                         <input type="tel" name="phone" value={customerDetails.phone} placeholder="رقم الهاتف" onChange={handleChange} required className={inputBaseClasses} />
                         <textarea name="address" value={customerDetails.address} placeholder="العنوان بالتفصيل" onChange={handleChange} required className={inputBaseClasses} rows={2}></textarea>
                         <button type="button" onClick={handleGetLocation} disabled={isGettingLocation} className="w-full flex justify-center items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 dark:bg-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition disabled:opacity-50">
                            {isGettingLocation ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-map-marker-alt"></i>}
                            <span>{locationUrl ? 'تم تحديد الموقع بنجاح' : '📍 مشاركة موقعي لتوصيل أسرع'}</span>
                         </button>
                     </div>
                </div>

                <div>
                    <h3 className="font-bold text-lg mb-2">كود الخصم</h3>
                    <div className="flex gap-2">
                        <input type="text" value={discountInput} onChange={e => setDiscountInput(e.target.value)} placeholder="ادخل كود الخصم" className="flex-grow rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                        <button type="button" onClick={handleApplyDiscount} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">تطبيق</button>
                    </div>
                    {discountMessage.text && <p className={`text-xs mt-1 ${discountMessage.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{discountMessage.text}</p>}
                </div>
                
                <div>
                    <h3 className="font-bold text-lg mb-2">اختر طريقة الدفع</h3>
                    <div className="flex gap-4">
                        <label className="flex items-center p-3 border rounded-lg cursor-pointer flex-grow dark:border-gray-600 has-[:checked]:border-primary has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20">
                            <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="h-4 w-4 text-primary focus:ring-primary"/>
                            <span className="ml-2">الدفع عند الاستلام</span>
                        </label>
                         <label className="flex items-center p-3 border rounded-lg cursor-pointer flex-grow dark:border-gray-600 has-[:checked]:border-primary has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20">
                            <input type="radio" name="paymentMethod" value="electronic" checked={paymentMethod === 'electronic'} onChange={() => setPaymentMethod('electronic')} className="h-4 w-4 text-primary focus:ring-primary"/>
                            <span className="ml-2">دفع إلكتروني</span>
                        </label>
                    </div>
                </div>

                {paymentMethod === 'electronic' && (
                     <div ref={paymentSectionRef}>
                        <h3 className="font-bold text-lg mb-2">اختر وسيلة الدفع الإلكتروني</h3>
                        <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
                            اضغط على الوسيلة المناسبة لإظهار تفاصيل التحويل أو الرابط.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button type="button" onClick={() => window.open('https://instapay.com.eg', '_blank')} className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-purple-50 border-purple-200 text-purple-700 transition">
                                <i className="fas fa-mobile-alt text-2xl mb-1"></i>
                                <span className="font-bold">InstaPay</span>
                                <span className="text-xs mt-1">تطبيق انستاباي</span>
                            </button>
                            
                            <button type="button" onClick={() => window.location.href = `tel:*9*7*${electronicPaymentNumber}*${totalAmount}#`} className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-red-50 border-red-200 text-red-700 transition">
                                <i className="fas fa-wallet text-2xl mb-1"></i>
                                <span className="font-bold">Vodafone Cash</span>
                                <span className="text-xs mt-1 ltr" dir="ltr">*9*7*...#{totalAmount}</span>
                            </button>

                            <button type="button" onClick={() => window.location.href = `tel:*115*${electronicPaymentNumber}*${totalAmount}#`} className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-orange-50 border-orange-200 text-orange-700 transition">
                                <i className="fas fa-wallet text-2xl mb-1"></i>
                                <span className="font-bold">Orange Cash</span>
                                <span className="text-xs mt-1 ltr" dir="ltr">*115*...#{totalAmount}</span>
                            </button>

                            <button type="button" onClick={() => window.location.href = `tel:*777*${electronicPaymentNumber}*${totalAmount}#`} className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-green-50 border-green-200 text-green-700 transition">
                                <i className="fas fa-wallet text-2xl mb-1"></i>
                                <span className="font-bold">Etisalat Cash</span>
                                <span className="text-xs mt-1 ltr" dir="ltr">*777*...#{totalAmount}</span>
                            </button>

                            <button type="button" onClick={() => window.location.href = `tel:*322*${electronicPaymentNumber}*${totalAmount}#`} className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-indigo-50 border-indigo-200 text-indigo-700 transition col-span-2 sm:col-span-1">
                                <i className="fas fa-wallet text-2xl mb-1"></i>
                                <span className="font-bold">WE Pay</span>
                                <span className="text-xs mt-1 ltr" dir="ltr">*322*...#{totalAmount}</span>
                            </button>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                            <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold mb-1">تعليمات هامة:</p>
                            <ul className="text-xs text-blue-700 dark:text-blue-400 list-disc list-inside space-y-1">
                                <li>قم بتحويل المبلغ الإجمالي: <strong>{formatCurrency(totalAmount)}</strong></li>
                                <li>رقم المحفظة للتحويل: <strong>{electronicPaymentNumber}</strong></li>
                                <li>بعد التحويل، يرجى التقاط صورة للإيصال ورفعها بالأسفل.</li>
                            </ul>
                        </div>

                        <h4 className="font-bold text-sm mb-2">إرفاق إيصال الدفع *</h4>
                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} required className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900"/>
                        {paymentProof && <p className="text-xs text-green-600 mt-1">تم اختيار الملف: {paymentProof.name}</p>}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default CheckoutModal;