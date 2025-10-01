
import React, { useState, useMemo } from 'react';
import { Employee } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';

interface EmployeesProps {
    employees: Employee[];
    setEmployees: (employees: Employee[]) => void;
}

const EmployeeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: Omit<Employee, 'id'> & { id?: number }) => void;
    employeeToEdit: Employee | null;
}> = ({ isOpen, onClose, onSave, employeeToEdit }) => {
    const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
        name: '',
        position: '',
        basicSalary: 0,
        hireDate: new Date().toISOString().split('T')[0],
        phone: '',
        address: ''
    });

    React.useEffect(() => {
        if (employeeToEdit) {
            setFormData(employeeToEdit);
        } else {
            setFormData({
                name: '',
                position: 'فني',
                basicSalary: 0,
                hireDate: new Date().toISOString().split('T')[0],
                phone: '',
                address: ''
            });
        }
    }, [employeeToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'basicSalary' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(employeeToEdit ? { ...formData, id: employeeToEdit.id } : formData);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={employeeToEdit ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
            onSave={handleSubmit}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الموظف *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المنصب *</label>
                    <select name="position" value={formData.position} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                        <option>مدير عام</option>
                        <option>مدير فرع</option>
                        <option>محاسب رئيسي</option>
                        <option>محاسب</option>
                        <option>فني أول</option>
                        <option>فني</option>
                        <option>أمين مخزن</option>
                        <option>عامل</option>
                        <option>سائق</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الراتب الأساسي *</label>
                    <input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ التوظيف *</label>
                    <input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">العنوان</label>
                    <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea>
                </div>
            </div>
        </Modal>
    );
};


const Employees: React.FC<EmployeesProps> = ({ employees, setEmployees }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('');

    const handleAdd = () => {
        setEmployeeToEdit(null);
        setModalOpen(true);
    };

    const handleEdit = (employee: Employee) => {
        setEmployeeToEdit(employee);
        setModalOpen(true);
    };

    const handleDelete = (employeeId: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟ سيتم حذف جميع البيانات المرتبطة به.')) {
            setEmployees(employees.filter(emp => emp.id !== employeeId));
            // Note: In a real app, you'd also delete related data (advances, payroll etc.)
        }
    };

    const handleSave = (employee: Omit<Employee, 'id'> & { id?: number }) => {
        if (employee.id) {
            setEmployees(employees.map(e => (e.id === employee.id ? { ...e, ...employee } : e)));
        } else {
            const newId = Math.max(0, ...employees.map(e => e.id)) + 1;
            setEmployees([...employees, { ...employee, id: newId }]);
        }
        setModalOpen(false);
    };

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  emp.position.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPosition = positionFilter ? emp.position === positionFilter : true;
            return matchesSearch && matchesPosition;
        });
    }, [employees, searchTerm, positionFilter]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-users" title="إدارة الموظفين">
                <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    إضافة موظف
                </button>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="البحث عن موظف..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
                <select
                    value={positionFilter}
                    onChange={e => setPositionFilter(e.target.value)}
                    className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="">جميع المناصب</option>
                    <option>مدير عام</option>
                    <option>مدير فرع</option>
                    <option>محاسب رئيسي</option>
                    <option>محاسب</option>
                    <option>فني أول</option>
                    <option>فني</option>
                    <option>أمين مخزن</option>
                    <option>عامل</option>
                    <option>سائق</option>
                </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">الاسم</th>
                            <th scope="col" className="px-6 py-3">المنصب</th>
                            <th scope="col" className="px-6 py-3">الراتب الأساسي</th>
                            <th scope="col" className="px-6 py-3">تاريخ التوظيف</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                            <tr key={emp.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{emp.name}</td>
                                <td className="px-6 py-4">{emp.position}</td>
                                <td className="px-6 py-4 font-semibold">{formatCurrency(emp.basicSalary)}</td>
                                <td className="px-6 py-4">{formatDate(emp.hireDate)}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => handleEdit(emp)} className="text-blue-500 hover:text-blue-700 text-lg"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => handleDelete(emp.id)} className="text-red-500 hover:text-red-700 text-lg"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-500">لا يوجد موظفين مطابقين للبحث.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <EmployeeModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} employeeToEdit={employeeToEdit} />
        </div>
    );
};

export default Employees;
