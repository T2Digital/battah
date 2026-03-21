

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

    const inputBaseClasses = "mt-1 block w-full rounded-xl border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-800 focus:border-primary focus:ring-primary transition-colors px-4 py-3 text-sm";

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={isPlacingOrder ? () => {} : onClose}
            title="إتمام الطلب" 
            onSave={handleSubmit}
            saveLabel="تأكيد الطلب الآن"
        >
            <div className="space-y-8 relative">
                 {isPlacingOrder && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-2xl">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="font-bold text-xl text-gray-900 dark:text-white">جاري إعداد طلبك...</p>
                        <p className="text-sm text-gray-500 mt-2">يرجى الانتظار لحظات</p>
                    </div>
                )}

                {/* Order Summary */}
                <div className="bg-slate-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <i className="fas fa-receipt"></i>
                        </div>
                        ملخص الطلب
                    </h3>
                    <div className="max-h-48 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                         {cartItems.map(item => (
                            <div key={item.product.id} className="flex justify-between items-center text-sm bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-50 dark:border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-lg p-1 border border-gray-100 dark:border-gray-600 flex-shrink-0">
                                        <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-700 dark:text-gray-300 line-clamp-1">{item.product.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">الكمية: {item.quantity}</span>
                                    </div>
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(item.product.sellingPrice * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>المجموع الفرعي</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
                        </div>
                        {appliedDiscount && discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                                <span>الخصم ({appliedDiscount.code})</span>
                                <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                         <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>رسوم التوصيل</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(deliveryFee)}</span>
                        </div>
                        <div className="flex justify-between font-black text-xl pt-4 mt-2 border-t border-gray-200 dark:border-gray-700 text-primary dark:text-primary-light">
                            <span>الإجمالي المطلوب</span>
                            <span>{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Customer Details */}
                <div>
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <i className="fas fa-user"></i>
                        </div>
                        بيانات التوصيل
                     </h3>
                     <div className="space-y-4">
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل</label>
                             <div className="relative">
                                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                     <i className="fas fa-user text-gray-400"></i>
                                 </div>
                                 <input type="text" name="name" value={customerDetails.name} placeholder="أدخل اسمك الثلاثي" onChange={handleChange} required className={`${inputBaseClasses} pr-10`} />
                             </div>
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف</label>
                             <div className="relative">
                                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                     <i className="fas fa-phone text-gray-400"></i>
                                 </div>
                                 <input type="tel" name="phone" value={customerDetails.phone} placeholder="مثال: 01012345678" onChange={handleChange} required className={`${inputBaseClasses} pr-10 text-left`} dir="ltr" />
                             </div>
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان بالتفصيل</label>
                             <div className="relative">
                                 <div className="absolute top-3 right-0 pr-3 flex items-start pointer-events-none">
                                     <i className="fas fa-map-marker-alt text-gray-400"></i>
                                 </div>
                                 <textarea name="address" value={customerDetails.address} placeholder="المحافظة، المدينة، الشارع، رقم العمارة/الشقة" onChange={handleChange} required className={`${inputBaseClasses} pr-10`} rows={3}></textarea>
                             </div>
                         </div>
                         <button type="button" onClick={handleGetLocation} disabled={isGettingLocation} className={`w-full flex justify-center items-center gap-2 px-4 py-3.5 text-sm font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] ${locationUrl ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40'} disabled:opacity-50`}>
                            {isGettingLocation ? <i className="fas fa-spinner fa-spin"></i> : <i className={locationUrl ? "fas fa-check-circle text-lg" : "fas fa-location-arrow text-lg"}></i>}
                            <span>{locationUrl ? 'تم تحديد الموقع بنجاح' : 'مشاركة موقعي لتوصيل أسرع وأدق'}</span>
                         </button>
                     </div>
                </div>

                {/* Discount Code */}
                <div>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <i className="fas fa-ticket-alt"></i>
                        </div>
                        كود الخصم
                    </h3>
                    <div className="flex gap-2 relative">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <i className="fas fa-tag text-gray-400"></i>
                        </div>
                        <input type="text" value={discountInput} onChange={e => setDiscountInput(e.target.value)} placeholder="أدخل كود الخصم هنا" className={`${inputBaseClasses} !mt-0 pr-10 uppercase`} />
                        <button type="button" onClick={handleApplyDiscount} className="px-6 py-3 bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors whitespace-nowrap shadow-sm active:scale-[0.98]">تطبيق</button>
                    </div>
                    {discountMessage.text && (
                        <div className={`mt-3 p-3 rounded-xl flex items-center gap-2 text-sm border ${discountMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'}`}>
                            <i className={`fas ${discountMessage.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
                            <span>{discountMessage.text}</span>
                        </div>
                    )}
                </div>
                
                {/* Payment Method */}
                <div>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <i className="fas fa-wallet"></i>
                        </div>
                        طريقة الدفع
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-primary/30 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${paymentMethod === 'cod' ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                {paymentMethod === 'cod' && <div className="w-3 h-3 rounded-full bg-primary"></div>}
                            </div>
                            <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="hidden"/>
                            <div className="ml-3">
                                <span className="block font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-hand-holding-usd text-primary"></i>
                                    الدفع عند الاستلام
                                </span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">ادفع نقداً عند استلام طلبك</span>
                            </div>
                        </label>
                         <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'electronic' ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-primary/30 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${paymentMethod === 'electronic' ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                {paymentMethod === 'electronic' && <div className="w-3 h-3 rounded-full bg-primary"></div>}
                            </div>
                            <input type="radio" name="paymentMethod" value="electronic" checked={paymentMethod === 'electronic'} onChange={() => setPaymentMethod('electronic')} className="hidden"/>
                            <div className="ml-3">
                                <span className="block font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-credit-card text-primary"></i>
                                    دفع إلكتروني
                                </span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">انستاباي، فودافون كاش، والمزيد</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Electronic Payment Details */}
                {paymentMethod === 'electronic' && (
                     <div ref={paymentSectionRef} className="bg-slate-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 animate-fade-in">
                        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">اختر وسيلة الدفع الإلكتروني</h3>
                        <p className="text-sm text-gray-500 mb-5 dark:text-gray-400">
                            اضغط على الوسيلة المناسبة لإظهار تفاصيل التحويل أو الرابط.
                        </p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                            <button type="button" onClick={() => window.open('https://instapay.com.eg', '_blank')} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-900/30 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 text-purple-700 dark:text-purple-400 transition-all shadow-sm">
                                <i className="fas fa-mobile-alt text-2xl mb-2"></i>
                                <span className="font-bold text-sm">InstaPay</span>
                            </button>
                            
                            <button type="button" onClick={() => window.location.href = `tel:*9*7*${electronicPaymentNumber}*${totalAmount}#`} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 text-red-600 dark:text-red-400 transition-all shadow-sm">
                                <i className="fas fa-wallet text-2xl mb-2"></i>
                                <span className="font-bold text-sm">Vodafone</span>
                            </button>

                            <button type="button" onClick={() => window.location.href = `tel:*115*${electronicPaymentNumber}*${totalAmount}#`} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-900/30 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 text-orange-600 dark:text-orange-400 transition-all shadow-sm">
                                <i className="fas fa-wallet text-2xl mb-2"></i>
                                <span className="font-bold text-sm">Orange</span>
                            </button>

                            <button type="button" onClick={() => window.location.href = `tel:*777*${electronicPaymentNumber}*${totalAmount}#`} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 border border-green-100 dark:border-green-900/30 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 text-green-600 dark:text-green-400 transition-all shadow-sm">
                                <i className="fas fa-wallet text-2xl mb-2"></i>
                                <span className="font-bold text-sm">Etisalat</span>
                            </button>

                            <button type="button" onClick={() => window.location.href = `tel:*322*${electronicPaymentNumber}*${totalAmount}#`} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/30 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 text-indigo-600 dark:text-indigo-400 transition-all shadow-sm col-span-2 sm:col-span-1">
                                <i className="fas fa-wallet text-2xl mb-2"></i>
                                <span className="font-bold text-sm">WE Pay</span>
                            </button>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-6">
                            <h4 className="text-sm text-blue-800 dark:text-blue-300 font-bold mb-2 flex items-center gap-2">
                                <i className="fas fa-info-circle"></i>
                                تعليمات التحويل:
                            </h4>
                            <ul className="text-sm text-blue-700 dark:text-blue-400 list-disc list-inside space-y-2">
                                <li>قم بتحويل المبلغ الإجمالي: <strong className="font-black">{formatCurrency(totalAmount)}</strong></li>
                                <li>رقم المحفظة للتحويل: <strong className="font-black tracking-wider bg-white dark:bg-gray-800 px-2 py-1 rounded border border-blue-200 dark:border-blue-700">{electronicPaymentNumber}</strong></li>
                                <li>بعد التحويل، يرجى التقاط صورة للإيصال ورفعها بالأسفل.</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-sm mb-3 text-gray-900 dark:text-white">إرفاق إيصال الدفع <span className="text-red-500">*</span></h4>
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-white dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 transition-colors group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 group-hover:text-primary transition-colors mb-2"></i>
                                        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold text-primary">اضغط لرفع صورة</span> أو اسحب وأفلت</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">PNG, JPG, JPEG</p>
                                    </div>
                                    <input id="dropzone-file" type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>
                            {paymentProof && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                    <i className="fas fa-file-image text-lg"></i>
                                    <span className="truncate flex-grow font-medium">{paymentProof.name}</span>
                                    <button type="button" onClick={() => setPaymentProof(null)} className="text-red-500 hover:text-red-700 bg-white dark:bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                                        <i className="fas fa-times text-xs"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default CheckoutModal;