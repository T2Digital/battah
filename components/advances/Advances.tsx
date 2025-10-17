import React, { useState, useMemo } from 'react';
// Fix: Corrected import path
import { Advance, Employee } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import { formatCurrency, formatDate } from '../../lib/utils';

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
            // FIX: Ensure 'notes' is a string to match form state type.
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
        if (formData.payment > formData.amount) {
            alert('المبلغ المسدد لا يمكن أن يكون أكبر من مبلغ السلفة');
            return;
        }
        onSave(advanceToEdit ? { ...formData, id: advanceToEdit.id } : formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={advanceToEdit ? 'تعديل سلفة' : 'إضافة سلفة جديدة'} onSave={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مبلغ السلفة (ج.م) *</label>
                    <input type="number" name="amount" value={formData.amount} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ المسدد (ج.م)</label>
                    <input type="number" name="payment" value={formData.payment} onChange={handleChange} min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
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
    
    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';

    const handleAdd = () => {
        setAdvanceToEdit(null);
        setModalOpen(true);
    };

    const handleEdit = (advance: Advance) => {
        setAdvanceToEdit(advance);
        setModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذه السلفة؟')) {
            deleteAdvance(id);
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

    const advancesWithDetails = useMemo(() => {
        return advances.map(adv => ({
            ...adv,
            employeeName: getEmployeeName(adv.employeeId),
            remaining: adv.amount - adv.payment
        })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [advances, employees]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-file-invoice-dollar" title="سلف الموظفين">
                 <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    إضافة سلفة
                </button>
            </SectionHeader>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">التاريخ</th>
                            <th scope="col" className="px-6 py-3">اسم الموظف</th>
                            <th scope="col" className="px-6 py-3">مبلغ السلفة</th>
                            <th scope="col" className="px-6 py-3">المبلغ المتبقي</th>
                            <th scope="col" className="px-6 py-3">ملاحظات</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {advancesWithDetails.map(adv => (
                            <tr key={adv.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{formatDate(adv.date)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{adv.employeeName}</td>
                                <td className="px-6 py-4">{formatCurrency(adv.amount)}</td>
                                <td className={`px-6 py-4 font-bold ${adv.remaining > 0 ? 'text-amber-500' : 'text-green-500'}`}>{formatCurrency(adv.remaining)}</td>
                                <td className="px-6 py-4">{adv.notes || '-'}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => handleEdit(adv)} className="text-blue-500 hover:text-blue-700 text-lg"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => handleDelete(adv.id)} className="text-red-500 hover:text-red-700 text-lg"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
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
        </div>
    );
};

export default Advances;