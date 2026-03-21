

import React, { useState, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import useStore from '../../lib/store';
import { DiscountCode } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import { formatCurrency, formatDate } from '../../lib/utils';
import DiscountCodeModal from './DiscountCodeModal';
import ConfirmationModal from '../shared/ConfirmationModal';

const Promotions: React.FC = () => {
    const { discountCodes, addDiscountCode, updateDiscountCode, deleteDiscountCode } = useStore(state => ({
        discountCodes: state.appData?.discountCodes || [],
        addDiscountCode: state.addDiscountCode,
        updateDiscountCode: state.updateDiscountCode,
        deleteDiscountCode: state.deleteDiscountCode,
    }));

    const [isModalOpen, setModalOpen] = useState(false);
    const [codeToEdit, setCodeToEdit] = useState<DiscountCode | null>(null);
    const [codeToDelete, setCodeToDelete] = useState<DiscountCode | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleAdd = () => {
        setCodeToEdit(null);
        setModalOpen(true);
    };

    const handleEdit = (code: DiscountCode) => {
        setCodeToEdit(code);
        setModalOpen(true);
    };

    const handleSave = async (codeData: Omit<DiscountCode, 'id'> & { id?: string }) => {
        const { id, ...data } = codeData;

        if (!data.code || data.code.trim() === '') {
            alert("كود الخصم لا يمكن أن يكون فارغاً.");
            return;
        }

        try {
            if (id) {
                // This is an update
                await updateDiscountCode(id, data);
            } else {
                // This is a new code, we must ensure it doesn't already exist.
                const tenantId = useStore.getState().currentTenant?.id || 'battah';
                const docRef = doc(db, 'tenants', tenantId, "discountCodes", data.code);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    alert('هذا الكود موجود بالفعل. يرجى اختيار كود آخر.');
                    return;
                }
                await addDiscountCode(data);
            }
            setModalOpen(false);
        } catch (error) {
            console.error("Failed to save discount code:", error);
            alert(`حدث خطأ أثناء حفظ الكود: ${error instanceof Error ? error.message : String(error)}`);
        }
    };


    const confirmDelete = async () => {
        if (!codeToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDiscountCode(codeToDelete.id);
            setCodeToDelete(null);
        } catch (error) {
            console.error("Failed to delete discount code:", error);
            alert(`فشل حذف كود الخصم: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const { activeCodes, totalCodes } = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return {
            activeCodes: discountCodes.filter(c => c.isActive && c.expiresAt >= today).length,
            totalCodes: discountCodes.length,
        };
    }, [discountCodes]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-tags" title="إدارة العروض وأكواد الخصم">
                <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    إضافة كود خصم
                </button>
            </SectionHeader>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
                    <h4 className="text-gray-500">الأكواد النشطة حالياً</h4>
                    <p className="text-3xl font-bold text-green-500">{activeCodes}</p>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
                    <h4 className="text-gray-500">إجمالي الأكواد</h4>
                    <p className="text-3xl font-bold text-blue-500">{totalCodes}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">الكود</th>
                            <th className="px-6 py-3">النوع</th>
                            <th className="px-6 py-3">القيمة</th>
                            <th className="px-6 py-3">تاريخ الانتهاء</th>
                            <th className="px-6 py-3">الحالة</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {discountCodes.map(code => {
                            const today = new Date().toISOString().split('T')[0];
                            const isExpired = today > code.expiresAt;
                            const status = code.isActive && !isExpired ? 'نشط' : 'غير نشط';
                            return (
                                <tr key={code.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-mono font-bold text-gray-800 dark:text-gray-200">{code.code}</td>
                                    <td className="px-6 py-4">{code.type === 'fixed' ? 'مبلغ ثابت' : 'نسبة مئوية'}</td>
                                    <td className="px-6 py-4">{code.type === 'fixed' ? formatCurrency(code.value) : `${code.value}%`}</td>
                                    <td className="px-6 py-4">{formatDate(code.expiresAt)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'نشط' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => handleEdit(code)} className="text-blue-500 hover:text-blue-700 text-lg"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => setCodeToDelete(code)} className="text-red-500 hover:text-red-700 text-lg"><i className="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <DiscountCodeModal
                    isOpen={isModalOpen}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                    existingCode={codeToEdit}
                />
            )}

            {codeToDelete && (
                <ConfirmationModal
                    isOpen={!!codeToDelete}
                    onClose={() => setCodeToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف كود الخصم "${codeToDelete.code}"؟`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}
        </div>
    );
};

export default Promotions;