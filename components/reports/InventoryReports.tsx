
import React, { useState } from 'react';
import { Product } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import ProductSelectorModal from './ProductSelectorModal';
import Modal from '../shared/Modal';
import useStore from '../../lib/store';
import { 
    generateProductCardexReportContent,
    generateReorderPointReportContent,
    generateSalesAnalysisReportContent,
    generateInventoryReportContent
} from '../../lib/reportTemplates';
import InventoryCheckView from './InventoryCheckView';

interface InventoryReportsProps {
    setActiveReport: (report: string | null) => void;
}

const InventoryReports: React.FC<InventoryReportsProps> = ({ setActiveReport }) => {
    const appData = useStore(state => state.appData);
    const [isProductSelectorOpen, setProductSelectorOpen] = useState(false);
    const [isJardViewOpen, setIsJardViewOpen] = useState(false);

    const [analysisStartDate, setAnalysisStartDate] = useState('');
    const [analysisEndDate, setAnalysisEndDate] = useState('');

    if (!appData) return <div>Loading report data...</div>;

    if (isJardViewOpen) {
        return <InventoryCheckView onBack={() => setIsJardViewOpen(false)} />;
    }

    const openReportWindow = (title: string, content: string) => {
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(content);
            reportWindow.document.close();
        } else {
            alert("يرجى السماح بالنوافذ المنبثقة لفتح التقرير.");
        }
    };
    
    const handleProductSelectForCardex = (product: Product, startDate: string, endDate: string) => {
        setProductSelectorOpen(false);
        const content = generateProductCardexReportContent(appData, product.id, startDate, endDate);
        openReportWindow(`كارت الصنف - ${product.name}`, content);
    };

    const ReportCard: React.FC<{icon: string, title: string, description: string, onClick: () => void}> = ({icon, title, description, onClick}) => (
        <div onClick={onClick} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center gap-6 cursor-pointer transition-transform transform hover:-translate-y-1 hover:shadow-xl">
             <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light text-white rounded-2xl flex justify-center items-center text-3xl shadow-md">
                <i className={`fas ${icon}`}></i>
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in">
            <SectionHeader icon="fa-warehouse" title="تقارير المخزون">
                <button onClick={() => setActiveReport(null)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                    <i className="fas fa-arrow-right"></i>
                    العودة للتقارير
                </button>
            </SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ReportCard icon="fa-exchange-alt" title="تقرير حركة صنف" description="تتبع كل الحركات على صنف معين (كارت الصنف)" onClick={() => setProductSelectorOpen(true)} />
                <ReportCard icon="fa-exclamation-triangle" title="تقرير حد الطلب" description="عرض الأصناف التي وصلت لكمية إعادة الطلب" onClick={() => openReportWindow('تقرير حد الطلب', generateReorderPointReportContent(appData))} />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
                    <div>
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light text-white rounded-2xl flex justify-center items-center text-3xl shadow-md mb-4">
                            <i className="fas fa-chart-bar"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">تحليل المبيعات</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">عرض الأصناف الأكثر والأقل مبيعاً</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">تاريخ البداية:</label>
                            <input 
                                type="date" 
                                value={analysisStartDate}
                                onChange={e => setAnalysisStartDate(e.target.value)}
                                className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                           <label className="text-sm font-medium text-gray-600 dark:text-gray-300">تاريخ النهاية:</label>
                           <input 
                                type="date" 
                                value={analysisEndDate}
                                onChange={e => setAnalysisEndDate(e.target.value)}
                                className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                            />
                        </div>
                        <button 
                             onClick={() => openReportWindow('تحليل المبيعات', generateSalesAnalysisReportContent(appData, analysisStartDate, analysisEndDate))}
                             className="w-full mt-2 bg-primary text-white py-2 rounded-lg hover:bg-primary-dark transition text-sm flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-chart-line"></i>
                            عرض التقرير
                        </button>
                    </div>
                </div>
                <ReportCard icon="fa-clipboard-check" title="جرد المخزون الفعلي" description="إدخال الجرد الفعلي ومطابقته مع الدفتري" onClick={() => setIsJardViewOpen(true)} />
            </div>

            {isProductSelectorOpen && (
                <ProductSelectorModal 
                    isOpen={isProductSelectorOpen}
                    onClose={() => setProductSelectorOpen(false)}
                    products={appData.products}
                    onSelect={handleProductSelectForCardex}
                />
            )}
        </div>
    );
};

export default InventoryReports;
