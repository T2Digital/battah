import React, { useState, useMemo } from 'react';
// Fix: Corrected import path
import { DailyReview as DailyReviewType, Branch } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import { formatDate, formatCurrency } from '../../lib/utils';

interface DailyReviewProps {
    dailyReviews: DailyReviewType[];
    setDailyReviews: (reviews: DailyReviewType[]) => void;
}

const DailyReviewModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (r: Omit<DailyReviewType, 'id'> & { id?: number }) => void; reviewToEdit: DailyReviewType | null;
}> = ({ isOpen, onClose, onSave, reviewToEdit }) => {
    const [formData, setFormData] = useState<Omit<DailyReviewType, 'id' | 'totalSales'>>({ date: new Date().toISOString().split('T')[0], branch: 'main', salesCash: 0, salesElectronic: 0, salesParts: 0, salesAccessories: 0, drawerBalance: 0, notes: '' });
    
    React.useEffect(() => {
        if (reviewToEdit) {
            setFormData({ ...reviewToEdit, notes: reviewToEdit.notes || '' });
        } else {
            setFormData({ date: new Date().toISOString().split('T')[0], branch: 'main', salesCash: 0, salesElectronic: 0, salesParts: 0, salesAccessories: 0, drawerBalance: 0, notes: '' });
        }
    }, [reviewToEdit, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: (e.target.type === 'number') ? Number(value) : value as any }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // FIX: Calculate totalSales before saving, as it's required by the onSave prop's type.
        const totalSales = formData.salesCash + formData.salesElectronic;
        const reviewData = { ...formData, totalSales };
        onSave(reviewToEdit ? { ...reviewData, id: reviewToEdit.id } : reviewData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={reviewToEdit ? 'تعديل مراجعة يومية' : 'إضافة مراجعة يومية'} onSave={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label>التاريخ *</label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div>
                    <label>الفرع *</label>
                    <select name="branch" value={formData.branch} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                        <option value="main">المخزن الرئيسي</option>
                        <option value="branch1">فرع 1</option>
                        <option value="branch2">فرع 2</option>
                        <option value="branch3">فرع 3</option>
                    </select>
                </div>
                <div><label>المبيعات النقدية *</label><input type="number" name="salesCash" value={formData.salesCash} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div><label>المبيعات الإلكترونية *</label><input type="number" name="salesElectronic" value={formData.salesElectronic} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div><label>مبيعات قطع غيار</label><input type="number" name="salesParts" value={formData.salesParts} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div><label>مبيعات كماليات</label><input type="number" name="salesAccessories" value={formData.salesAccessories} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>رصيد الدرج *</label><input type="number" name="drawerBalance" value={formData.drawerBalance} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea></div>
            </div>
        </Modal>
    );
};


const DailyReview: React.FC<DailyReviewProps> = ({ dailyReviews, setDailyReviews }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [reviewToEdit, setReviewToEdit] = useState<DailyReviewType | null>(null);

    const handleSave = (review: Omit<DailyReviewType, 'id'> & { id?: number }) => {
        if (review.id) {
            setDailyReviews(dailyReviews.map(r => r.id === review.id ? { ...r, ...review } : r));
        } else {
            const newId = Math.max(0, ...dailyReviews.map(r => r.id)) + 1;
            setDailyReviews([...dailyReviews, { ...review, id: newId }]);
        }
        setModalOpen(false);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذه المراجعة؟')) {
            setDailyReviews(dailyReviews.filter(r => r.id !== id));
        }
    };
    
    const sortedReviews = useMemo(() => {
        return [...dailyReviews].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyReviews]);

    const branchNames = {
        main: 'المخزن الرئيسي',
        branch1: 'فرع 1',
        branch2: 'فرع 2',
        branch3: 'فرع 3',
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-chart-line" title="مراجعة اليوميات">
                <button onClick={() => { setReviewToEdit(null); setModalOpen(true); }} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i> إضافة مراجعة
                </button>
            </SectionHeader>

             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">الفرع</th>
                            <th className="px-6 py-3">المبيعات النقدية</th>
                            <th className="px-6 py-3">المبيعات الإلكترونية</th>
                            <th className="px-6 py-3">رصيد الدرج</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedReviews.map(r => (
                            <tr key={r.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{formatDate(r.date)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{branchNames[r.branch] || r.branch}</td>
                                <td className="px-6 py-4">{formatCurrency(r.salesCash)}</td>
                                <td className="px-6 py-4">{formatCurrency(r.salesElectronic)}</td>
                                <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">{formatCurrency(r.drawerBalance)}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => { setReviewToEdit(r); setModalOpen(true); }} className="text-blue-500"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => handleDelete(r.id)} className="text-red-500"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <DailyReviewModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} reviewToEdit={reviewToEdit} />
        </div>
    );
};

export default DailyReview;