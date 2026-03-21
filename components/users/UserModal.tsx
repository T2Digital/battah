import React, { useState, useEffect } from 'react';
import { User, Role, Branch, Section } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: any) => Promise<void>;
    existingUser?: User | null;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, existingUser }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>(Role.Seller);
    const [branch, setBranch] = useState<Branch>('main');
    const [permissions, setPermissions] = useState<Section[]>([]);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (existingUser) {
            setName(existingUser.name);
            setEmail(existingUser.username);
            setRole(existingUser.role);
            setBranch(existingUser.branch);
            setPermissions(existingUser.permissions || []);
        } else {
            setName('');
            setEmail('');
            setPassword('');
            setRole(Role.Seller);
            setBranch('main');
            setPermissions([]);
        }
    }, [existingUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                id: existingUser?.id,
                name,
                email,
                password,
                role,
                branch,
                permissions
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (section: Section) => {
        setPermissions(prev => 
            prev.includes(section) 
                ? prev.filter(p => p !== section)
                : [...prev, section]
        );
    };

    const toggleAllPermissions = () => {
        if (permissions.length === Object.values(Section).length) {
            setPermissions([]);
        } else {
            setPermissions(Object.values(Section) as Section[]);
        }
    };

    const sectionLabels: Record<Section, string> = {
        [Section.Dashboard]: 'لوحة التحكم',
        [Section.Treasury]: 'الخزينة',
        [Section.DailySales]: 'المبيعات اليومية',
        [Section.StoreManagement]: 'إدارة المخزون',
        [Section.Purchasing]: 'المشتريات',
        [Section.Employees]: 'الموظفين',
        [Section.Advances]: 'السلف',
        [Section.Attendance]: 'الحضور والانصراف',
        [Section.Payroll]: 'الرواتب',
        [Section.Suppliers]: 'الموردين',
        [Section.Expenses]: 'المصروفات',
        [Section.DailyReview]: 'التقفيل اليومي',
        [Section.Reports]: 'التقارير',
        [Section.Orders]: 'طلبات اونلاين',
        [Section.Customers]: 'العملاء',
        [Section.Promotions]: 'العروض',
        [Section.Settings]: 'الإعدادات',
        [Section.Notifications]: 'الإشعارات',
        [Section.Users]: 'المستخدمين',
        [Section.SuperAdmin]: 'إدارة النظام',
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                >
                    <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {existingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name} 
                                    onChange={e => setName(e.target.value)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني (اسم المستخدم)</label>
                                <input 
                                    type="email" 
                                    required 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)}
                                    disabled={!!existingUser}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {existingUser ? 'كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'}
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required={!existingUser} 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدور</label>
                                <select 
                                    value={role} 
                                    onChange={e => setRole(e.target.value as Role)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value={Role.Admin}>مدير عام</option>
                                    <option value={Role.BranchManager}>مدير فرع</option>
                                    <option value={Role.Accountant}>محاسب</option>
                                    <option value={Role.Seller}>بائع</option>
                                    <option value={Role.Cashier}>كاشير</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفرع</label>
                                <select 
                                    value={branch} 
                                    onChange={e => setBranch(e.target.value as Branch)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="main">المخزن</option>
                                    <option value="branch1">الرئيسي</option>
                                    <option value="branch2">فرع 1</option>
                                    <option value="branch3">فرع 2</option>
                                </select>
                            </div>
                        </div>

                        <div className="border-t dark:border-gray-700 pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">الصلاحيات (الأقسام المتاحة)</h3>
                                <button 
                                    type="button" 
                                    onClick={toggleAllPermissions}
                                    className="text-sm text-primary hover:text-primary-dark"
                                >
                                    {permissions.length === Object.values(Section).length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.values(Section).map(section => (
                                    <label key={section} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition">
                                        <input 
                                            type="checkbox" 
                                            checked={permissions.includes(section)}
                                            onChange={() => togglePermission(section)}
                                            className="w-4 h-4 text-primary rounded focus:ring-primary"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{sectionLabels[section]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            >
                                إلغاء
                            </button>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && <i className="fas fa-spinner fa-spin"></i>}
                                {existingUser ? 'حفظ التغييرات' : 'إضافة المستخدم'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default UserModal;
