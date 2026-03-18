import React, { useState, useMemo } from 'react';
import { Supplier, Payment, PurchaseOrder } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import ConfirmationModal from '../shared/ConfirmationModal';
import PurchaseOrderModal from '../purchasing/PurchaseOrderModal';
import { formatDate, formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';

interface SuppliersProps {
    suppliers: Supplier[];
    payments: Payment[];
    addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
    updatePayment: (paymentId: number, updates: Partial<Payment>) => Promise<void>;
    deletePayment: (paymentId: number) => Promise<void>;
    purchaseOrders: PurchaseOrder[];
}

const SupplierModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (s: Omit<Supplier, 'id'> & { id?: number }) => void; supplierToEdit: Supplier | null;
}> = ({ isOpen, onClose, onSave, supplierToEdit }) => {
    const { storefrontSettings } = useStore(state => ({
        storefrontSettings: state.appData?.storefrontSettings
    }));
    const [formData, setFormData] = useState({ name: '', contact: '', address: '' });
    const [securityPassword, setSecurityPassword] = useState('');
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);
    const [securityError, setSecurityError] = useState('');

    React.useEffect(() => {
        if (supplierToEdit) {
            setFormData({ ...supplierToEdit, address: supplierToEdit.address || '' });
        } else {
            setFormData({ name: '', contact: '', address: '' });
        }
        setShowSecurityCheck(false);
        setSecurityPassword('');
        setSecurityError('');
    }, [supplierToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

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
        onSave(supplierToEdit ? { ...formData, id: supplierToEdit.id } : formData);
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
        <Modal isOpen={isOpen} onClose={onClose} title={supplierToEdit ? 'تعديل مورد' : 'إضافة مورد جديد'} onSave={handlePreSubmit}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المورد *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الاتصال *</label>
                    <input type="tel" name="contact" value={formData.contact} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">العنوان</label>
                    <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea>
                </div>
            </div>
        </Modal>
    );
};

const PaymentModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (p: Omit<Payment, 'id'> & { id?: number }) => void; paymentToEdit: Payment | null; suppliers: Supplier[]; purchaseOrders: PurchaseOrder[];
}> = ({ isOpen, onClose, onSave, paymentToEdit, suppliers, purchaseOrders }) => {
    const { storefrontSettings } = useStore(state => ({
        storefrontSettings: state.appData?.storefrontSettings
    }));
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], supplierId: 0, payment: 0, invoiceTotal: '' as number | '', returnedItems: '', notes: '', purchaseOrderId: undefined as number | undefined });
    const [securityPassword, setSecurityPassword] = useState('');
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);
    const [securityError, setSecurityError] = useState('');
    
    React.useEffect(() => {
        if (paymentToEdit) {
            setFormData({
                date: paymentToEdit.date,
                supplierId: paymentToEdit.supplierId,
                payment: paymentToEdit.payment,
                invoiceTotal: paymentToEdit.invoiceTotal || '',
                returnedItems: paymentToEdit.returnedItems || '',
                notes: paymentToEdit.notes || '',
                purchaseOrderId: paymentToEdit.purchaseOrderId,
            });
        } else {
            const initialSupplierId = suppliers[0]?.id || 0;
            setFormData({ date: new Date().toISOString().split('T')[0], supplierId: initialSupplierId, payment: 0, invoiceTotal: '', returnedItems: '', notes: '', purchaseOrderId: undefined });
        }
        setShowSecurityCheck(false);
        setSecurityPassword('');
        setSecurityError('');
    }, [paymentToEdit, isOpen, suppliers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let finalValue: string | number | undefined = value;
        if (['supplierId', 'payment'].includes(name)) {
            finalValue = Number(value);
        } else if (name === 'invoiceTotal') {
            finalValue = value === '' ? '' : Number(value);
        }
        if (name === 'purchaseOrderId') {
            finalValue = value ? Number(value) : undefined;
        }
        setFormData(p => ({ ...p, [name]: finalValue }));
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
        const finalData: any = {
            ...formData,
            invoiceTotal: formData.invoiceTotal === '' ? undefined : Number(formData.invoiceTotal)
        };
        
        // Remove undefined fields to prevent Firestore errors
        Object.keys(finalData).forEach(key => {
            if (finalData[key] === undefined) {
                delete finalData[key];
            }
        });

        onSave(paymentToEdit ? { ...finalData, id: paymentToEdit.id } : finalData);
    };

    const relevantPurchaseOrders = useMemo(() => {
        return purchaseOrders.filter(po => po.supplierId === formData.supplierId && po.status !== 'ملغي');
    }, [formData.supplierId, purchaseOrders]);

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
        <Modal isOpen={isOpen} onClose={onClose} title={paymentToEdit ? 'تعديل دفعة' : 'إضافة دفعة للمورد'} onSave={handlePreSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label>المورد *</label>
                    <select name="supplierId" value={formData.supplierId} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div><label>التاريخ *</label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div><label>مبلغ الدفعة *</label><input type="number" name="payment" value={formData.payment === 0 ? '' : formData.payment} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div><label>إجمالي الفاتورة (اختياري)</label><input type="number" name="invoiceTotal" value={formData.invoiceTotal} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                
                <div>
                    <label>ربط بأمر شراء (اختياري)</label>
                    <select name="purchaseOrderId" value={formData.purchaseOrderId || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                        <option value="">بدون</option>
                        {relevantPurchaseOrders.map(po => <option key={po.id} value={po.id}>PO-{po.id.toString().padStart(4, '0')} ({formatDate(po.orderDate)})</option>)}
                    </select>
                </div>

                <div><label>المرتجعات</label><input type="text" name="returnedItems" value={formData.returnedItems} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea></div>
            </div>
        </Modal>
    );
};


const SupplierDetails: React.FC<{
    supplier: Supplier;
    onBack: () => void;
    purchaseOrders: PurchaseOrder[];
    payments: Payment[];
    onViewOrder: (order: PurchaseOrder) => void;
    onEditOrder: (order: PurchaseOrder) => void;
    onDeleteOrder: (order: PurchaseOrder) => void;
}> = ({ supplier, onBack, purchaseOrders, payments, onViewOrder, onEditOrder, onDeleteOrder }) => {
    const supplierOrders = useMemo(() => purchaseOrders.filter(po => po.supplierId === supplier.id), [purchaseOrders, supplier.id]);
    const supplierPayments = useMemo(() => payments.filter(p => p.supplierId === supplier.id), [payments, supplier.id]);

    const totalInvoices = useMemo(() => supplierOrders.reduce((sum, po) => sum + (po.type === 'مرتجع' ? -po.totalAmount : po.totalAmount), 0), [supplierOrders]);
    const totalPaid = useMemo(() => supplierPayments.reduce((sum, p) => sum + p.payment, 0), [supplierPayments]);
    const remainingBalance = totalInvoices - totalPaid;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-2">
                    <i className="fas fa-arrow-right"></i> عودة للموردين
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">تفاصيل المورد: {supplier.name}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">إجمالي الفواتير</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalInvoices)}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">إجمالي المدفوع</div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">الرصيد المتبقي</div>
                    <div className={`text-2xl font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                        {formatCurrency(remainingBalance)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700 font-bold bg-gray-50 dark:bg-gray-700">الفواتير (أوامر الشراء)</div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">رقم الأمر</th>
                                    <th className="px-4 py-3">النوع</th>
                                    <th className="px-4 py-3">التاريخ</th>
                                    <th className="px-4 py-3">الإجمالي</th>
                                    <th className="px-4 py-3">الحالة</th>
                                    <th className="px-4 py-3">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {supplierOrders.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-4 text-center">لا توجد فواتير</td></tr>
                                ) : (
                                    supplierOrders.map(po => (
                                        <tr key={po.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-4 py-3">PO-{po.id.toString().padStart(4, '0')}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    po.type === 'مرتجع' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                                }`}>
                                                    {po.type || 'شراء'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{formatDate(po.orderDate)}</td>
                                            <td className="px-4 py-3">{formatCurrency(po.totalAmount)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    po.status === 'مكتمل' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                    po.status === 'ملغي' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                }`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => onViewOrder(po)} className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1" title="التفاصيل">
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                    <button onClick={() => onEditOrder(po)} className="text-green-500 hover:text-green-700 text-sm flex items-center gap-1" title="تعديل">
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button onClick={() => onDeleteOrder(po)} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1" title="حذف">
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700 font-bold bg-gray-50 dark:bg-gray-700">المدفوعات</div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">التاريخ</th>
                                    <th className="px-4 py-3">المبلغ</th>
                                    <th className="px-4 py-3">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {supplierPayments.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-4 text-center">لا توجد مدفوعات</td></tr>
                                ) : (
                                    supplierPayments.map(p => (
                                        <tr key={p.id} className="border-b dark:border-gray-700">
                                            <td className="px-4 py-3">{formatDate(p.date)}</td>
                                            <td className="px-4 py-3 text-green-600 font-bold">{formatCurrency(p.payment)}</td>
                                            <td className="px-4 py-3">{p.notes || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Suppliers: React.FC<SuppliersProps> = ({ suppliers, payments, addPayment, updatePayment, deletePayment, purchaseOrders }) => {
    const { addSupplier, updateSupplier, deleteSupplier, products, addProduct, addPurchaseOrder, updateProductStock, updatePurchaseOrder, deletePurchaseOrder } = useStore(state => ({
        addSupplier: state.addSupplier,
        updateSupplier: state.updateSupplier,
        deleteSupplier: state.deleteSupplier,
        products: state.appData?.products || [],
        addProduct: state.addProduct,
        addPurchaseOrder: state.addPurchaseOrder,
        updateProductStock: state.updateProductStock,
        updatePurchaseOrder: state.updatePurchaseOrder,
        deletePurchaseOrder: state.deletePurchaseOrder
    }));
    const [activeTab, setActiveTab] = useState<'suppliers' | 'payments'>('suppliers');
    
    const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
    
    const [isDirectStatementModalOpen, setDirectStatementModalOpen] = useState(false);
    const [isReturnModalOpen, setReturnModalOpen] = useState(false);
    const [orderToView, setOrderToView] = useState<PurchaseOrder | null>(null);
    const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);

    const [isDeleting, setIsDeleting] = useState(false);
    
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const handleSaveSupplier = (supplier: Omit<Supplier, 'id'> & { id?: number }) => {
        if (supplier.id) {
            updateSupplier(supplier.id, supplier);
        } else {
            addSupplier(supplier);
        }
        setSupplierModalOpen(false);
    };

    const confirmDeleteSupplier = async () => {
        if (!supplierToDelete) return;
        setIsDeleting(true);
        try {
            await deleteSupplier(supplierToDelete.id);
            setSupplierToDelete(null);
        } catch (error) {
            console.error("Failed to delete supplier:", error);
            alert(`فشل حذف المورد: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSavePayment = (payment: Omit<Payment, 'id'> & { id?: number }) => {
        if (payment.id) {
            updatePayment(payment.id, payment);
        } else {
            addPayment(payment);
        }
        setPaymentModalOpen(false);
    };

    const confirmDeletePayment = async () => {
        if (!paymentToDelete) return;
        setIsDeleting(true);
        try {
            await deletePayment(paymentToDelete.id);
            setPaymentToDelete(null);
        } catch (error) {
            console.error("Failed to delete payment:", error);
            alert(`فشل حذف الدفعة: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleSaveDirectStatement = async (order: Omit<PurchaseOrder, 'id'> & { id?: number }, branch: 'main' | 'branch1' | 'branch2' | 'branch3') => {
        try {
            // 1. Add the purchase order (it will be marked as 'مكتمل' by the modal)
            await addPurchaseOrder(order);
            
            // 2. Update the stock for each item
            for (const item of order.items) {
                await updateProductStock(item.productId, branch, item.quantity);
            }
            setDirectStatementModalOpen(false);
            alert('تم إضافة بيان البضاعة وتحديث المخزون بنجاح.');
        } catch (error) {
            console.error("Failed to save direct statement:", error);
            alert('حدث خطأ أثناء حفظ بيان البضاعة.');
        }
    };

    const handleSaveReturn = async (order: Omit<PurchaseOrder, 'id'> & { id?: number }, branch: 'main' | 'branch1' | 'branch2' | 'branch3') => {
        try {
            await addPurchaseOrder({ ...order, type: 'مرتجع', status: 'مكتمل' });
            
            for (const item of order.items) {
                await updateProductStock(item.productId, branch, -item.quantity);
            }
            setReturnModalOpen(false);
            alert('تم إضافة مردود المشتريات وتحديث المخزون بنجاح.');
        } catch (error) {
            console.error("Failed to save return:", error);
            alert('حدث خطأ أثناء حفظ مردود المشتريات.');
        }
    };

    const handleSaveOrderEdit = async (order: Omit<PurchaseOrder, 'id'> & { id?: number }) => {
        if (order.id) {
            try {
                await updatePurchaseOrder(order.id, order);
                setOrderToEdit(null);
                alert('تم تحديث الفاتورة بنجاح.');
            } catch (error) {
                console.error("Failed to update order:", error);
                alert('حدث خطأ أثناء تحديث الفاتورة.');
            }
        }
    };

    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;
        setIsDeleting(true);
        try {
            await deletePurchaseOrder(orderToDelete.id);
            setOrderToDelete(null);
            alert('تم حذف الفاتورة بنجاح.');
        } catch (error) {
            console.error("Failed to delete order:", error);
            alert(`فشل حذف الفاتورة: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const suppliersWithBalance = useMemo(() => {
        return suppliers.map(s => {
            const supplierOrders = purchaseOrders.filter(po => po.supplierId === s.id);
            const supplierPayments = payments.filter(p => p.supplierId === s.id);
            const totalInvoices = supplierOrders.reduce((sum, po) => sum + (po.type === 'مرتجع' ? -po.totalAmount : po.totalAmount), 0);
            const totalPaid = supplierPayments.reduce((sum, p) => sum + p.payment, 0);
            return { ...s, totalInvoices, totalPaid, remainingBalance: totalInvoices - totalPaid };
        });
    }, [suppliers, purchaseOrders, payments]);

    const dashboardStats = useMemo(() => {
        const totalSuppliers = suppliers.length;
        const totalInvoices = suppliersWithBalance.reduce((sum, s) => sum + s.totalInvoices, 0);
        const totalPaid = suppliersWithBalance.reduce((sum, s) => sum + s.totalPaid, 0);
        const totalDebt = suppliersWithBalance.reduce((sum, s) => sum + (s.remainingBalance > 0 ? s.remainingBalance : 0), 0);
        return { totalSuppliers, totalInvoices, totalPaid, totalDebt };
    }, [suppliersWithBalance, suppliers.length]);

    const paymentsWithDetails = useMemo(() => {
        return payments
            .map(p => ({...p, supplierName: suppliers.find(s => s.id === p.supplierId)?.name || 'غير معروف'}))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [payments, suppliers]);

    if (selectedSupplier) {
        return (
            <>
                <SupplierDetails
                    supplier={selectedSupplier}
                    onBack={() => setSelectedSupplier(null)}
                    purchaseOrders={purchaseOrders}
                    payments={payments}
                    onViewOrder={setOrderToView}
                    onEditOrder={setOrderToEdit}
                    onDeleteOrder={setOrderToDelete}
                />
            </>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-truck" title="الموردين والدفعات">
                <button onClick={() => { setSupplierToEdit(null); setSupplierModalOpen(true); }} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i> إضافة مورد
                </button>
                <button onClick={() => { setPaymentToEdit(null); setPaymentModalOpen(true); }} className="px-4 py-2 bg-secondary text-white rounded-lg flex items-center gap-2 hover:bg-secondary-dark transition shadow-md">
                    <i className="fas fa-money-bill"></i> إضافة دفعة
                </button>
                <button onClick={() => setDirectStatementModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-md">
                    <i className="fas fa-file-invoice"></i> بيان بضاعة مباشر
                </button>
                <button onClick={() => setReturnModalOpen(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700 transition shadow-md">
                    <i className="fas fa-undo"></i> مردودات مشتريات
                </button>
            </SectionHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-xl">
                        <i className="fas fa-users"></i>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الموردين</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalSuppliers}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 text-xl">
                        <i className="fas fa-file-invoice-dollar"></i>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الفواتير</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(dashboardStats.totalInvoices)}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 text-xl">
                        <i className="fas fa-money-check-alt"></i>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المدفوعات</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(dashboardStats.totalPaid)}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-300 text-xl">
                        <i className="fas fa-hand-holding-usd"></i>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المديونية</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(dashboardStats.totalDebt)}</p>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center border-b dark:border-gray-700 pb-4 gap-4">
                <div className="flex">
                    <button onClick={() => setActiveTab('suppliers')} className={`px-6 py-3 font-semibold ${activeTab === 'suppliers' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>الموردين</button>
                    <button onClick={() => setActiveTab('payments')} className={`px-6 py-3 font-semibold ${activeTab === 'payments' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>الدفعات</button>
                </div>
                <div className="w-full sm:w-64">
                    <select 
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                        onChange={(e) => {
                            const supplier = suppliers.find(s => s.id === Number(e.target.value));
                            if (supplier) setSelectedSupplier(supplier);
                        }}
                        value=""
                    >
                        <option value="" disabled>بحث عن مورد وعرض تفاصيله...</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {activeTab === 'suppliers' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">اسم المورد</th>
                                <th className="px-6 py-3">رقم الاتصال</th>
                                <th className="px-6 py-3">العنوان</th>
                                <th className="px-6 py-3">الرصيد المتبقي</th>
                                <th className="px-6 py-3">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliersWithBalance.map(s => (
                                <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{s.name}</td>
                                    <td className="px-6 py-4">{s.contact}</td>
                                    <td className="px-6 py-4">{s.address}</td>
                                    <td className={`px-6 py-4 font-bold ${s.remainingBalance > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                        {formatCurrency(s.remainingBalance)}
                                    </td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => setSelectedSupplier(s)} className="text-green-600 hover:text-green-800" title="عرض التفاصيل"><i className="fas fa-eye"></i></button>
                                        <button onClick={() => { setSupplierToEdit(s); setSupplierModalOpen(true); }} className="text-blue-500" title="تعديل"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => setSupplierToDelete(s)} className="text-red-500 w-6 text-center" title="حذف">
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'payments' && (
                 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">التاريخ</th>
                                <th className="px-6 py-3">اسم المورد</th>
                                <th className="px-6 py-3">مبلغ الدفعة</th>
                                <th className="px-6 py-3">أمر الشراء</th>
                                <th className="px-6 py-3">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentsWithDetails.map(p => (
                                <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4">{formatDate(p.date)}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{p.supplierName}</td>
                                    <td className="px-6 py-4">{formatCurrency(p.payment)}</td>
                                    <td className="px-6 py-4">{p.purchaseOrderId ? `PO-${p.purchaseOrderId.toString().padStart(4, '0')}` : '-'}</td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => { setPaymentToEdit(p); setPaymentModalOpen(true); }} className="text-blue-500"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => setPaymentToDelete(p)} className="text-red-500 w-6 text-center">
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <SupplierModal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} onSave={handleSaveSupplier} supplierToEdit={supplierToEdit} />
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} onSave={handleSavePayment} paymentToEdit={paymentToEdit} suppliers={suppliers} purchaseOrders={purchaseOrders}/>

            {isDirectStatementModalOpen && (
                <PurchaseOrderModal
                    isOpen={isDirectStatementModalOpen}
                    onClose={() => setDirectStatementModalOpen(false)}
                    onSave={() => {}} // Not used for direct statement
                    orderToEdit={null}
                    suppliers={suppliers}
                    products={products}
                    addProduct={addProduct}
                    isDirectStatement={true}
                    onSaveDirect={handleSaveDirectStatement}
                />
            )}

            {isReturnModalOpen && (
                <PurchaseOrderModal
                    isOpen={isReturnModalOpen}
                    onClose={() => setReturnModalOpen(false)}
                    onSave={() => {}} // Not used for direct statement
                    orderToEdit={null}
                    suppliers={suppliers}
                    products={products}
                    addProduct={addProduct}
                    isDirectStatement={true}
                    onSaveDirect={handleSaveReturn}
                    isReturn={true}
                />
            )}

            {orderToView && (
                <PurchaseOrderModal
                    isOpen={!!orderToView}
                    onClose={() => setOrderToView(null)}
                    onSave={() => {}} // View only
                    orderToEdit={orderToView}
                    suppliers={suppliers}
                    products={products}
                    isViewOnly={true}
                />
            )}

            {orderToEdit && (
                <PurchaseOrderModal
                    isOpen={!!orderToEdit}
                    onClose={() => setOrderToEdit(null)}
                    onSave={handleSaveOrderEdit}
                    orderToEdit={orderToEdit}
                    suppliers={suppliers}
                    products={products}
                    isViewOnly={false}
                />
            )}

            {orderToDelete && (
                <Modal isOpen={!!orderToDelete} onClose={() => setOrderToDelete(null)} title="تأكيد حذف الفاتورة">
                    <div className="p-6">
                        <p className="mb-6 text-gray-700">هل أنت متأكد من أنك تريد حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setOrderToDelete(null)}
                                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                                disabled={isDeleting}
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmDeleteOrder}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {supplierToDelete && (
                <ConfirmationModal
                    isOpen={!!supplierToDelete}
                    onClose={() => setSupplierToDelete(null)}
                    onConfirm={confirmDeleteSupplier}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف المورد "${supplierToDelete.name}"؟ سيتم حذف جميع الدفعات المرتبطة به.`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}

            {paymentToDelete && (
                <ConfirmationModal
                    isOpen={!!paymentToDelete}
                    onClose={() => setPaymentToDelete(null)}
                    onConfirm={confirmDeletePayment}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف هذه الدفعة بقيمة ${formatCurrency(paymentToDelete.payment)}؟`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}
        </div>
    );
};

export default Suppliers;