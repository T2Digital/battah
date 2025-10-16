
import React, { useState } from 'react';
// Fix: Corrected import paths
import { Product } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import ProductSelectorModal from './ProductSelectorModal';
import useStore from '../../lib/store';
import { 
    generateProductCardexReportContent,
    generateReorderPointReportContent,
    generateSalesAnalysisReportContent
} from '../../lib/reportTemplates';

interface InventoryReportsProps {
    setActiveReport: (report: string | null) => void;
}

const InventoryReports: React.FC<InventoryReportsProps> = ({ setActiveReport }) => {
    const appData = useStore(state => state.appData);
    const [isProductSelectorOpen, setProductSelectorOpen] = useState(false);

    if (!appData) return <div>Loading report data...</div>;

    const openReportWindow = (title: string, content: string) => {
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(content);
            reportWindow.document.close();
        } else {
            alert("يرجى السماح بالنوافذ المنبثقة لفتح التقرير.");
        }
    };
    
    const handleProductSelectForCardex = (product: Product) => {
        setProductSelectorOpen(false);
        const content = generateProductCardexReportContent(appData, product.id);
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
                <ReportCard icon="fa-chart-bar" title="تحليل المبيعات" description="عرض الأصناف الأكثر والأقل مبيعاً" onClick={() => openReportWindow('تحليل المبيعات', generateSalesAnalysisReportContent(appData))} />
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
