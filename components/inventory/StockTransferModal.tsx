
import React, { useState, useMemo } from 'react';
import useStore from '../../lib/store';
import { Product, Branch, StockTransfer } from '../../types';
import Modal from '../shared/Modal';

interface StockTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const branchNames: Record<Branch, string> = {
    main: 'المخزن الرئيسي',
    branch1: 'فرع 1',
    branch2: 'فرع 2',
    branch3: 'فرع 3',
};

const StockTransferModal: React.FC<StockTransferModalProps> = ({ isOpen, onClose }) => {
    const { products, addStockTransfer, storefrontSettings } = useStore(state => ({
        products: state.appData?.products || [],
        addStockTransfer: state.addStockTransfer,
        storefrontSettings: state.appData?.storefrontSettings
    }));

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [fromBranch, setFromBranch] = useState<Branch>('main');
    const [toBranch, setToBranch] = useState<Branch>('branch1');
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [securityPassword, setSecurityPassword] = useState('');
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);
    const [securityError, setSecurityError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
             setShowSecurityCheck(false);
             setSecurityPassword('');
             setSecurityError('');
        }
    }, [isOpen]);

    const filteredProducts = useMemo(() => 
        searchTerm ? products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 100) : [],
    [products, searchTerm]);

    const availableQuantity = selectedProduct ? selectedProduct.stock[fromBranch] : 0;

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

    const handleSubmit = async () => {
        if (!selectedProduct || quantity <= 0 || fromBranch === toBranch) {
            alert("يرجى التأكد من اختيار منتج، كمية صالحة، وأن الفروع مختلفة.");
            return;
        }
        if (quantity > availableQuantity) {
            alert("الكمية المطلوبة أكبر من الرصيد المتاح في الفرع المصدر.");
            return;
        }
        setIsLoading(true);
        try {
            const transferData: Omit<StockTransfer, 'id' | 'productName'> = {
                date: new Date().toISOString().split('T')[0],
                productId: selectedProduct.id,
                quantity,
                fromBranch,
                toBranch,
                notes,
            };
            await addStockTransfer(transferData);
            onClose();
        } catch (error) {
            console.error("Failed to add stock transfer:", error);
            alert(`فشل التحويل: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        } finally {
            setIsLoading(false);
        }
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
        <Modal isOpen={isOpen} onClose={onClose} title="تحويل مخزون جديد" onSave={handlePreSubmit} isLoading={isLoading}>
            <div className="space-y-4">
                <div>
                    <label>المنتج *</label>
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="ابحث عن منتج بالاسم أو الكود..."
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"
                    />
                    {searchTerm && (
                        <ul className="max-h-40 overflow-y-auto border rounded-md mt-1 dark:border-gray-600">
                            {filteredProducts.map(p => (
                                <li 
                                    key={p.id} 
                                    onClick={() => { setSelectedProduct(p); setSearchTerm(p.name); }}
                                    className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                    {p.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {selectedProduct && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                        <p><strong>المنتج المختار:</strong> {selectedProduct.name}</p>
                        <p><strong>الرصيد في الفروع:</strong> الرئيسي({selectedProduct.stock.main}), ف1({selectedProduct.stock.branch1}), ف2({selectedProduct.stock.branch2}), ف3({selectedProduct.stock.branch3})</p>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>من فرع *</label>
                        <select value={fromBranch} onChange={e => setFromBranch(e.target.value as Branch)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                            {Object.entries(branchNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label>إلى فرع *</label>
                        <select value={toBranch} onChange={e => setToBranch(e.target.value as Branch)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                            {Object.entries(branchNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label>الكمية *</label>
                    <input 
                        type="number" 
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        max={availableQuantity}
                        min="1"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"
                    />
                    <small className="text-gray-500">الرصيد المتاح في {branchNames[fromBranch]}: {availableQuantity}</small>
                </div>
                
                 <div>
                    <label>ملاحظات</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea>
                </div>
            </div>
        </Modal>
    );
};

export default StockTransferModal;
