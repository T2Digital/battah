import React, { useState, useMemo, useEffect } from 'react';
import { Payroll as PayrollType, Employee } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatDate, formatCurrency, formatDateTime } from '../../lib/utils';
import useStore from '../../lib/store';

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
    
    const { attendance, advances, expenses } = useStore(state => ({
        attendance: state.appData?.attendance || [],
        advances: state.appData?.advances || [],
        expenses: state.appData?.expenses || []
    }));

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        employeeId: 0,
        basicSalary: 0,
        incentives: 0,
        deductions: 0,
        daysAttended: 0,
        periodStart: '',
        periodEnd: '',
        disbursed: 0,
        notes: ''
    });

    const [autoNotes, setAutoNotes] = useState('');

    React.useEffect(() => {
        if (recordToEdit) {
            setFormData({ 
                ...recordToEdit, 
                incentives: recordToEdit.incentives || 0, 
                deductions: recordToEdit.deductions || 0,
                daysAttended: recordToEdit.daysAttended || 0,
                periodStart: recordToEdit.periodStart || '',
                periodEnd: recordToEdit.periodEnd || '',
                notes: recordToEdit.notes || '' 
            });
            setAutoNotes('');
        } else {
            const firstEmployee = employees[0];
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

            setFormData({
                date: today.toISOString().split('T')[0],
                employeeId: firstEmployee?.id || 0,
                basicSalary: firstEmployee?.basicSalary || 0,
                incentives: 0,
                deductions: 0,
                daysAttended: 0,
                periodStart: firstDay,
                periodEnd: lastDay,
                disbursed: 0,
                notes: ''
            });
            setAutoNotes('');
        }
    }, [recordToEdit, isOpen, employees]);

    // Auto-calculate deductions and days attended when employee or period changes
    React.useEffect(() => {
        if (recordToEdit) return; // Don't auto-calculate if editing an existing record

        const empId = formData.employeeId;
        const pStart = formData.periodStart;
        const pEnd = formData.periodEnd;
        
        if (!empId || !pStart || !pEnd) return;

        const start = new Date(pStart);
        const end = new Date(pEnd);
        end.setHours(23, 59, 59, 999);

        // Calculate Days Attended
        const employeeAttendance = attendance.filter(a => {
            const attDate = new Date(a.date);
            return a.employeeId === empId && attDate >= start && attDate <= end;
        });

        let totalDays = 0;
        employeeAttendance.forEach(record => {
            totalDays += (record.daysAttended || 0);
        });

        // Calculate Deductions (Advances + Expenses linked to employee)
        const employeeAdvances = advances.filter(a => {
            const advDate = new Date(a.date);
            return a.employeeId === empId && advDate >= start && advDate <= end;
        });
        
        const employeeExpenses = expenses.filter(e => {
            const expDate = new Date(e.date);
            return e.employeeId === empId && expDate >= start && expDate <= end;
        });

        const totalTakenAdvances = employeeAdvances.reduce((sum, a) => sum + a.amount, 0);
        const totalExpenses = employeeExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalDeductions = totalTakenAdvances + totalExpenses;

        const notes = `أيام الحضور: ${totalDays} يوم.\nالخصومات: سلف (${totalTakenAdvances}) + مصاريف (${totalExpenses})`;
        setAutoNotes(notes);

        setFormData(prev => ({
            ...prev,
            daysAttended: totalDays,
            deductions: totalDeductions
        }));
    }, [formData.employeeId, formData.periodStart, formData.periodEnd, attendance, advances, expenses, recordToEdit]);

    // Auto-calculate disbursed amount when salary, incentives, or deductions change
    React.useEffect(() => {
        if (recordToEdit) return; // Don't auto-calculate if editing an existing record
        
        const expectedNet = (formData.basicSalary || 0) + (formData.incentives || 0) - (formData.deductions || 0);
        setFormData(prev => ({
            ...prev,
            disbursed: expectedNet > 0 ? expectedNet : 0
        }));
    }, [formData.basicSalary, formData.incentives, formData.deductions, recordToEdit]);

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
        setFormData(prev => ({ ...prev, [name]: ['disbursed', 'incentives', 'deductions', 'daysAttended'].includes(name) ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalData = { ...formData };
        if (!recordToEdit && autoNotes && !finalData.notes) {
            finalData.notes = autoNotes;
        } else if (!recordToEdit && autoNotes && finalData.notes) {
            finalData.notes = `${autoNotes}\n${finalData.notes}`;
        }
        onSave(recordToEdit ? { ...finalData, id: recordToEdit.id } : finalData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={recordToEdit ? 'تعديل دفع راتب' : 'إضافة دفع راتب'} onSave={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموظف *</label>
                    <select name="employeeId" value={formData.employeeId} onChange={handleEmployeeChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 input-base">
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الدفع *</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 input-base" />
                </div>
                
                <div className="md:col-span-2 grid grid-cols-2 gap-4 border p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                    <div className="col-span-2 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">فترة الحساب</span>
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <i className="fas fa-magic"></i>
                            يتم حساب الخصومات تلقائياً
                        </span>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500">من</label>
                        <input type="date" name="periodStart" value={formData.periodStart} onChange={handleChange} className="mt-1 block w-full input-base text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500">إلى</label>
                        <input type="date" name="periodEnd" value={formData.periodEnd} onChange={handleChange} className="mt-1 block w-full input-base text-sm" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الراتب الأساسي</label>
                    <input type="number" name="basicSalary" value={formData.basicSalary === 0 ? '' : formData.basicSalary} readOnly className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-600 input-base" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">أيام الحضور</label>
                    <input type="number" name="daysAttended" value={formData.daysAttended === 0 ? '' : formData.daysAttended} onChange={handleChange} className="mt-1 block w-full input-base" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">حوافز</label>
                    <input type="number" name="incentives" value={formData.incentives === 0 ? '' : formData.incentives} onChange={handleChange} min="0" className="mt-1 block w-full input-base" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصومات (سلف/مصاريف)</label>
                    <input type="number" name="deductions" value={formData.deductions === 0 ? '' : formData.deductions} onChange={handleChange} min="0" className="mt-1 block w-full input-base text-red-600" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ المصروف *</label>
                    <input type="number" name="disbursed" value={formData.disbursed === 0 ? '' : formData.disbursed} onChange={handleChange} required min="0" className="mt-1 block w-full input-base font-bold text-lg" />
                    <p className="text-xs text-gray-500 mt-1">صافي الراتب المتوقع: {formatCurrency((formData.basicSalary + (formData.incentives || 0)) - (formData.deductions || 0))}</p>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full input-base"></textarea>
                </div>
            </div>
        </Modal>
    );
};

const Payroll: React.FC<PayrollProps> = ({ payroll, addPayroll, updatePayroll, deletePayroll, employees }) => {
    const { fetchDataByDateRange } = useStore();
    const [isModalOpen, setModalOpen] = useState(false);
    const [recordToEdit, setRecordToEdit] = useState<PayrollType | null>(null);
    const [recordToDelete, setRecordToDelete] = useState<PayrollType | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
    const [filterPeriod, setFilterPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');

    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';

    const handleAdd = () => {
        setRecordToEdit(null);
        setModalOpen(true);
    };

    const handleEdit = (record: PayrollType) => {
        setRecordToEdit(record);
        setModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;
        setIsDeleting(true);
        try {
            await deletePayroll(recordToDelete.id);
            setRecordToDelete(null);
        } catch (error) {
            console.error("Failed to delete payroll:", error);
            alert(`فشل حذف الراتب: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
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
        return payroll
            .filter(p => {
                let dateMatch = true;
                if (filters.dateFrom && filters.dateTo) {
                    const pDate = new Date(p.date);
                    pDate.setHours(0, 0, 0, 0);
                    const from = new Date(filters.dateFrom);
                    from.setHours(0, 0, 0, 0);
                    const to = new Date(filters.dateTo);
                    to.setHours(0, 0, 0, 0);
                    dateMatch = pDate >= from && pDate <= to;
                }
                return dateMatch;
            })
            .map(p => ({
                ...p,
                employeeName: getEmployeeName(p.employeeId),
                remaining: (p.basicSalary + (p.incentives || 0) - (p.deductions || 0)) - p.disbursed
            })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [payroll, employees, filters]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-money-check-alt" title="القبض والمرتبات">
                <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    إضافة دفع راتب
                </button>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 flex-wrap">
                <select value={filterPeriod} onChange={e => {
                    setFilterPeriod(e.target.value as any);
                    if (e.target.value === 'daily') {
                        setFilters(f => ({ ...f, dateFrom: new Date().toISOString().split('T')[0], dateTo: new Date().toISOString().split('T')[0] }));
                    } else if (e.target.value === 'monthly') {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), now.getMonth(), 1);
                        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        setFilters(f => ({ ...f, dateFrom: start.toISOString().split('T')[0], dateTo: end.toISOString().split('T')[0] }));
                    } else if (e.target.value === 'yearly') {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), 0, 1);
                        const end = new Date(now.getFullYear(), 11, 31);
                        setFilters(f => ({ ...f, dateFrom: start.toISOString().split('T')[0], dateTo: end.toISOString().split('T')[0] }));
                    }
                }} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="daily">يومي</option>
                    <option value="monthly">شهري</option>
                    <option value="yearly">سنوي</option>
                </select>
                <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500">من:</span>
                    <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500">إلى:</span>
                    <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <button 
                    onClick={() => {
                        if (filters.dateFrom && filters.dateTo) {
                            fetchDataByDateRange('payroll', filters.dateFrom, filters.dateTo);
                        }
                    }}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    title="جلب بيانات من الخادم"
                >
                    <i className="fas fa-cloud-download-alt"></i>
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">التاريخ والوقت</th>
                            <th scope="col" className="px-6 py-3">اسم الموظف</th>
                            <th scope="col" className="px-6 py-3">الراتب الأساسي</th>
                            <th scope="col" className="px-6 py-3">حوافز</th>
                            <th scope="col" className="px-6 py-3">خصومات</th>
                            <th scope="col" className="px-6 py-3">المبلغ المصروف</th>
                            <th scope="col" className="px-6 py-3">المتبقي</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payrollWithDetails.map(p => (
                            <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(p.date, p.timestamp)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{p.employeeName}</td>
                                <td className="px-6 py-4">{formatCurrency(p.basicSalary)}</td>
                                <td className="px-6 py-4 text-green-600">{formatCurrency(p.incentives || 0)}</td>
                                <td className="px-6 py-4 text-red-600">{formatCurrency(p.deductions || 0)}</td>
                                <td className="px-6 py-4">{formatCurrency(p.disbursed)}</td>
                                <td className={`px-6 py-4 font-bold ${p.remaining > 0 ? 'text-amber-500' : 'text-green-500'}`}>{formatCurrency(p.remaining)}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => handleEdit(p)} className="text-blue-500 hover:text-blue-700 text-lg"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => setRecordToDelete(p)} className="text-red-500 hover:text-red-700 text-lg w-6 text-center">
                                        <i className="fas fa-trash"></i>
                                    </button>
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

            {recordToDelete && (
                <ConfirmationModal
                    isOpen={!!recordToDelete}
                    onClose={() => setRecordToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف سجل راتب الموظف "${getEmployeeName(recordToDelete.employeeId)}؟"`}
                    isLoading={isDeleting}
                />
            )}
        </div>
    );
};

export default Payroll;