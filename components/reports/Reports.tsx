
import React from 'react';
import SectionHeader from '../shared/SectionHeader';
import useStore from '../../lib/store';
import { 
    generateEmployeesReportContent,
    generateAdvancesReportContent,
    generateAttendanceReportContent,
    generatePayrollReportContent,
    generateExpensesReportContent,
    generateSuppliersReportContent,
    generateSalesReportContent
} from '../../lib/reportTemplates';

interface ReportsProps {
    setActiveReport: (report: string | null) => void;
}

const Reports: React.FC<ReportsProps> = ({ setActiveReport }) => {
    
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

    const reportsList = [
        { key: 'inventory', icon: 'fa-warehouse', title: 'تقارير المخزون', description: 'حركة الأصناف، حد الطلب، تحليل المبيعات' },
        { key: 'sales', icon: 'fa-dollar-sign', title: 'تقرير المبيعات', description: 'تحليل مفصل للمبيعات اليومية والأرباح' },
        { key: 'employees', icon: 'fa-users', title: 'تقرير الموظفين', description: 'بيانات شاملة لجميع الموظفين' },
        { key: 'financials', icon: 'fa-hand-holding-usd', title: 'التقارير المالية', description: 'السلف، المرتبات، والمصاريف' },
        { key: 'suppliers', icon: 'fa-truck', title: 'تقرير الموردين', description: 'المدفوعات والفواتير' },
    ];


    return (
        <div className="animate-fade-in">
            <SectionHeader icon="fa-file-alt" title="التقارير" />
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportsList.map(report => (
                    <ReportCard 
                        key={report.key}
                        icon={report.icon} 
                        title={report.title} 
                        description={report.description} 
                        onClick={() => setActiveReport(report.key)} 
                    />
                ))}
            </div>
        </div>
    );
};

export default Reports;
