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
    const [isListening, setIsListening] = useState(false);
    
    const [productSearch, setProductSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const lastAddedItemRef = useRef<HTMLInputElement>(null);

    const [securityPassword, setSecurityPassword] = useState('');
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);
    const [securityError, setSecurityError] = useState('');

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
            setInvoiceType(existingSale.invoiceType || 'retail');
            setDiscount(existingSale.discount || 0);
            
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
            setBranchSoldFrom(currentUser.branch);
            setNotes('');
            setItems([]);
            setInvoiceType('retail');
            setDiscount(0);
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
        const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        return subtotal - (subtotal * discount / 100);
    }, [items, discount]);
    
    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        return products
            .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
            .slice(0, 5);
    }, [productSearch, products]);

    const startVoiceSearch = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("المتصفح لا يدعم البحث الصوتي.");
            return;
        }
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'ar-EG';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
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

    const handleItemChange = (index: number, field: 'quantity' | 'unitPrice', value: number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        
        // Adjust serial numbers array size if quantity changes
        if (field === 'quantity' && newItems[index].hasSerialNumber) {
            const currentSerials = newItems[index].serialNumbers || [];
            if (value > currentSerials.length) {
                // Add empty strings for new items
                newItems[index].serialNumbers = [
                    ...currentSerials, 
                    ...Array(value - currentSerials.length).fill('')
                ];
            } else if (value < currentSerials.length) {
                // Remove excess serials
                newItems[index].serialNumbers = currentSerials.slice(0, value);
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

        const saleData = {
            date, invoiceNumber, direction, branchSoldFrom, notes, totalAmount,
            sellerId: currentUser.id,
            sellerName: currentUser.name,
            source: 'المحل' as const,
            invoiceType,
            discount,
            items: items.map(({ productName, stock, ...rest }) => rest), // Remove productName & stock before saving
        };
        onSave(existingSale ? { ...saleData, id: existingSale.id } : saleData);
    };

    if (showSecurityCheck) {
        return (
            <Modal isOpen={isOpen} onClose={() => setShowSecurityCheck(false)} title="تأكيد الأمان" onSave={handleSecuritySubmit} saveLabel="تأكيد">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">يرجى إدخال كلمة مرور العمليات الحساسة للمتابعة.</p>
                    <input
                        type="password"
                        value={securityPassword}
                        onChange={(e) => { setSecurityPassword(e.target.value); setSecurityError(''); }}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        placeholder="كلمة المرور"
                        autoFocus
                    />
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
                    <div><label>الاتجاه</label><select value={direction} onChange={e => setDirection(e.target.value as DailySale['direction'])} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"><option>بيع</option><option>مرتجع</option><option>تبديل</option><option>ضمان</option></select></div>
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
                                        </div>
                                        <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} placeholder="الكمية" className="col-span-3 p-1 border rounded dark:bg-gray-600" ref={index === items.length - 1 ? lastAddedItemRef : null} min="1" />
                                        <input type="number" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))} placeholder="السعر" className="col-span-3 p-1 border rounded dark:bg-gray-600" step="0.01" />
                                        <button type="button" onClick={() => handleRemoveItem(index)} className="col-span-1 text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
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
                
                <div><label>ملاحظات</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"></textarea></div>
            </div>
        </Modal>
    );
};

export default DailySaleModal;