import React, { useState, useMemo } from 'react';
import { Employee, Role, Branch } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import AdminPasswordModal from '../shared/AdminPasswordModal';
import useStore from '../../lib/store';
import ConfirmationModal from '../shared/ConfirmationModal';

// Fix: Correctly define EmployeeModal as a functional component.
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
        address: '',
        email: ''
    });

    const { uploadImage, appData } = useStore(state => ({
        uploadImage: state.uploadImage,
        appData: state.appData
    }));
    const storefrontSettings = appData?.storefrontSettings;
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    React.useEffect(() => {
        if (employeeToEdit) {
            setFormData({ ...employeeToEdit, email: employeeToEdit.email || '', idCardUrl: employeeToEdit.idCardUrl || '' });
        } else {
            setFormData({
                name: '',
                position: 'فني',
                basicSalary: 0,
                hireDate: new Date().toISOString().split('T')[0],
                phone: '',
                address: '',
                email: '',
                idCardUrl: ''
            });
        }
        setShowSecurityCheck(false);
    }, [employeeToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'basicSalary' ? parseFloat(value) : value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            try {
                const url = await uploadImage(e.target.files[0], `employees/id_cards/${Date.now()}_${e.target.files[0].name}`);
                setFormData(prev => ({ ...prev, idCardUrl: url }));
            } catch (error) {
                console.error("Failed to upload image", error);
                alert("فشل رفع الصورة");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (employeeToEdit && storefrontSettings?.adminPassword) {
            setShowSecurityCheck(true);
        } else {
            handleSubmit();
        }
    };

    const handleSecuritySuccess = () => {
        setShowSecurityCheck(false);
        handleSubmit();
    };

    const handleSubmit = () => {
        onSave(employeeToEdit ? { ...formData, id: employeeToEdit.id } : formData);
    };

    if (showSecurityCheck) {
        return (
            <AdminPasswordModal 
                isOpen={isOpen} 
                onClose={() => setShowSecurityCheck(false)} 
                onSuccess={handleSecuritySuccess}
                actionDescription={employeeToEdit ? "تعديل بيانات موظف" : "إضافة موظف جديد"}
            />
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={employeeToEdit ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
            onSave={handlePreSubmit}
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
                        <option>بائع</option>
                        <option>فني أول</option>
                        <option>فني</option>
                        <option>أمين مخزن</option>
                        <option>عامل</option>
                        <option>سائق</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الراتب الأساسي *</label>
                    <input type="number" name="basicSalary" value={formData.basicSalary === 0 ? '' : formData.basicSalary} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
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
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">صورة البطاقة</label>
                    <div className="mt-1 flex items-center gap-4">
                        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark" />
                        {isUploading && <span className="text-sm text-gray-500">جاري الرفع...</span>}
                    </div>
                    {formData.idCardUrl && (
                        <div className="mt-2">
                            <img src={formData.idCardUrl} alt="صورة البطاقة" className="h-32 object-contain rounded-md border dark:border-gray-600" />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};


const CreateUserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    employee: Employee | null;
}> = ({ isOpen, onClose, employee }) => {
    const { createUser } = useStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>(Role.Seller);
    const [branch, setBranch] = useState<Branch>('main');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (employee) {
            setEmail(employee.email || '');
            // Guess role based on position
            if (employee.position.includes('مدير عام')) setRole(Role.Admin);
            else if (employee.position.includes('مدير فرع')) setRole(Role.BranchManager);
            else if (employee.position.includes('محاسب')) setRole(Role.Accountant);
            else if (employee.position.includes('كاشير')) setRole(Role.Cashier);
            else setRole(Role.Seller);
        }
    }, [employee]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;
        setLoading(true);
        try {
            await createUser(email, password, role, branch, employee.name);
            onClose();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`إنشاء حساب دخول لـ ${employee?.name}`} onSave={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label>البريد الإلكتروني *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full mt-1 p-2 border rounded dark:bg-gray-700" />
                </div>
                <div>
                    <label>كلمة المرور *</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full mt-1 p-2 border rounded dark:bg-gray-700" />
                </div>
                <div>
                    <label>الدور *</label>
                    <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700">
                        <option value={Role.Admin}>مدير عام</option>
                        <option value={Role.BranchManager}>مدير فرع</option>
                        <option value={Role.Accountant}>محاسب</option>
                        <option value={Role.Seller}>بائع</option>
                        <option value={Role.Cashier}>كاشير</option>
                    </select>
                </div>
                <div>
                    <label>الفرع *</label>
                    <select value={branch} onChange={e => setBranch(e.target.value as Branch)} className="w-full mt-1 p-2 border rounded dark:bg-gray-700">
                        <option value="main">المخزن</option>
                        <option value="branch1">الرئيسي</option>
                        <option value="branch2">فرع 1</option>
                        <option value="branch3">فرع 2</option>
                    </select>
                </div>
                {loading && <p className="text-blue-500">جاري إنشاء الحساب...</p>}
            </div>
        </Modal>
    );
};


const Employees: React.FC<{ employees: Employee[] }> = ({ employees }) => {
    const { addEmployee, updateEmployee, deleteEmployee } = useStore();
    const [isModalOpen, setModalOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('');
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [employeeForUser, setEmployeeForUser] = useState<Employee | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);
    const [securityAction, setSecurityAction] = useState<'deleteEmployee' | 'createUser' | null>(null);

    const handleAdd = () => {
        setEmployeeToEdit(null);
        setModalOpen(true);
    };

    const handleEdit = (employee: Employee) => {
        setEmployeeToEdit(employee);
        setModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!employeeToDelete) return;

        setIsDeleting(true);
        try {
            await deleteEmployee(employeeToDelete.id);
            setEmployeeToDelete(null);
        } catch (error) {
            console.error("Failed to delete employee:", error);
            alert(`فشل حذف الموظف: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreateUserClick = (emp: Employee) => {
        setEmployeeForUser(emp);
        setUserModalOpen(true);
    };

    const handleSecuritySuccess = () => {
        setShowSecurityCheck(false);
        if (securityAction === 'createUser') {
            setUserModalOpen(true);
        }
        setSecurityAction(null);
    };

    const handleSave = (employee: Omit<Employee, 'id'> & { id?: number }) => {
        if (employee.id) {
            updateEmployee(employee.id, employee);
        } else {
            addEmployee(employee);
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
                    <option>بائع</option>
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
                            <th scope="col" className="px-6 py-3">صورة البطاقة</th>
                            <th scope="col" className="px-6 py-3">المنصب</th>
                            <th scope="col" className="px-6 py-3">الراتب الأساسي</th>
                            <th scope="col" className="px-6 py-3">تاريخ التوظيف</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                            <tr key={emp.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800 dark:even:bg-opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{emp.name}</td>
                                <td className="px-6 py-4">
                                    {emp.idCardUrl ? (
                                        <div onClick={() => setSelectedImage(emp.idCardUrl!)} className="cursor-pointer">
                                            <img src={emp.idCardUrl} alt="بطاقة" className="w-12 h-8 object-cover rounded border dark:border-gray-600 hover:scale-110 transition-transform" />
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-xs">لا يوجد</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">{emp.position}</td>
                                <td className="px-6 py-4 font-semibold">{formatCurrency(emp.basicSalary)}</td>
                                <td className="px-6 py-4">{formatDate(emp.hireDate)}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => handleCreateUserClick(emp)} className="text-green-500 hover:text-green-700 text-lg" title="إنشاء حساب دخول"><i className="fas fa-user-plus"></i></button>
                                    <button onClick={() => handleEdit(emp)} className="text-blue-500 hover:text-blue-700 text-lg" aria-label={`تعديل ${emp.name}`}><i className="fas fa-edit"></i></button>
                                    <button onClick={() => setEmployeeToDelete(emp)} className="text-red-500 hover:text-red-700 text-lg w-6 text-center" aria-label={`حذف ${emp.name}`}>
                                        <i className="fas fa-trash"></i>
                                    </button>
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
            <CreateUserModal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} employee={employeeForUser} />
            
            {showSecurityCheck && (
                <AdminPasswordModal
                    isOpen={showSecurityCheck}
                    onClose={() => {
                        setShowSecurityCheck(false);
                        setSecurityAction(null);
                    }}
                    onSuccess={handleSecuritySuccess}
                    actionDescription={securityAction === 'deleteEmployee' ? 'حذف موظف' : 'إنشاء حساب مستخدم'}
                />
            )}

            {employeeToDelete && (
                <ConfirmationModal
                    isOpen={!!employeeToDelete}
                    onClose={() => setEmployeeToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف الموظف "${employeeToDelete.name}"؟ سيتم حذف جميع البيانات المرتبطة به.`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}

            {selectedImage && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex justify-center">
                        <button onClick={() => setSelectedImage(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300 text-3xl">
                            <i className="fas fa-times"></i>
                        </button>
                        <img src={selectedImage} alt="صورة البطاقة" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;