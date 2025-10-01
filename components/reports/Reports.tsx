
import React from 'react';
import SectionHeader from '../shared/SectionHeader';
import { AppData } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { 
    generateEmployeesReportContent,
    generateAdvancesReportContent,
    generateAttendanceReportContent,
    generatePayrollReportContent,
    generateExpensesReportContent,
    generateSuppliersReportContent
} from '../../lib/reportTemplates';

interface ReportsProps {
    appData: AppData
}

const Reports: React.FC<ReportsProps> = ({ appData }) => {
    
    const openReportWindow = (title: string, content: string) => {
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(content);
            reportWindow.document.close();
        } else {
            alert("يرجى السماح بالنوافذ المنبثقة لفتح التقرير.");
        }
    };
    
    const ReportCard: React.FC<{icon: string, title: string, description: string, onClick: () => void}> = ({icon, title, description, onClick}) => (
        <div onClick={onClick} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center gap-6 cursor-pointer transition-transform transform hover:-translate-y-1 hover:shadow-xl">
             <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary-light text-white rounded-2xl flex justify-center items-center text-3xl shadow-md">
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
            <SectionHeader icon="fa-file-alt" title="التقارير" />
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ReportCard icon="fa-users" title="تقرير الموظفين" description="بيانات شاملة لجميع الموظفين" onClick={() => openReportWindow('تقرير الموظفين', generateEmployeesReportContent(appData))} />
                <ReportCard icon="fa-hand-holding-usd" title="تقرير السلف" description="سلف الموظفين والمتبقي منها" onClick={() => openReportWindow('تقرير السلف', generateAdvancesReportContent(appData))} />
                <ReportCard icon="fa-clock" title="تقرير الحضور" description="حضور وانصراف الموظفين" onClick={() => openReportWindow('تقرير الحضور', generateAttendanceReportContent(appData))} />
                <ReportCard icon="fa-money-check-alt" title="تقرير المرتبات" description="دفعات الرواتب والمستحقات" onClick={() => openReportWindow('تقرير المرتبات', generatePayrollReportContent(appData))} />
                <ReportCard icon="fa-receipt" title="تقرير المصاريف" description="تفصيل المصاريف حسب النوع" onClick={() => openReportWindow('تقرير المصاريف', generateExpensesReportContent(appData))} />
                <ReportCard icon="fa-truck" title="تقرير الموردين" description="المدفوعات والفواتير" onClick={() => openReportWindow('تقرير الموردين', generateSuppliersReportContent(appData))} />
            </div>
        </div>
    );
};

export default Reports;
