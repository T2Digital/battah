

import React, { useMemo, useState } from 'react';
import useStore from '../../lib/store';
import { Employee } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import SectionHeader from '../shared/SectionHeader';
import { generateEmployeesReportContent } from '../../lib/reportTemplates';

interface EmployeesReportViewProps {
    setActiveReport: (report: string | null) => void;
}

const EmployeesReportView: React.FC<EmployeesReportViewProps> = ({ setActiveReport }) => {
    const appData = useStore(state => state.appData);
    const { employees = [] } = appData || {};
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('');

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => 
            (emp.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (positionFilter ? emp.position === positionFilter : true)
        );
    }, [employees, searchTerm, positionFilter]);

    const totalSalaries = useMemo(() => 
        filteredEmployees.reduce((sum, emp) => sum + emp.basicSalary, 0),
    [filteredEmployees]);

    const handlePrint = () => {
        if (!appData) return;
        const content = generateEmployeesReportContent(appData);
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(content);
            reportWindow.document.close();
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-users" title="تقرير الموظفين">
                 <button onClick={handlePrint} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-md">
                    <i className="fas fa-print"></i>
                    طباعة التقرير
                </button>
                <button onClick={() => setActiveReport(null)} className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                    <i className="fas fa-arrow-right"></i>
                    العودة
                </button>
            </SectionHeader>
            
             <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="البحث عن موظف..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
                <select
                    value={positionFilter}
                    onChange={e => setPositionFilter(e.target.value)}
                    className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="">جميع المناصب</option>
                    {/* FIX: Explicitly provide the generic type 'string' to the Set constructor to resolve type inference issue where `pos` was `unknown`. */}
                    {[...new Set<string>(employees.map(e => e.position))].sort().map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">الاسم</th>
                            <th className="px-6 py-3">المنصب</th>
                            <th className="px-6 py-3">الراتب</th>
                            <th className="px-6 py-3">تاريخ التوظيف والوقت</th>
                            <th className="px-6 py-3">الهاتف</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.map(emp => (
                            <tr key={emp.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{emp.name}</td>
                                <td className="px-6 py-4">{emp.position}</td>
                                <td className="px-6 py-4">{formatCurrency(emp.basicSalary)}</td>
                                <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(emp.hireDate, emp.timestamp)}</td>
                                <td className="px-6 py-4">{emp.phone || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold bg-gray-100 dark:bg-gray-700">
                            <td className="px-6 py-3 text-right" colSpan={2}>الإجمالي ({filteredEmployees.length} موظف)</td>
                            <td className="px-6 py-3">{formatCurrency(totalSalaries)}</td>
                            <td className="px-6 py-3" colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default EmployeesReportView;