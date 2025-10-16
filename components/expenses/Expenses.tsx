import React, { useState, useMemo } from 'react';
import { Expense } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import { formatDate, formatCurrency } from '../../lib/utils';

interface ExpensesProps {
    expenses: Expense[];
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (expenseId: number, updates: Partial<Expense>) => Promise<void>;
    deleteExpense: (expenseId: number) => Promise<void>;
}

const ExpenseModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (e: Omit<Expense, 'id'> & { id?: number }) => void; expenseToEdit: Expense | null;
}> = ({ isOpen, onClose, onSave, expenseToEdit }) => {
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], type: 'عامة' as Expense['type'], name: '', amount: 0, notes: '' });
    React.useEffect(() => {
        if (expenseToEdit) {
            setFormData({ ...expenseToEdit, notes: expenseToEdit.notes || '' });
        } else {
            setFormData({ date: new Date().toISOString().split('T')[0], type: 'عامة', name: '', amount: 0, notes: '' });
        }
    }, [expenseToEdit, isOpen]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: name === 'amount' ? Number(value) : value }));
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(expenseToEdit ? { ...formData, id: expenseToEdit.id } : formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={expenseToEdit ? 'تعديل مصروف' : 'إضافة مصروف جديد'} onSave={handleSubmit}>
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
                <div className="md:col-span-2"><label>اسم المصروف *</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>المبلغ (ج.م) *</label><input type="number" name="amount" value={formData.amount} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea></div>
            </div>
        </Modal>
    );
};

const Expenses: React.FC<ExpensesProps> = ({ expenses, addExpense, updateExpense, deleteExpense }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [filters, setFilters] = useState({ search: '', type: '', date: '' });
    
    const handleSave = (expense: Omit<Expense, 'id'> & { id?: number }) => {
        if (expense.id) {
            updateExpense(expense.id, expense);
        } else {
            addExpense(expense);
        }
        setModalOpen(false);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
            deleteExpense(id);
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
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">النوع</th>
                            <th className="px-6 py-3">اسم المصروف</th>
                            <th className="px-6 py-3">المبلغ</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.map(exp => (
                            <tr key={exp.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{formatDate(exp.date)}</td>
                                <td className="px-6 py-4">{exp.type}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{exp.name}</td>
                                <td className="px-6 py-4 font-semibold">{formatCurrency(exp.amount)}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => { setExpenseToEdit(exp); setModalOpen(true); }} className="text-blue-500"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => handleDelete(exp.id)} className="text-red-500"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ExpenseModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} expenseToEdit={expenseToEdit} />
        </div>
    );
};

export default Expenses;