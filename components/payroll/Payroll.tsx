import React, { useState, useMemo } from 'react';
import { Payroll as PayrollType, Employee } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import { formatDate, formatCurrency } from '../../lib/utils';

interface PayrollProps {
    payroll: PayrollType[];
    addPayroll: (payroll: Omit<PayrollType, 'id'>) => Promise<void>;
    updatePayroll: (payrollId: number, updates: Partial<PayrollType>) => Promise<void>;
    deletePayroll: (payrollId: number) => Promise<void>;
    employees: Employee[];
}

const PayrollModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: Omit<PayrollType, 'id'> & { id?: number }) => void;
    recordToEdit: PayrollType | null;
    employees: Employee[];
}> = ({ isOpen, onClose, onSave, recordToEdit, employees }) => {
    
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        employeeId: 0,
        basicSalary: 0,
        disbursed: 0,
        notes: ''
    });

    React.useEffect(() => {
        if (recordToEdit) {
            setFormData({ ...recordToEdit, notes: recordToEdit.notes || '' });
        } else {
            const firstEmployee = employees[0];
            setFormData({
                date: new Date().toISOString().split('T')[0],
                employeeId: firstEmployee?.id || 0,
                basicSalary: firstEmployee?.basicSalary || 0,
                disbursed: 0,
                notes: ''
            });
        }
    }, [recordToEdit, isOpen, employees]);
    
    const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const employeeId = Number(e.target.value);
        const selectedEmployee = employees.find(emp => emp.id === employeeId);
        setFormData(prev => ({
            ...prev,
            employeeId: employeeId,
            basicSalary: selectedEmployee?.basicSalary || 0
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: ['disbursed'].includes(name) ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(recordToEdit ? { ...formData, id: recordToEdit.id } : formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={recordToEdit ? 'تعديل دفع راتب' : 'إضافة دفع راتب'} onSave={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموظف *</label>
                    <select name="employeeId" value={formData.employeeId} onChange={handleEmployeeChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ *</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الراتب الأساسي</label>
                    <input type="number" name="basicSalary" value={formData.basicSalary} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 bg-gray-100 dark:bg-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ المصروف *</label>
                    <input type="number" name="disbursed" value={formData.disbursed} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea>
                </div>
            </div>
        </Modal>
    );
};

const Payroll: React.FC<PayrollProps> = ({ payroll, addPayroll, updatePayroll, deletePayroll, employees }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [recordToEdit, setRecordToEdit] = useState<PayrollType | null>(null);

    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';

    const handleAdd = () => {
        setRecordToEdit(null);
        setModalOpen(true);
    };

    const handleEdit = (record: PayrollType) => {
        setRecordToEdit(record);
        setModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
            deletePayroll(id);
        }
    };
    
    const handleSave = (record: Omit<PayrollType, 'id'> & { id?: number }) => {
        if (record.id) {
            updatePayroll(record.id, record);
        } else {
            addPayroll(record);
        }
        setModalOpen(false);
    };

    const payrollWithDetails = useMemo(() => {
        return payroll.map(p => ({
            ...p,
            employeeName: getEmployeeName(p.employeeId),
            remaining: p.basicSalary - p.disbursed
        })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [payroll, employees]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-money-check-alt" title="القبض والمرتبات">
                <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    إضافة دفع راتب
                </button>
            </SectionHeader>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">التاريخ</th>
                            <th scope="col" className="px-6 py-3">اسم الموظف</th>
                            <th scope="col" className="px-6 py-3">الراتب الأساسي</th>
                            <th scope="col" className="px-6 py-3">المبلغ المصروف</th>
                            <th scope="col" className="px-6 py-3">المتبقي</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payrollWithDetails.map(p => (
                            <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{formatDate(p.date)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{p.employeeName}</td>
                                <td className="px-6 py-4">{formatCurrency(p.basicSalary)}</td>
                                <td className="px-6 py-4">{formatCurrency(p.disbursed)}</td>
                                <td className={`px-6 py-4 font-bold ${p.remaining > 0 ? 'text-amber-500' : 'text-green-500'}`}>{formatCurrency(p.remaining)}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => handleEdit(p)} className="text-blue-500 hover:text-blue-700 text-lg"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-lg"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <PayrollModal 
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                recordToEdit={recordToEdit}
                employees={employees}
            />
        </div>
    );
};

export default Payroll;