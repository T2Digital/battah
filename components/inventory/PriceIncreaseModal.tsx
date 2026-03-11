import React, { useState } from 'react';
import Modal from '../shared/Modal';
import { MainCategory } from '../../types';
import useStore from '../../lib/store';

interface PriceIncreaseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PriceIncreaseModal: React.FC<PriceIncreaseModalProps> = ({ isOpen, onClose }) => {
    const { increasePrices } = useStore();
    const [percentage, setPercentage] = useState<number>(5);
    const [category, setCategory] = useState<MainCategory | 'all'>('all');
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionType, setActionType] = useState<'increase' | 'decrease'>('increase');
    
    const percentages = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsProcessing(true);
        try {
            const finalPercentage = actionType === 'increase' ? percentage : -percentage;
            await increasePrices(finalPercentage, category === 'all' ? undefined : category);
            alert(actionType === 'increase' ? 'تم زيادة الأسعار بنجاح' : 'تم خفض الأسعار بنجاح');
            onClose();
        } catch (error) {
            console.error("Failed to adjust prices:", error);
            alert("فشل تعديل الأسعار");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تعديل أسعار المنتجات" onSave={handleSave} saveLabel={isProcessing ? "جاري المعالجة..." : "تأكيد التعديل"}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع التعديل</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input type="radio" name="actionType" value="increase" checked={actionType === 'increase'} onChange={() => setActionType('increase')} />
                            زيادة الأسعار
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" name="actionType" value="decrease" checked={actionType === 'decrease'} onChange={() => setActionType('decrease')} />
                            خفض الأسعار
                        </label>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفئة</label>
                    <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value as MainCategory | 'all')}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="all">جميع المنتجات</option>
                        {(['قطع غيار', 'كماليات و إكسسوارات', 'زيوت وشحومات', 'بطاريات', 'إطارات'] as MainCategory[]).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نسبة الزيادة</label>
                    <div className="grid grid-cols-5 gap-2">
                        {percentages.map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPercentage(p)}
                                className={`p-2 rounded border text-center transition-colors ${
                                    percentage === p 
                                        ? 'bg-primary text-white border-primary' 
                                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                                }`}
                            >
                                {p}%
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className={`p-3 rounded-md text-sm ${actionType === 'increase' ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'}`}>
                    <i className="fas fa-exclamation-triangle ml-2"></i>
                    تنبيه: سيتم {actionType === 'increase' ? 'زيادة' : 'خفض'} أسعار البيع لـ {category === 'all' ? 'جميع المنتجات' : `منتجات قسم ${category}`} بنسبة {percentage}%. لا يمكن التراجع عن هذه العملية بسهولة.
                </div>
            </div>
        </Modal>
    );
};

export default PriceIncreaseModal;
