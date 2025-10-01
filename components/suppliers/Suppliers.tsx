
import React, { useState, useMemo } from 'react';
import { Supplier, Payment } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import { formatDate, formatCurrency } from '../../lib/utils';

interface SuppliersProps {
    suppliers: Supplier[];
    setSuppliers: (suppliers: Supplier[]) => void;
    payments: Payment[];
    setPayments: (payments: Payment[]) => void;
}

const SupplierModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (s: Omit<Supplier, 'id'> & { id?: number }) => void; supplierToEdit: Supplier | null;
}> = ({ isOpen, onClose, onSave, supplierToEdit }) => {
    const [formData, setFormData] = useState({ name: '', contact: '', address: '' });
    React.useEffect(() => {
        // FIX: Handle optional 'address' property from supplierToEdit.
        if (supplierToEdit) {
            setFormData({ ...supplierToEdit, address: supplierToEdit.address || '' });
        } else {
            setFormData({ name: '', contact: '', address: '' });
        }
    }, [supplierToEdit, isOpen]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(supplierToEdit ? { ...formData, id: supplierToEdit.id } : formData);
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={supplierToEdit ? 'تعديل مورد' : 'إضافة مورد جديد'} onSave={handleSubmit}>
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
    isOpen: boolean; onClose: () => void; onSave: (p: Omit<Payment, 'id'> & { id?: number }) => void; paymentToEdit: Payment | null; suppliers: Supplier[];
}> = ({ isOpen, onClose, onSave, paymentToEdit, suppliers }) => {
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], supplierId: 0, payment: 0, invoiceTotal: 0, returnedItems: '', notes: '' });
    React.useEffect(() => {
        // FIX: Handle optional properties from paymentToEdit.
        if (paymentToEdit) {
            setFormData({ ...paymentToEdit, returnedItems: paymentToEdit.returnedItems || '', notes: paymentToEdit.notes || '' });
        } else {
            setFormData({ date: new Date().toISOString().split('T')[0], supplierId: suppliers[0]?.id || 0, payment: 0, invoiceTotal: 0, returnedItems: '', notes: '' });
        }
    }, [paymentToEdit, isOpen, suppliers]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: ['supplierId', 'payment', 'invoiceTotal'].includes(name) ? Number(value) : value }));
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(paymentToEdit ? { ...formData, id: paymentToEdit.id } : formData);
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={paymentToEdit ? 'تعديل دفعة' : 'إضافة دفعة للمورد'} onSave={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label>المورد *</label>
                    <select name="supplierId" value={formData.supplierId} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div><label>التاريخ *</label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div><label>مبلغ الدفعة *</label><input type="number" name="payment" value={formData.payment} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div><label>إجمالي الفاتورة *</label><input type="number" name="invoiceTotal" value={formData.invoiceTotal} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>المرتجعات</label><input type="text" name="returnedItems" value={formData.returnedItems} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea></div>
            </div>
        </Modal>
    );
};


const Suppliers: React.FC<SuppliersProps> = ({ suppliers, setSuppliers, payments, setPayments }) => {
    const [activeTab, setActiveTab] = useState<'suppliers' | 'payments'>('suppliers');
    
    const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);

    const handleSaveSupplier = (supplier: Omit<Supplier, 'id'> & { id?: number }) => {
        if (supplier.id) {
            setSuppliers(suppliers.map(s => s.id === supplier.id ? { ...s, ...supplier } : s));
        } else {
            const newId = Math.max(0, ...suppliers.map(s => s.id)) + 1;
            setSuppliers([...suppliers, { ...supplier, id: newId }]);
        }
        setSupplierModalOpen(false);
    };

    const handleDeleteSupplier = (id: number) => {
        if (window.confirm('هل أنت متأكد؟ سيتم حذف الدفعات المرتبطة بهذا المورد.')) {
            setSuppliers(suppliers.filter(s => s.id !== id));
            setPayments(payments.filter(p => p.supplierId !== id));
        }
    };

    const handleSavePayment = (payment: Omit<Payment, 'id'> & { id?: number }) => {
        if (payment.id) {
            setPayments(payments.map(p => p.id === payment.id ? { ...p, ...payment } : p));
        } else {
            const newId = Math.max(0, ...payments.map(p => p.id)) + 1;
            setPayments([...payments, { ...payment, id: newId }]);
        }
        setPaymentModalOpen(false);
    };

    const handleDeletePayment = (id: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
            setPayments(payments.filter(p => p.id !== id));
        }
    };
    
    const paymentsWithDetails = useMemo(() => {
        return payments
            .map(p => ({...p, supplierName: suppliers.find(s => s.id === p.supplierId)?.name || 'غير معروف'}))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [payments, suppliers]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-truck" title="الموردين والدفعات">
                <button onClick={() => { setSupplierToEdit(null); setSupplierModalOpen(true); }} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i> إضافة مورد
                </button>
                <button onClick={() => { setPaymentToEdit(null); setPaymentModalOpen(true); }} className="px-4 py-2 bg-secondary text-white rounded-lg flex items-center gap-2 hover:bg-secondary-dark transition shadow-md">
                    <i className="fas fa-money-bill"></i> إضافة دفعة
                </button>
            </SectionHeader>
            
            <div className="flex border-b dark:border-gray-700">
                <button onClick={() => setActiveTab('suppliers')} className={`px-6 py-3 font-semibold ${activeTab === 'suppliers' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>الموردين</button>
                <button onClick={() => setActiveTab('payments')} className={`px-6 py-3 font-semibold ${activeTab === 'payments' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>الدفعات</button>
            </div>

            {activeTab === 'suppliers' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">اسم المورد</th>
                                <th className="px-6 py-3">رقم الاتصال</th>
                                <th className="px-6 py-3">العنوان</th>
                                <th className="px-6 py-3">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map(s => (
                                <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{s.name}</td>
                                    <td className="px-6 py-4">{s.contact}</td>
                                    <td className="px-6 py-4">{s.address}</td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => { setSupplierToEdit(s); setSupplierModalOpen(true); }} className="text-blue-500"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => handleDeleteSupplier(s.id)} className="text-red-500"><i className="fas fa-trash"></i></button>
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
                                <th className="px-6 py-3">إجمالي الفاتورة</th>
                                <th className="px-6 py-3">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentsWithDetails.map(p => (
                                <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4">{formatDate(p.date)}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{p.supplierName}</td>
                                    <td className="px-6 py-4">{formatCurrency(p.payment)}</td>
                                    <td className="px-6 py-4">{formatCurrency(p.invoiceTotal)}</td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => { setPaymentToEdit(p); setPaymentModalOpen(true); }} className="text-blue-500"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => handleDeletePayment(p.id)} className="text-red-500"><i className="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <SupplierModal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} onSave={handleSaveSupplier} supplierToEdit={supplierToEdit} />
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} onSave={handleSavePayment} paymentToEdit={paymentToEdit} suppliers={suppliers} />
        </div>
    );
};

export default Suppliers;
