import React, { useState, useMemo } from 'react';
import useStore from '../../lib/store';
import { DailyReview as DailyReviewType } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatDate, formatCurrency } from '../../lib/utils';

const DailyReviewModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (r: Omit<DailyReviewType, 'id'> & { id?: number }) => void; reviewToEdit: DailyReviewType | null;
}> = ({ isOpen, onClose, onSave, reviewToEdit }) => {
    const [formData, setFormData] = useState<Omit<DailyReviewType, 'id' | 'totalSales'>>({ date: new Date().toISOString().split('T')[0], branch: 'branch1', salesCash: 0, salesElectronic: 0, salesParts: 0, salesAccessories: 0, drawerBalance: 0, notes: '' });
    
    React.useEffect(() => {
        if (reviewToEdit) {
            setFormData({ ...reviewToEdit, notes: reviewToEdit.notes || '' });
        } else {
            setFormData({ date: new Date().toISOString().split('T')[0], branch: 'branch1', salesCash: 0, salesElectronic: 0, salesParts: 0, salesAccessories: 0, drawerBalance: 0, notes: '' });
        }
    }, [reviewToEdit, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: (e.target.type === 'number') ? Number(value) : value as any }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
                        <option value="main">المخزن</option>
                        <option value="branch1">الرئيسي</option>
                        <option value="branch2">فرع 1</option>
                        <option value="branch3">فرع 2</option>
                    </select>
                </div>
                <div><label>المبيعات النقدية *</label><input type="number" name="salesCash" value={formData.salesCash === 0 ? '' : formData.salesCash} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div><label>المبيعات الإلكترونية *</label><input type="number" name="salesElectronic" value={formData.salesElectronic === 0 ? '' : formData.salesElectronic} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div><label>مبيعات قطع غيار</label><input type="number" name="salesParts" value={formData.salesParts === 0 ? '' : formData.salesParts} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div><label>مبيعات كماليات وإكسسوارات</label><input type="number" name="salesAccessories" value={formData.salesAccessories === 0 ? '' : formData.salesAccessories} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>رصيد الدرج *</label><input type="number" name="drawerBalance" value={formData.drawerBalance === 0 ? '' : formData.drawerBalance} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" /></div>
                <div className="md:col-span-2"><label>ملاحظات</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea></div>
            </div>
        </Modal>
    );
};


const DailyReview: React.FC = () => {
    const { dailyReviews, setDailyReviews, deleteDailyReview, fetchDataByDateRange } = useStore(state => ({
        dailyReviews: state.appData?.dailyReview || [],
        setDailyReviews: state.setDailyReviews,
        deleteDailyReview: state.deleteDailyReview,
        fetchDataByDateRange: state.fetchDataByDateRange
    }));
    const [isModalOpen, setModalOpen] = useState(false);
    const [reviewToEdit, setReviewToEdit] = useState<DailyReviewType | null>(null);
    const [reviewToDelete, setReviewToDelete] = useState<DailyReviewType | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
    const [filterPeriod, setFilterPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');

    const handleSave = (review: Omit<DailyReviewType, 'id'> & { id?: number }) => {
        if (review.id) {
            setDailyReviews(dailyReviews.map(r => r.id === review.id ? { ...r, ...review } as DailyReviewType : r));
        } else {
            const newId = Math.max(0, ...dailyReviews.map(r => r.id)) + 1;
            setDailyReviews([...dailyReviews, { ...review, id: newId } as DailyReviewType]);
        }
        setModalOpen(false);
    };

    const confirmDelete = async () => {
        if (!reviewToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDailyReview(reviewToDelete.id);
            setReviewToDelete(null);
        } catch (error) {
            console.error("Failed to delete daily review:", error);
            alert(`فشل حذف المراجعة: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const sortedReviews = useMemo(() => {
        return [...dailyReviews]
            .filter(r => {
                let dateMatch = true;
                if (filters.dateFrom && filters.dateTo) {
                    const rDate = new Date(r.date);
                    rDate.setHours(0, 0, 0, 0);
                    const from = new Date(filters.dateFrom);
                    from.setHours(0, 0, 0, 0);
                    const to = new Date(filters.dateTo);
                    to.setHours(0, 0, 0, 0);
                    dateMatch = rDate >= from && rDate <= to;
                }
                return dateMatch;
            })
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyReviews, filters]);

    const branchNames = {
        main: 'المخزن',
        branch1: 'الرئيسي',
        branch2: 'فرع 1',
        branch3: 'فرع 2',
    };

    const handlePrintReport = () => {
        import('../../lib/reportTemplates').then(({ generateDailyReviewReportContent }) => {
            const content = generateDailyReviewReportContent(sortedReviews, filters.dateFrom, filters.dateTo);
            const reportWindow = window.open('', '_blank');
            if (reportWindow) {
                reportWindow.document.write(content);
                reportWindow.document.close();
            }
        });
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-chart-line" title="مراجعة اليوميات">
                <div className="flex gap-2">
                    <button onClick={handlePrintReport} className="px-4 py-2 bg-secondary text-white rounded-lg flex items-center gap-2 hover:bg-secondary-dark transition shadow-md">
                        <i className="fas fa-print"></i> طباعة التقرير
                    </button>
                    <button onClick={() => { setReviewToEdit(null); setModalOpen(true); }} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                        <i className="fas fa-plus"></i> إضافة مراجعة
                    </button>
                </div>
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
                            fetchDataByDateRange('dailyReview', filters.dateFrom, filters.dateTo);
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
                             <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">الفرع</th>
                            <th className="px-6 py-3">مبيعات المحل</th>
                            <th className="px-6 py-3">طلبات الأونلاين</th>
                            <th className="px-6 py-3">المصروفات</th>
                            <th className="px-6 py-3">رصيد الدرج</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedReviews.map(r => (
                            <tr key={r.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{formatDate(r.date)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{branchNames[r.branch] || r.branch}</td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-green-600 dark:text-green-400">{formatCurrency(r.totalSales)}</div>
                                    <div className="text-xs text-gray-500">كاش: {formatCurrency(r.salesCash)}</div>
                                    <div className="text-xs text-gray-500">إلكترونى: {formatCurrency(r.salesElectronic)}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(r.onlineOrdersTotal || 0)}</div>
                                    <div className="text-xs text-gray-500">عدد: {r.onlineOrdersCount || 0} طلب</div>
                                </td>
                                <td className="px-6 py-4 font-bold text-red-600 dark:text-red-400">{formatCurrency(r.expensesTotal || 0)}</td>
                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{formatCurrency(r.drawerBalance)}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => { setReviewToEdit(r); setModalOpen(true); }} className="text-blue-500"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => setReviewToDelete(r)} className="text-red-500"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <DailyReviewModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} reviewToEdit={reviewToEdit} />
            
            {reviewToDelete && (
                <ConfirmationModal
                    isOpen={!!reviewToDelete}
                    onClose={() => setReviewToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف مراجعة يوم ${formatDate(reviewToDelete.date)}؟`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}
        </div>
    );
};

export default DailyReview;