import React, { useState, useMemo } from 'react';
import { Expense } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatDate, formatCurrency, formatDateTime } from '../../lib/utils';
import useStore from '../../lib/store';

interface ExpensesProps {
    expenses: Expense[];
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (expenseId: number, updates: Partial<Expense>) => Promise<void>;
    deleteExpense: (expenseId: number) => Promise<void>;
}

const ExpenseModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (e: Omit<Expense, 'id'> & { id?: number }) => void; expenseToEdit: Expense | null;
}> = ({ isOpen, onClose, onSave, expenseToEdit }) => {
    const { storefrontSettings, employees } = useStore(state => ({
        storefrontSettings: state.appData?.storefrontSettings,
        employees: state.appData?.employees || []
    }));
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], type: 'عامة' as Expense['type'], name: '', amount: 0, notes: '', employeeId: '' });
    const [securityPassword, setSecurityPassword] = useState('');
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);
    const [securityError, setSecurityError] = useState('');

    React.useEffect(() => {
        if (expenseToEdit) {
            setFormData({ ...expenseToEdit, notes: expenseToEdit.notes || '', employeeId: expenseToEdit.employeeId ? String(expenseToEdit.employeeId) : '' });
        } else {
            setFormData({ date: new Date().toISOString().split('T')[0], type: 'عامة', name: '', amount: 0, notes: '', employeeId: '' });
        }
        setShowSecurityCheck(false);
        setSecurityPassword('');
        setSecurityError('');
    }, [expenseToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: name === 'amount' ? Number(value) : value }));
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
        const finalData: Omit<Expense, 'id'> = {
            date: formData.date,
            type: formData.type,
            name: formData.name,
            amount: formData.amount,
            notes: formData.notes
        };
        if (formData.type === 'موظفين' && formData.employeeId) {
            finalData.employeeId = Number(formData.employeeId);
        }
        onSave(expenseToEdit ? { ...finalData, id: expenseToEdit.id } : finalData);
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
        <Modal isOpen={isOpen} onClose={onClose} title={expenseToEdit ? 'تعديل مصروف' : 'إضافة مصروف جديد'} onSave={handlePreSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label>التاريخ *</label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div>
                    <label>نوع المصروف *</label>
                    <select name="type" value={formData.type} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                        <option value="شخصية">مصاريف شخصية</option>
                        <option value="عامة">مصاريف عامة</option>
                        <option value="موظفين">مصاريف الموظفين</option>
                    </select>
                </div>
                {formData.type === 'موظفين' && (
                    <div className="md:col-span-2">
                        <label>الموظف *</label>
                        <select name="employeeId" value={formData.employeeId} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                            <option value="">اختر الموظف...</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="md:col-span-2"><label>اسم المصروف *</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>المبلغ (ج.م) *</label><input type="number" name="amount" value={formData.amount === 0 ? '' : formData.amount} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea></div>
            </div>
        </Modal>
    );
};

const Expenses: React.FC<ExpensesProps> = ({ expenses, addExpense, updateExpense, deleteExpense }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState({ search: '', type: '', date: '' });
    
    const handleSave = (expense: Omit<Expense, 'id'> & { id?: number }) => {
        if (expense.id) {
            updateExpense(expense.id, expense);
        } else {
            addExpense(expense);
        }
        setModalOpen(false);
    };

    const confirmDelete = async () => {
        if (!expenseToDelete) return;
        setIsDeleting(true);
        try {
            await deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
        } catch (error) {
            console.error("Failed to delete expense:", error);
            alert(`فشل حذف المصروف: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => 
            (exp.name.includes(filters.search) || (exp.notes || '').includes(filters.search)) &&
            (filters.type ? exp.type === filters.type : true) &&
            (filters.date ? exp.date === filters.date : true)
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, filters]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-receipt" title="المصاريف">
                <button onClick={() => { setExpenseToEdit(null); setModalOpen(true); }} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i> إضافة مصروف
                </button>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4">
                <input type="text" placeholder="بحث..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="">كل الأنواع</option>
                    <option value="شخصية">شخصية</option>
                    <option value="عامة">عامة</option>
                    <option value="موظفين">موظفين</option>
                </select>
                <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                 <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">التاريخ والوقت</th>
                            <th className="px-6 py-3">النوع</th>
                            <th className="px-6 py-3">اسم المصروف</th>
                            <th className="px-6 py-3">المبلغ</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.map(exp => (
                            <tr key={exp.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(exp.date, exp.timestamp)}</td>
                                <td className="px-6 py-4">{exp.type}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{exp.name}</td>
                                <td className="px-6 py-4 font-semibold">{formatCurrency(exp.amount)}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => { setExpenseToEdit(exp); setModalOpen(true); }} className="text-blue-500"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => setExpenseToDelete(exp)} className="text-red-500 w-6 text-center">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ExpenseModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} expenseToEdit={expenseToEdit} />

            {expenseToDelete && (
                <ConfirmationModal
                    isOpen={!!expenseToDelete}
                    onClose={() => setExpenseToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف مصروف "${expenseToDelete.name}"؟`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}
        </div>
    );
};

export default Expenses;