

import React from 'react';
import Modal from '../shared/Modal';

interface CustomizeDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    visibleCards: { [key: string]: boolean };
    setVisibleCards: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
}

const cardLabels: { [key: string]: string } = {
    treasury: 'رصيد الخزينة',
    profit: 'صافي الربح اليومي',
    todaySalesTotal: 'إجمالي مبيعات اليوم',
    todayBranchSales: 'مبيعات الفروع اليوم',
    todayOnlineSales: 'مبيعات الأونلاين اليوم',
    sellerSales: 'مبيعات البائع (للبائعين فقط)',
    todayInvoices: 'عدد فواتير اليوم',
    todayExpenses: 'مصروفات اليوم',
    reorderPoint: 'منتجات وصلت لحد الطلب',
    pendingOrders: 'طلبات أونلاين المعلقة',
    suppliersDebt: 'مديونية الموردين',
    customersDebt: 'مديونية العملاء',
};

const CustomizeDashboardModal: React.FC<CustomizeDashboardModalProps> = ({ isOpen, onClose, visibleCards, setVisibleCards }) => {

    const handleToggle = (cardKey: string) => {
        setVisibleCards(prev => ({
            ...prev,
            [cardKey]: !prev[cardKey],
        }));
    };
    
    // This modal doesn't need a save button, changes are instant.
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تخصيص لوحة التحكم" onSave={handleSubmit} saveLabel="إغلاق">
            <p className="mb-4 text-gray-600 dark:text-gray-300">اختر بطاقات الإحصائيات التي تريد عرضها في لوحة التحكم الرئيسية.</p>
            <div className="space-y-3">
                {Object.keys(cardLabels).map(key => (
                    <label key={key} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={visibleCards[key] ?? false}
                            onChange={() => handleToggle(key)}
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="mr-3 text-gray-800 dark:text-gray-200">{cardLabels[key]}</span>
                    </label>
                ))}
            </div>
        </Modal>
    );
};

export default CustomizeDashboardModal;
