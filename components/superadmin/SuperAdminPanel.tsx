import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tenant, TenantModule } from '../../types';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Globe, Settings, Database } from 'lucide-react';
import Modal from '../shared/Modal';
import { initialData } from '../../lib/initialData';

const SuperAdminPanel: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

    const [formData, setFormData] = useState<Partial<Tenant>>({
        name: '',
        domain: '',
        status: 'active',
        modules: ['pos', 'inventory', 'sales', 'reports'],
        settings: {
            primaryColor: '#4F46E5',
            currency: 'EGP',
            language: 'ar',
            timezone: 'Africa/Cairo'
        }
    });

    const availableModules: { id: TenantModule; label: string }[] = [
        { id: 'pos', label: 'نقاط البيع (POS)' },
        { id: 'ecommerce', label: 'المتجر الإلكتروني' },
        { id: 'inventory', label: 'المخازن' },
        { id: 'hr', label: 'الموارد البشرية' },
        { id: 'accounting', label: 'الحسابات' },
        { id: 'sales', label: 'المبيعات' },
        { id: 'reports', label: 'التقارير' }
    ];

    const fetchTenants = async () => {
        setIsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'tenants'));
            const tenantsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tenant));
            setTenants(tenantsData);
        } catch (error) {
            console.error("Error fetching tenants:", error);
            alert("حدث خطأ أثناء جلب بيانات العملاء.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleOpenModal = (tenant?: Tenant) => {
        if (tenant) {
            setEditingTenant(tenant);
            setFormData(tenant);
        } else {
            setEditingTenant(null);
            setFormData({
                name: '',
                domain: '',
                status: 'active',
                modules: ['pos', 'inventory', 'sales', 'reports'],
                settings: {
                    primaryColor: '#4F46E5',
                    currency: 'EGP',
                    language: 'ar',
                    timezone: 'Africa/Cairo'
                }
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.domain) {
            alert("يرجى إدخال اسم العميل والدومين.");
            return;
        }

        try {
            if (editingTenant) {
                const tenantRef = doc(db, 'tenants', editingTenant.id);
                await updateDoc(tenantRef, {
                    ...formData,
                    updatedAt: new Date().toISOString()
                });
            } else {
                const newTenantId = formData.domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                const tenantRef = doc(db, 'tenants', newTenantId);
                
                const newTenant = {
                    ...formData,
                    id: newTenantId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                await setDoc(tenantRef, newTenant);
                
                // Initialize settings for the new tenant
                const storefrontRef = doc(db, 'tenants', newTenantId, 'settings', 'storefront');
                await setDoc(storefrontRef, initialData.storefrontSettings);
                
                const generalRef = doc(db, 'tenants', newTenantId, 'settings', 'general');
                await setDoc(generalRef, initialData.settings);
            }
            
            setIsModalOpen(false);
            fetchTenants();
        } catch (error) {
            console.error("Error saving tenant:", error);
            alert("حدث خطأ أثناء حفظ بيانات العميل.");
        }
    };

    const handleToggleModule = (moduleId: TenantModule) => {
        const currentModules = formData.modules || [];
        if (currentModules.includes(moduleId)) {
            setFormData({ ...formData, modules: currentModules.filter(m => m !== moduleId) });
        } else {
            setFormData({ ...formData, modules: [...currentModules, moduleId] });
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">لوحة تحكم المصنع (Super Admin)</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة العملاء والنسخ الخاصة بهم</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={20} />
                    <span>إضافة عميل جديد</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tenants.map(tenant => (
                        <div key={tenant.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        {tenant.name}
                                        {tenant.status === 'active' ? (
                                            <CheckCircle size={16} className="text-green-500" />
                                        ) : (
                                            <XCircle size={16} className="text-red-500" />
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        <Globe size={14} />
                                        <a href={`https://${tenant.domain}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 hover:underline">
                                            {tenant.domain}
                                        </a>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(tenant)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                        <Edit size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 bg-gray-50 dark:bg-gray-800/50">
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">الوحدات المفعلة</h4>
                                <div className="flex flex-wrap gap-2">
                                    {tenant.modules.map(mod => (
                                        <span key={mod} className="px-2.5 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs rounded-full font-medium">
                                            {availableModules.find(m => m.id === mod)?.label || mod}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTenant ? "تعديل بيانات العميل" : "إضافة عميل جديد"}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم العميل / النشاط</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="مثال: سوبر ماركت الأمل"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدومين (Domain)</label>
                        <input
                            type="text"
                            value={formData.domain}
                            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="مثال: alamal.battah.com أو alamal.com"
                            dir="ltr"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حالة الحساب</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'suspended' })}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="active">نشط</option>
                            <option value="suspended">موقوف</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الوحدات المفعلة (Modules)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {availableModules.map(module => (
                                <label key={module.id} className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <input
                                        type="checkbox"
                                        checked={formData.modules?.includes(module.id)}
                                        onChange={() => handleToggleModule(module.id)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{module.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            حفظ البيانات
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SuperAdminPanel;
