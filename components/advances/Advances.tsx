import React, { useState, useMemo } from 'react';
import { Advance, Employee } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';

interface AdvancesProps {
    advances: Advance[];
    addAdvance: (advance: Omit<Advance, 'id'>) => Promise<void>;
    updateAdvance: (advanceId: number, updates: Partial<Advance>) => Promise<void>;
    deleteAdvance: (advanceId: number) => Promise<void>;
    employees: Employee[];
}


const AdvanceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (advance: Omit<Advance, 'id'> & { id?: number }) => void;
    advanceToEdit: Advance | null;
    employees: Employee[];
}> = ({ isOpen, onClose, onSave, advanceToEdit, employees }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        employeeId: 0,
        amount: 0,
        payment: 0,
        notes: ''
    });

    React.useEffect(() => {
        if (advanceToEdit) {
            setFormData({ ...advanceToEdit, notes: advanceToEdit.notes || '' });
        } else {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                employeeId: employees[0]?.id || 0,
                amount: 0,
                payment: 0,
                notes: ''
            });
        }
    }, [advanceToEdit, isOpen, employees]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['employeeId', 'amount', 'payment'].includes(name) ? Number(value) : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation based on mode
        if (formData.amount > 0 && formData.payment > formData.amount) {
            alert('المبلغ المسدد لا يمكن أن يكون أكبر من مبلغ السلفة');
            return;
        }
        
        onSave(advanceToEdit ? { ...formData, id: advanceToEdit.id } : formData);
    };

    const isRepayment = advanceToEdit ? advanceToEdit.amount === 0 && advanceToEdit.payment > 0 : formData.amount === 0 && formData.payment > 0;
    
    // We can infer mode from a prop, let's just make it generic or add a checkbox
    const [mode, setMode] = useState<'advance' | 'repayment'>(
        advanceToEdit && advanceToEdit.amount === 0 ? 'repayment' : 'advance'
    );
    
    React.useEffect(() => {
        if (!advanceToEdit) {
            setMode('advance');
            setFormData(prev => ({ ...prev, amount: 0, payment: 0 }));
        } else {
            setMode(advanceToEdit.amount === 0 ? 'repayment' : 'advance');
        }
    }, [advanceToEdit]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={advanceToEdit ? 'تعديل السجل' : 'إضافة حركة جديدة'} onSave={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!advanceToEdit && (
                    <div className="md:col-span-2 flex gap-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={mode === 'advance'} onChange={() => { setMode('advance'); setFormData(prev => ({ ...prev, amount: 0, payment: 0 })); }} />
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">سلفة جديدة</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-green-600 dark:text-green-400">
                            <input type="radio" checked={mode === 'repayment'} onChange={() => { setMode('repayment'); setFormData(prev => ({ ...prev, amount: 0, payment: 0 })); }} />
                            <span className="text-sm font-bold">دفعة سداد</span>
                        </label>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموظف *</label>
                    <select name="employeeId" value={formData.employeeId} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                        <option value="">اختر الموظف</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ *</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                
                {mode === 'advance' ? (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مبلغ السلفة (ج.م) *</label>
                            <input type="number" name="amount" value={formData.amount === 0 ? '' : formData.amount} onChange={handleChange} required min="1" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ المسدد (ج.م)</label>
                            <input type="number" name="payment" value={formData.payment === 0 ? '' : formData.payment} onChange={handleChange} min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                        </div>
                    </>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-green-600 dark:text-green-400">مبلغ السداد (ج.م) *</label>
                        <input type="number" name="payment" value={formData.payment === 0 ? '' : formData.payment} onChange={handleChange} required min="1" className="mt-1 block w-full rounded-md border-green-300 dark:border-green-600 shadow-sm dark:bg-gray-700" />
                    </div>
                )}
                
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea>
                </div>
            </div>
        </Modal>
    );
};


const Advances: React.FC<AdvancesProps> = ({ advances, addAdvance, updateAdvance, deleteAdvance, employees }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [advanceToEdit, setAdvanceToEdit] = useState<Advance | null>(null);
    const [advanceToDelete, setAdvanceToDelete] = useState<Advance | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<'advances' | 'payments'>('advances');
    
    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';

    const handleAdd = () => {
        setAdvanceToEdit(null);
        setModalOpen(true);
    };

    const handleEdit = (advance: Advance) => {
        setAdvanceToEdit(advance);
        setModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!advanceToDelete) return;

        setIsDeleting(true);
        try {
            await deleteAdvance(advanceToDelete.id);
            setAdvanceToDelete(null);
        } catch (error) {
            console.error("Failed to delete advance:", error);
            alert(`فشل حذف لحركة: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = (advance: Omit<Advance, 'id'> & { id?: number }) => {
        if (advance.id) {
            updateAdvance(advance.id, advance);
        } else {
            addAdvance(advance);
        }
        setModalOpen(false);
    };

    const filteredAdvances = useMemo(() => {
        let filtered = advances;
        if (activeTab === 'advances') {
            filtered = advances.filter(a => a.amount > 0);
        } else {
            filtered = advances.filter(a => a.payment > 0 && a.amount === 0);
        }
        
        // Calculate total remaining per employee
        const employeeBalances = employees.reduce((acc, emp) => {
            const empAdvances = advances.filter(a => a.employeeId === emp.id);
            const totalAmount = empAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
            const totalPayment = empAdvances.reduce((sum, a) => sum + (a.payment || 0), 0);
            acc[emp.id] = totalAmount - totalPayment;
            return acc;
        }, {} as Record<number, number>);
        
        return filtered.map(adv => ({
            ...adv,
            employeeName: getEmployeeName(adv.employeeId),
            remaining: employeeBalances[adv.employeeId] || 0
        })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [advances, employees, activeTab]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-file-invoice-dollar" title="سلف الموظفين">
                 <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    إضافة حركة
                </button>
            </SectionHeader>
            
            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm w-fit">
                <button 
                    onClick={() => setActiveTab('advances')}
                    className={`px-6 py-2 rounded-md font-bold transition ${activeTab === 'advances' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary-light'}`}
                >
                    السلف
                </button>
                <button 
                    onClick={() => setActiveTab('payments')}
                    className={`px-6 py-2 rounded-md font-bold transition ${activeTab === 'payments' ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400'}`}
                >
                    دفعات السداد
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">م</th>
                            <th scope="col" className="px-6 py-3">التاريخ والوقت</th>
                            <th scope="col" className="px-6 py-3">اسم الموظف</th>
                            {activeTab === 'advances' && <th scope="col" className="px-6 py-3">مبلغ السلفة</th>}
                            <th scope="col" className="px-6 py-3">{activeTab === 'payments' ? 'مبلغ السداد' : 'المبلغ المسدد'}</th>
                            {activeTab === 'advances' && <th scope="col" className="px-6 py-3">إجمالي المتبقي للموظف</th>}
                            <th scope="col" className="px-6 py-3">ملاحظات</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAdvances.map((adv, index) => (
                            <tr key={adv.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800 dark:even:bg-opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="px-6 py-4">{index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(adv.date, adv.timestamp)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{adv.employeeName}</td>
                                {activeTab === 'advances' && <td className="px-6 py-4 text-red-500 font-bold">{formatCurrency(adv.amount)}</td>}
                                <td className="px-6 py-4 text-green-500 font-bold">{formatCurrency(adv.payment)}</td>
                                {activeTab === 'advances' && <td className={`px-6 py-4 font-bold ${adv.remaining > 0 ? 'text-amber-500' : 'text-green-500'}`}>{formatCurrency(adv.remaining)}</td>}
                                <td className="px-6 py-4">{adv.notes || '-'}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => handleEdit(adv)} className="text-blue-500 hover:text-blue-700 text-lg" aria-label={`تعديل الحركة ${adv.employeeName}`}><i className="fas fa-edit"></i></button>
                                    <button onClick={() => setAdvanceToDelete(adv)} className="text-red-500 hover:text-red-700 text-lg w-6 text-center" aria-label={`حذف الحركة ${adv.employeeName}`}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredAdvances.length === 0 && (
                            <tr>
                                <td colSpan={activeTab === 'advances' ? 8 : 6} className="px-6 py-8 text-center text-gray-500">
                                    لا توجد حركات مسجلة
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AdvanceModal 
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                advanceToEdit={advanceToEdit}
                employees={employees}
            />

            {advanceToDelete && (
                <ConfirmationModal
                    isOpen={!!advanceToDelete}
                    onClose={() => setAdvanceToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف سلفة الموظف "${getEmployeeName(advanceToDelete.employeeId)}" بقيمة ${formatCurrency(advanceToDelete.amount)}؟`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}
        </div>
    );
};

export default Advances;