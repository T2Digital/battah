
import React, { useMemo, useState } from 'react';
import { TreasuryTransaction } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import { formatDateTime, formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';
import Modal from '../shared/Modal';
import AdminPasswordModal from '../shared/AdminPasswordModal';

interface TreasuryProps {
    treasury: TreasuryTransaction[];
}

const Treasury: React.FC<TreasuryProps> = ({ treasury }) => {
    const { resetTreasury, clearTreasury, deleteTreasuryTransaction, appData } = useStore();
    const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', type: '' });
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [newBalance, setNewBalance] = useState<string>('');
    const [error, setError] = useState('');
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);
    const [securityAction, setSecurityAction] = useState<'setBalance' | 'clearTreasury' | 'deleteTransaction' | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<number | string | null>(null);

    const processedTransactions = useMemo(() => {
        let balance = 0;
        let cashBalance = 0;
        let electronicBalance = 0;
        // Sort by date ascending to calculate running balance correctly
        const sorted = [...treasury].sort((a, b) => {
             const dateA = new Date(a.date).getTime();
             const dateB = new Date(b.date).getTime();
             return dateA - dateB || (Number(a.id) - Number(b.id));
        });
        
        return sorted.map(t => {
                balance += (t.amountIn || 0) - (t.amountOut || 0);
                if (t.paymentMethod === 'electronic') {
                    electronicBalance += (t.amountIn || 0) - (t.amountOut || 0);
                } else {
                    cashBalance += (t.amountIn || 0) - (t.amountOut || 0);
                }
                return { ...t, balance, cashBalance, electronicBalance };
            });
    }, [treasury]);

    const filteredTransactions = useMemo(() => {
        // Filter first, then reverse for display (newest first)
        const filtered = processedTransactions.filter(t => {
            const date = new Date(t.date);
            // Reset time part for accurate date comparison
            date.setHours(0, 0, 0, 0);
            
            const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
            if (from) from.setHours(0, 0, 0, 0);
            
            const to = filters.dateTo ? new Date(filters.dateTo) : null;
            if (to) to.setHours(0, 0, 0, 0);

            if (from && date < from) return false;
            if (to && date > to) return false;
            if (filters.type && t.type !== filters.type) return false;

            return true;
        });
        
        return filtered.reverse();
    }, [processedTransactions, filters]);
    
    const finalBalance = processedTransactions.length > 0 ? processedTransactions[processedTransactions.length - 1].balance : 0;
    const finalCashBalance = processedTransactions.length > 0 ? processedTransactions[processedTransactions.length - 1].cashBalance : 0;
    const finalElectronicBalance = processedTransactions.length > 0 ? processedTransactions[processedTransactions.length - 1].electronicBalance : 0;

    const handleSetBalance = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const balanceValue = parseFloat(newBalance);
        if (isNaN(balanceValue)) {
             setError('يرجى إدخال مبلغ صحيح');
             return;
        }
        setSecurityAction('setBalance');
        setShowSecurityCheck(true);
    };

    const executeSetBalance = async () => {
        const balanceValue = parseFloat(newBalance);
        try {
            await resetTreasury(balanceValue);
            setIsModalOpen(false);
            setNewBalance('');
            setError('');
        } catch (e) {
            console.error(e);
            setError('حدث خطأ أثناء ضبط الرصيد');
        }
    };

    const handleDelete = async (id: number | string) => {
        if (window.confirm('هل أنت متأكد من حذف هذه المعاملة؟ لا يمكن التراجع عن هذا الإجراء.')) {
            setTransactionToDelete(id);
            setSecurityAction('deleteTransaction');
            setShowSecurityCheck(true);
        }
    };

    const executeDeleteTransaction = async () => {
        if (transactionToDelete !== null) {
            try {
                await deleteTreasuryTransaction(transactionToDelete);
            } catch (e) {
                console.error(e);
                alert('حدث خطأ أثناء الحذف');
            } finally {
                setTransactionToDelete(null);
            }
        }
    };

    const handleClearTreasury = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSecurityAction('clearTreasury');
        setShowSecurityCheck(true);
    };

    const executeClearTreasury = async () => {
        try {
            await clearTreasury();
            setIsClearModalOpen(false);
            setError('');
        } catch (e) {
            console.error(e);
            setError('حدث خطأ أثناء مسح المعاملات');
        }
    };

    const handleSecuritySuccess = () => {
        setShowSecurityCheck(false);
        if (securityAction === 'setBalance') {
            executeSetBalance();
        } else if (securityAction === 'clearTreasury') {
            executeClearTreasury();
        } else if (securityAction === 'deleteTransaction') {
            executeDeleteTransaction();
        }
        setSecurityAction(null);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-cash-register" title="الخزينة" />
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex justify-between items-center">
                <div className="flex gap-8">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">الرصيد الحالي للخزينة</h3>
                        <p className={`text-4xl font-bold mt-2 ${finalBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(finalBalance)}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">رصيد الدفع النقدي</h3>
                        <p className={`text-xl font-bold mt-1 ${finalCashBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(finalCashBalance)}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">رصيد الدفع الإلكتروني</h3>
                        <p className={`text-xl font-bold mt-1 ${finalElectronicBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(finalElectronicBalance)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsClearModalOpen(true)}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition shadow-md flex items-center gap-2"
                    >
                        <i className="fas fa-trash-alt"></i>
                        مسح جميع المعاملات
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition shadow-md flex items-center gap-2"
                    >
                        <i className="fas fa-edit"></i>
                        ضبط الرصيد / تصفير
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4">
                <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="">كل الأنواع</option>
                    <option value="إيراد مبيعات">إيراد مبيعات</option>
                    <option value="مرتجع مبيعات">مرتجع مبيعات</option>
                    <option value="مصروف">مصروف</option>
                    <option value="راتب">راتب</option>
                    <option value="دفعة لمورد">دفعة لمورد</option>
                    <option value="سلفة">سلفة</option>
                    <option value="إيراد آخر">إيراد آخر</option>
                    <option value="مصروف آخر">مصروف آخر</option>
                </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">التاريخ والوقت</th>
                            <th className="px-6 py-3">النوع</th>
                            <th className="px-6 py-3">الوصف</th>
                            <th className="px-6 py-3">الوارد</th>
                            <th className="px-6 py-3">المنصرف</th>
                            <th className="px-6 py-3">الرصيد</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(t.date, t.timestamp)}</td>
                                <td className="px-6 py-4">{t.type}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                <td className="px-6 py-4 text-green-500 font-semibold">{t.amountIn > 0 ? formatCurrency(t.amountIn) : '-'}</td>
                                <td className="px-6 py-4 text-red-500 font-semibold">{t.amountOut > 0 ? formatCurrency(t.amountOut) : '-'}</td>
                                <td className="px-6 py-4 font-bold">{formatCurrency(t.balance)}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700" title="حذف المعاملة">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="ضبط رصيد الخزينة" onSave={handleSetBalance} saveLabel="تأكيد">
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            سيتم إضافة معاملة تسوية لضبط رصيد الخزينة إلى المبلغ المحدد.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرصيد الجديد المطلوب</label>
                            <input 
                                type="number" 
                                value={newBalance} 
                                onChange={e => setNewBalance(e.target.value)}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                placeholder="0"
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                    </div>
                </Modal>
            )}

            {isClearModalOpen && (
                <Modal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} title="مسح جميع المعاملات" onSave={handleClearTreasury} saveLabel="تأكيد الحذف">
                    <div className="space-y-4">
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <strong className="font-bold">تحذير! </strong>
                            <span className="block sm:inline">سيتم مسح جميع معاملات الخزينة بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.</span>
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                    </div>
                </Modal>
            )}

            {showSecurityCheck && (
                <AdminPasswordModal
                    isOpen={showSecurityCheck}
                    onClose={() => {
                        setShowSecurityCheck(false);
                        setSecurityAction(null);
                    }}
                    onSuccess={handleSecuritySuccess}
                    actionDescription={securityAction === 'setBalance' ? 'ضبط رصيد الخزينة' : securityAction === 'clearTreasury' ? 'مسح جميع المعاملات' : 'حذف معاملة'}
                />
            )}
        </div>
    );
};

export default Treasury;
