import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DailySale, User, Product, Branch, SaleItem, Role } from '../../types';
import { formatCurrency, normalizeSaleItems } from '../../lib/utils';
import Modal from '../shared/Modal';
import useStore from '../../lib/store';

type EditableSaleItem = SaleItem & { productName: string; stock: number; hasSerialNumber?: boolean };

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
    const { storefrontSettings } = useStore(state => ({
        storefrontSettings: state.appData?.storefrontSettings
    }));
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [items, setItems] = useState<EditableSaleItem[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [direction, setDirection] = useState<DailySale['direction']>('بيع');
    const [branchSoldFrom, setBranchSoldFrom] = useState<Branch>(currentUser.branch);
    const [notes, setNotes] = useState('');
    
    const [invoiceType, setInvoiceType] = useState<'wholesale' | 'retail'>('retail');
    const [discount, setDiscount] = useState<number>(0);
    const [cashierLocation, setCashierLocation] = useState<'فوق' | 'تحت'>('تحت');
    const [warrantyPeriod, setWarrantyPeriod] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'نقدى' | 'إلكترونى' | 'مختلط' | 'آجل'>('نقدى');
    const [cashAmount, setCashAmount] = useState<number>(0);
    const [electronicAmount, setElectronicAmount] = useState<number>(0);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    
    const [isListening, setIsListening] = useState(false);
    
    const [productSearch, setProductSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const lastAddedItemRef = useRef<HTMLInputElement>(null);

    const [securityPassword, setSecurityPassword] = useState('');
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);
    const [securityError, setSecurityError] = useState('');

    const branchNames: Record<Branch, string> = {
        main: 'المخزن',
        branch1: 'الرئيسي',
        branch2: 'فرع 1',
        branch3: 'فرع 2',
    };

    const getStockBreakdown = (product: Product): string => {
        return `رصيد: المخزن(${product.stock.main}), الرئيسي(${product.stock.branch1}), ف1(${product.stock.branch2}), ف2(${product.stock.branch3})`;
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
            setInvoiceType(existingSale.invoiceType || 'retail');
            setDiscount(existingSale.discount || 0);
            setCashierLocation(existingSale.cashierLocation || 'تحت');
            setWarrantyPeriod(existingSale.notes?.match(/ضمان: (.*)/)?.[1] || '');
            setPaymentMethod(existingSale.paymentMethod || 'نقدى');
            setCashAmount(existingSale.cashAmount || 0);
            setElectronicAmount(existingSale.electronicAmount || 0);
            setCustomerName(existingSale.customerName || '');
            setCustomerPhone(existingSale.customerPhone || '');
            
            const itemsToEdit = normalizeSaleItems(existingSale);
            const editableItems = itemsToEdit.map(item => {
                const product = products.find(p => p.id === item.productId);
                return {
                    ...item,
                    productName: product?.name || 'صنف محذوف',
                    stock: product?.stock[existingSale.branchSoldFrom] || 0,
                    hasSerialNumber: product?.hasSerialNumber || false,
                    serialNumbers: item.serialNumbers || [],
                };
            });
            setItems(editableItems);
        } else {
            setInvoiceNumber(generateInvoiceNumber());
            setDate(new Date().toISOString().split('T')[0]);
            setDirection('بيع');
            setBranchSoldFrom('branch1');
            setNotes('');
            setItems([]);
            setInvoiceType('retail');
            setDiscount(0);
            setCashierLocation('تحت');
            setWarrantyPeriod('');
            setPaymentMethod('نقدى');
            setCashAmount(0);
            setElectronicAmount(0);
            setCustomerName('');
            setCustomerPhone('');
        }
        setShowSecurityCheck(false);
        setSecurityPassword('');
        setSecurityError('');
    }, [existingSale, dailySales, currentUser, products, isOpen]);

    // Update prices when invoice type changes
    useEffect(() => {
        setItems(prevItems => prevItems.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return item;
            const newPrice = invoiceType === 'wholesale' 
                ? (product.wholesalePrice || product.sellingPrice) 
                : (product.retailPrice || product.sellingPrice);
            return { ...item, unitPrice: newPrice };
        }));
        setDiscount(0); // Reset discount when type changes
    }, [invoiceType, products]);

    useEffect(() => {
        if (lastAddedItemRef.current) {
            lastAddedItemRef.current.focus();
            lastAddedItemRef.current.select();
        }
    }, [items.length]);

    // BUG FIX: Update item stock info when the selling branch changes
    useEffect(() => {
        setItems(prevItems =>
            prevItems.map(item => {
                const product = products.find(p => p.id === item.productId);
                return {
                    ...item,
                    stock: product ? product.stock[branchSoldFrom] : 0,
                };
            })
        );
    }, [branchSoldFrom, products]);

    const totalAmount = useMemo(() => {
        const subtotal = items.reduce((sum, item) => {
            const itemTotal = item.quantity * item.unitPrice;
            return item.isReturn ? sum - itemTotal : sum + itemTotal;
        }, 0);
        return subtotal - (subtotal * discount / 100);
    }, [items, discount]);
    
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const { searchProducts } = useStore(state => ({
        searchProducts: state.searchProducts
    }));

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!productSearch.trim()) {
                setFilteredProducts([]);
                return;
            }
            const results = await searchProducts(productSearch);
            setFilteredProducts(results.slice(0, 5));
        };
        
        const timeoutId = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeoutId);
    }, [productSearch, searchProducts]);

    const startVoiceSearch = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("المتصفح لا يدعم البحث الصوتي.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-EG';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setProductSearch(transcript);
            setShowSuggestions(true);
        };
        recognition.start();
    };

    const handleProductSelect = (product: Product) => {
        if (items.some(item => item.productId === product.id)) return;
        
        const price = invoiceType === 'wholesale' 
            ? (product.wholesalePrice || product.sellingPrice) 
            : (product.retailPrice || product.sellingPrice);

        const newItem: EditableSaleItem = {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: price,
            itemType: product.category as SaleItem['itemType'] || 'أخرى',
            stock: product.stock[branchSoldFrom],
            hasSerialNumber: product.hasSerialNumber,
            serialNumbers: [],
            isReturn: direction === 'مرتجع' || direction === 'تبديل', // Default to true for returns/exchanges, user can uncheck if it's a new item
        };
        setItems(prev => [...prev, newItem]);
        setProductSearch('');
        setShowSuggestions(false);
    };

    const handleSerialNumberChange = (index: number, serialIndex: number, value: string) => {
        const newItems = [...items];
        const serials = [...(newItems[index].serialNumbers || [])];
        serials[serialIndex] = value;
        newItems[index] = { ...newItems[index], serialNumbers: serials };
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: 'quantity' | 'unitPrice' | 'isReturn', value: number | boolean) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        
        // Adjust serial numbers array size if quantity changes
        if (field === 'quantity' && newItems[index].hasSerialNumber) {
            const currentSerials = newItems[index].serialNumbers || [];
            const numValue = value as number;
            if (numValue > currentSerials.length) {
                // Add empty strings for new items
                newItems[index].serialNumbers = [
                    ...currentSerials, 
                    ...Array(numValue - currentSerials.length).fill('')
                ];
            } else if (numValue < currentSerials.length) {
                // Remove excess serials
                newItems[index].serialNumbers = currentSerials.slice(0, numValue);
            }
        }
        
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };
    
    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (storefrontSettings?.adminPassword) {
            setShowSecurityCheck(true);
        } else {
            handleSubmit();
        }
    };

    const handleSecuritySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (securityPassword === storefrontSettings?.adminPassword) {
            handleSubmit();
        } else {
            setSecurityError('كلمة المرور غير صحيحة');
        }
    };

    const handleSubmit = () => {
        if (items.length === 0) {
            alert('يجب إضافة صنف واحد على الأقل للفاتورة.');
            return;
        }

        let finalCashAmount = cashAmount;
        let finalElectronicAmount = electronicAmount;

        if (paymentMethod === 'نقدى' && cashAmount === 0) {
            finalCashAmount = Math.abs(totalAmount);
        } else if (paymentMethod === 'إلكترونى' && electronicAmount === 0) {
            finalElectronicAmount = Math.abs(totalAmount);
        }

        for (const item of items) {
             const product = products.find(p => p.id === item.productId);
             if (product && item.quantity > product.stock[branchSoldFrom] && direction === 'بيع') {
                alert(`الكمية المطلوبة (${item.quantity}) من صنف "${item.productName}" أكبر من الرصيد المتاح في هذا الفرع (${product.stock[branchSoldFrom]})`);
                return;
             }
             if (item.hasSerialNumber) {
                 const enteredSerials = item.serialNumbers?.filter(s => s.trim() !== '') || [];
                 if (enteredSerials.length !== item.quantity) {
                     alert(`يرجى إدخال جميع الأرقام التسلسلية للصنف "${item.productName}". مطلوب ${item.quantity}، تم إدخال ${enteredSerials.length}.`);
                     return;
                 }
             }
        }

        const finalNotes = direction === 'ضمان' && warrantyPeriod ? `${notes}\nضمان: ${warrantyPeriod}`.trim() : notes;

        const saleData = {
            date, 
            invoiceNumber, 
            direction, 
            branchSoldFrom, 
            notes: finalNotes || '', // Ensure notes is not undefined
            totalAmount,
            sellerId: currentUser.id,
            sellerName: currentUser.name,
            source: 'المحل' as const,
            invoiceType,
            discount: discount || 0, // Ensure discount is not undefined
            cashierLocation,
            paymentMethod,
            cashAmount: paymentMethod === 'نقدى' ? finalCashAmount : (paymentMethod === 'إلكترونى' || paymentMethod === 'آجل' ? 0 : finalCashAmount),
            electronicAmount: paymentMethod === 'إلكترونى' ? finalElectronicAmount : (paymentMethod === 'نقدى' || paymentMethod === 'آجل' ? 0 : finalElectronicAmount),
            customerName,
            customerPhone,
            remainingDebt: paymentMethod === 'آجل' ? totalAmount : (paymentMethod === 'نقدى' ? totalAmount - (Math.sign(totalAmount) * finalCashAmount) : (paymentMethod === 'إلكترونى' ? totalAmount - (Math.sign(totalAmount) * finalElectronicAmount) : totalAmount - (Math.sign(totalAmount) * (finalCashAmount + finalElectronicAmount)))),
            items: items.map(({ stock, ...rest }) => ({
                ...rest,
                hasSerialNumber: rest.hasSerialNumber || false, // Ensure boolean
                serialNumbers: rest.serialNumbers || [], // Ensure array
                itemType: rest.itemType || 'أخرى' // Ensure string
            })), 
        };
        onSave(existingSale ? { ...saleData, id: existingSale.id } : saleData);
    };

    const [showSecurityPassword, setShowSecurityPassword] = useState(false);

    if (showSecurityCheck) {
        return (
            <Modal isOpen={isOpen} onClose={() => setShowSecurityCheck(false)} title="تأكيد الأمان" onSave={handleSecuritySubmit} saveLabel="تأكيد">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">يرجى إدخال كلمة مرور العمليات الحساسة للمتابعة.</p>
                    <div className="relative">
                        <input
                            type={showSecurityPassword ? "text" : "password"}
                            value={securityPassword}
                            onChange={(e) => { setSecurityPassword(e.target.value); setSecurityError(''); }}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                            placeholder="كلمة المرور"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => setShowSecurityPassword(!showSecurityPassword)}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <i className={`fas ${showSecurityPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                    {securityError && <p className="text-red-500 text-sm">{securityError}</p>}
                    <button type="button" onClick={() => setShowSecurityCheck(false)} className="text-sm text-gray-500 underline">رجوع</button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingSale ? 'تعديل فاتورة' : 'فاتورة جديدة'} onSave={handlePreSubmit}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label>التاريخ</label><input type="date" value={date} readOnly className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 bg-gray-100" /></div>
                    <div><label>رقم الفاتورة</label><input type="text" value={invoiceNumber} readOnly className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 bg-gray-100" /></div>
                    <div><label>التوجيه</label><select value={direction} onChange={e => setDirection(e.target.value as DailySale['direction'])} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"><option>بيع</option><option>مرتجع</option><option>تبديل</option><option>ضمان</option><option>هدية</option></select></div>
                    <div>
                        <label>نوع الفاتورة</label>
                        <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as 'wholesale' | 'retail')} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                            <option value="retail">قطاعي</option>
                            <option value="wholesale">جملة</option>
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div>
                        <label>الكاشير</label>
                        <select 
                            value={cashierLocation} 
                            onChange={e => setCashierLocation(e.target.value as 'فوق' | 'تحت')} 
                            className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="تحت">كاشير تحت</option>
                            <option value="فوق">كاشير فوق</option>
                        </select>
                    </div>
                    {direction === 'ضمان' && (
                        <div>
                            <label>فترة الضمان</label>
                            <select 
                                value={warrantyPeriod} 
                                onChange={e => setWarrantyPeriod(e.target.value)} 
                                className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">اختر فترة الضمان</option>
                                <option value="٣ شهور">٣ شهور</option>
                                <option value="٦ شهور">٦ شهور</option>
                                <option value="سنة">سنة</option>
                                <option value="سنتين">سنتين</option>
                                <option value="٣ سنين">٣ سنين</option>
                            </select>
                        </div>
                    )}
                </div>
                
                <div className="border-t pt-4 mt-4">
                    <h4 className="font-bold mb-2">الأصناف</h4>
                    <div className="relative mb-2 flex gap-2">
                        <div className="relative flex-grow">
                            <input 
                                type="text" 
                                value={productSearch} 
                                onChange={e => { setProductSearch(e.target.value); setShowSuggestions(true); }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                className="w-full p-2 pl-10 border rounded dark:bg-gray-700 dark:border-gray-600" 
                                placeholder="اكتب اسم الصنف أو الكود لإضافته..."/>
                            <button 
                                type="button" 
                                onClick={startVoiceSearch} 
                                className={`absolute left-2 top-1/2 transform -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-primary'}`}
                                title="بحث صوتي"
                            >
                                <i className="fas fa-microphone"></i>
                            </button>
                        </div>
                        {filteredProducts.length > 0 && showSuggestions && (
                            <ul className="absolute z-10 w-full bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-md mt-10 max-h-60 overflow-y-auto shadow-lg">
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
                                <div key={item.productId} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded mb-2">
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-5">
                                            <span className="truncate block font-medium">{item.productName}</span>
                                            {product && <small className="text-xs text-gray-500 dark:text-gray-400 block">{getStockBreakdown(product)}</small>}
                                            {item.hasSerialNumber && <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">يتطلب سيريال</span>}
                                            {(direction === 'مرتجع' || direction === 'تبديل') && (
                                                <label className="flex items-center gap-1 mt-1 text-xs font-bold text-red-500">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.isReturn || false} 
                                                        onChange={e => handleItemChange(index, 'isReturn', e.target.checked)}
                                                        className="rounded text-red-500 focus:ring-red-500"
                                                    />
                                                    صنف مرتجع (يخصم من الفاتورة)
                                                </label>
                                            )}
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-xs text-gray-500 mb-1">عدد</label>
                                            <input type="number" value={item.quantity === 0 ? '' : item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} placeholder="الكمية" className="w-full p-1 border rounded dark:bg-gray-600" ref={index === items.length - 1 ? lastAddedItemRef : null} min="1" />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-xs text-gray-500 mb-1">السعر</label>
                                            <input type="number" value={item.unitPrice === 0 ? '' : item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))} placeholder="السعر" className="w-full p-1 border rounded dark:bg-gray-600" step="0.01" />
                                        </div>
                                        <div className="col-span-1 flex items-end pb-1">
                                            <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 w-full text-center"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                    
                                    {/* Serial Number Inputs */}
                                    {item.hasSerialNumber && item.quantity > 0 && (
                                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {Array.from({ length: item.quantity }).map((_, serialIndex) => (
                                                <input
                                                    key={serialIndex}
                                                    type="text"
                                                    placeholder={`سيريال قطعة ${serialIndex + 1}`}
                                                    value={item.serialNumbers?.[serialIndex] || ''}
                                                    onChange={(e) => handleSerialNumberChange(index, serialIndex, e.target.value)}
                                                    className="p-1 text-sm border rounded dark:bg-gray-600 border-blue-300 dark:border-blue-500"
                                                    required
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center mt-4 border-t pt-4">
                    <div className="flex items-center gap-2 mb-2 md:mb-0">
                        <span className="font-bold">خصم:</span>
                        {invoiceType === 'retail' ? (
                            <>
                                <button type="button" onClick={() => setDiscount(discount === 5 ? 0 : 5)} className={`px-3 py-1 rounded border ${discount === 5 ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>5%</button>
                                <button type="button" onClick={() => setDiscount(discount === 10 ? 0 : 10)} className={`px-3 py-1 rounded border ${discount === 10 ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>10%</button>
                                <button type="button" onClick={() => setDiscount(discount === 15 ? 0 : 15)} className={`px-3 py-1 rounded border ${discount === 15 ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>15%</button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={() => setDiscount(discount === 3 ? 0 : 3)} className={`px-3 py-1 rounded border ${discount === 3 ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>3%</button>
                                <button type="button" onClick={() => setDiscount(discount === 5 ? 0 : 5)} className={`px-3 py-1 rounded border ${discount === 5 ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>5%</button>
                            </>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">المجموع: {formatCurrency(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}</div>
                        {discount > 0 && <div className="text-sm text-red-500">خصم ({discount}%): -{formatCurrency(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * discount / 100)}</div>}
                        <div className="font-bold text-2xl">الإجمالي النهائي: {formatCurrency(totalAmount)}</div>
                    </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                    <h4 className="font-bold mb-4 text-lg">تفاصيل الدفع</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label>طريقة الدفع</label>
                            <select 
                                value={paymentMethod} 
                                onChange={e => setPaymentMethod(e.target.value as 'نقدى' | 'إلكترونى' | 'مختلط' | 'آجل')} 
                                className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="نقدى">نقدى</option>
                                <option value="إلكترونى">إلكترونى</option>
                                <option value="مختلط">مختلط</option>
                                <option value="آجل">آجل</option>
                            </select>
                        </div>
                        {paymentMethod === 'مختلط' && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label>المبلغ النقدى</label>
                                    <input type="number" value={cashAmount === 0 ? '' : cashAmount} onChange={e => {
                                        const val = Number(e.target.value);
                                        setCashAmount(val);
                                        setElectronicAmount(Math.max(0, Math.abs(totalAmount) - val));
                                    }} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                                </div>
                                <div>
                                    <label>المبلغ الإلكترونى</label>
                                    <input type="number" value={electronicAmount === 0 ? '' : electronicAmount} onChange={e => {
                                        const val = Number(e.target.value);
                                        setElectronicAmount(val);
                                        setCashAmount(Math.max(0, Math.abs(totalAmount) - val));
                                    }} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                                </div>
                            </div>
                        )}
                        {(paymentMethod === 'نقدى' || paymentMethod === 'إلكترونى') && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="flex justify-between items-center">
                                        <span>المدفوع ({paymentMethod})</span>
                                        <button 
                                            type="button" 
                                            onClick={() => paymentMethod === 'نقدى' ? setCashAmount(Math.abs(totalAmount)) : setElectronicAmount(Math.abs(totalAmount))}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            مدفوع بالكامل
                                        </button>
                                    </label>
                                    <input 
                                        type="number" 
                                        value={paymentMethod === 'نقدى' ? (cashAmount === 0 ? '' : cashAmount) : (electronicAmount === 0 ? '' : electronicAmount)} 
                                        onChange={e => paymentMethod === 'نقدى' ? setCashAmount(Number(e.target.value)) : setElectronicAmount(Number(e.target.value))} 
                                        className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" 
                                    />
                                </div>
                                <div>
                                    <label>المتبقي (آجل)</label>
                                    <input 
                                        type="number" 
                                        value={Math.max(0, Math.abs(totalAmount) - (paymentMethod === 'نقدى' ? cashAmount : electronicAmount))} 
                                        readOnly 
                                        className="w-full mt-1 p-2 border rounded bg-gray-100 dark:bg-gray-600 dark:border-gray-500 text-red-500 font-bold" 
                                    />
                                </div>
                            </div>
                        )}
                        {(paymentMethod === 'آجل' || paymentMethod === 'مختلط' || (paymentMethod === 'نقدى' && Math.abs(totalAmount) - cashAmount > 0) || (paymentMethod === 'إلكترونى' && Math.abs(totalAmount) - electronicAmount > 0)) && (
                            <>
                                <div>
                                    <label>اسم العميل</label>
                                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="اسم العميل (مطلوب للآجل)" required />
                                </div>
                                <div>
                                    <label>رقم هاتف العميل</label>
                                    <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="رقم الهاتف" />
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                <div><label>ملاحظات</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"></textarea></div>
            </div>
        </Modal>
    );
};

export default DailySaleModal;