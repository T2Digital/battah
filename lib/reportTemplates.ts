
import { AppData } from '../types';
import { formatCurrency, formatDate, calculateHours } from './utils';

const getReportStyles = (themeColor: string) => `
<style>
    body { 
        font-family: 'Cairo', Arial, sans-serif; 
        direction: rtl; 
        margin: 20px;
        color: #333;
        line-height: 1.6;
        background-color: #f9fafb;
    }
    .header { 
        text-align: center; 
        margin-bottom: 30px; 
        border-bottom: 3px solid ${themeColor};
        padding-bottom: 20px;
    }
    .header h1 { 
        color: ${themeColor}; 
        margin-bottom: 10px;
        font-size: 28px;
    }
    .header h2 { 
        color: #4b5563; 
        margin-bottom: 5px;
        font-size: 20px;
    }
    .summary {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 30px;
        border-right: 4px solid ${themeColor};
    }
    .summary h3 {
        color: ${themeColor};
        margin-bottom: 15px;
        font-size: 18px;
    }
    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 15px;
    }
    .summary-item {
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border: 1px solid #e5e7eb;
    }
    .summary-item p {
        margin: 0 0 5px 0;
        font-size: 14px;
        color: #6b7280;
    }
    .summary-item strong {
        color: ${themeColor};
        font-size: 20px;
    }
    table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 25px 0;
        background: white;
        box-shadow: 0 4px 15px rgba(0,0,0,0.07);
        border-radius: 10px;
        overflow: hidden;
    }
    th, td { 
        border: 1px solid #e5e7eb; 
        padding: 12px 15px; 
        text-align: right; 
    }
    th { 
        background-color: ${themeColor};
        color: white;
        font-weight: 600;
        font-size: 14px;
        text-transform: uppercase;
    }
    tbody tr:nth-child(even) {
        background-color: #f8f9fa;
    }
    tbody tr:hover {
        background-color: #f1f5f9;
    }
    .total-row {
        font-weight: bold;
        background-color: #e5e7eb !important;
        color: #1f2937;
        font-size: 16px;
    }
    .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 99px;
        font-size: 12px;
        font-weight: 500;
        color: white;
    }
    .badge-paid { background: #10b981; }
    .badge-pending { background: #ef4444; }
    .footer {
        margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;
    }
    @media print {
        body { margin: 0; background-color: white; }
        .no-print { display: none; }
        .summary, table { box-shadow: none; border: 1px solid #ddd; }
    }
</style>
`;

const generateReportHTML = (title: string, themeColor: string, content: string) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    ${getReportStyles(themeColor)}
</head>
<body>
    <div class="header">
        <h1>شركة بطاح لقطع غيار السيارات</h1>
        <h2>${title}</h2>
        <p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p>
    </div>
    ${content}
    <div class="footer">
        <p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p>
    </div>
    <script>
        setTimeout(() => window.print(), 500);
    </script>
</body>
</html>`;

export const generateEmployeesReportContent = (appData: AppData) => {
    const { employees } = appData;
    const totalSalaries = employees.reduce((sum, emp) => sum + emp.basicSalary, 0);
    
    const content = `
        <div class="summary">
            <h3>ملخص الموظفين</h3>
            <div class="summary-grid">
                <div class="summary-item"><p>إجمالي الموظفين</p><strong>${employees.length}</strong></div>
                <div class="summary-item"><p>إجمالي الرواتب</p><strong>${formatCurrency(totalSalaries)}</strong></div>
            </div>
        </div>
        <table>
            <thead><tr><th>الاسم</th><th>المنصب</th><th>الراتب</th><th>تاريخ التوظيف</th><th>الهاتف</th></tr></thead>
            <tbody>
                ${employees.map(e => `
                    <tr>
                        <td>${e.name}</td>
                        <td>${e.position}</td>
                        <td>${formatCurrency(e.basicSalary)}</td>
                        <td>${formatDate(e.hireDate)}</td>
                        <td>${e.phone || '-'}</td>
                    </tr>`).join('')}
                <tr class="total-row">
                    <td colspan="2">الإجمالي</td>
                    <td>${formatCurrency(totalSalaries)}</td>
                    <td colspan="2"></td>
                </tr>
            </tbody>
        </table>`;
    return generateReportHTML('تقرير الموظفين', '#1e40af', content);
};

export const generateAdvancesReportContent = (appData: AppData) => {
    const { advances, employees } = appData;
    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    const totalAmount = advances.reduce((s, a) => s + a.amount, 0);
    const totalPaid = advances.reduce((s, a) => s + a.payment, 0);
    const totalRemaining = totalAmount - totalPaid;
    
    const content = `
        <div class="summary">
            <h3>ملخص السلف</h3>
            <div class="summary-grid">
                <div class="summary-item"><p>إجمالي السلف</p><strong>${formatCurrency(totalAmount)}</strong></div>
                <div class="summary-item"><p>إجمالي المسدد</p><strong>${formatCurrency(totalPaid)}</strong></div>
                <div class="summary-item"><p>إجمالي المتبقي</p><strong>${formatCurrency(totalRemaining)}</strong></div>
            </div>
        </div>
        <table>
            <thead><tr><th>التاريخ</th><th>الموظف</th><th>المبلغ</th><th>المسدد</th><th>المتبقي</th><th>الحالة</th></tr></thead>
            <tbody>
                ${advances.map(a => {
                    const remaining = a.amount - a.payment;
                    return `<tr>
                        <td>${formatDate(a.date)}</td>
                        <td>${getEmployeeName(a.employeeId)}</td>
                        <td>${formatCurrency(a.amount)}</td>
                        <td>${formatCurrency(a.payment)}</td>
                        <td>${formatCurrency(remaining)}</td>
                        <td><span class="badge ${remaining <= 0 ? 'badge-paid' : 'badge-pending'}">${remaining <= 0 ? 'مسددة' : 'متبقية'}</span></td>
                    </tr>`
                }).join('')}
                 <tr class="total-row">
                    <td colspan="2">الإجمالي</td>
                    <td>${formatCurrency(totalAmount)}</td>
                    <td>${formatCurrency(totalPaid)}</td>
                    <td>${formatCurrency(totalRemaining)}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>`;
    return generateReportHTML('تقرير السلف', '#f59e0b', content);
};

export const generateAttendanceReportContent = (appData: AppData) => {
    const { attendance, employees } = appData;
    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    const totalHours = attendance.reduce((s, a) => s + calculateHours(a.checkIn, a.checkOut), 0);

    const content = `
        <div class="summary"><h3>ملخص الحضور</h3><div class="summary-grid"><div class="summary-item"><p>إجمالي الساعات</p><strong>${totalHours.toFixed(2)} ساعة</strong></div></div></div>
        <table>
            <thead><tr><th>التاريخ</th><th>الموظف</th><th>الحضور</th><th>الانصراف</th><th>الساعات</th></tr></thead>
            <tbody>
                ${attendance.map(a => `<tr>
                    <td>${formatDate(a.date)}</td>
                    <td>${getEmployeeName(a.employeeId)}</td>
                    <td>${a.checkIn}</td>
                    <td>${a.checkOut}</td>
                    <td>${calculateHours(a.checkIn, a.checkOut).toFixed(2)}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    return generateReportHTML('تقرير الحضور', '#059669', content);
};

export const generatePayrollReportContent = (appData: AppData) => {
    const { payroll, employees } = appData;
    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    const totalDisbursed = payroll.reduce((s, p) => s + p.disbursed, 0);

    const content = `
        <div class="summary"><h3>ملخص المرتبات</h3><div class="summary-grid"><div class="summary-item"><p>إجمالي المصروف</p><strong>${formatCurrency(totalDisbursed)}</strong></div></div></div>
        <table>
            <thead><tr><th>التاريخ</th><th>الموظف</th><th>الراتب الأساسي</th><th>المصروف</th><th>المتبقي</th></tr></thead>
            <tbody>
                ${payroll.map(p => `<tr>
                    <td>${formatDate(p.date)}</td>
                    <td>${getEmployeeName(p.employeeId)}</td>
                    <td>${formatCurrency(p.basicSalary)}</td>
                    <td>${formatCurrency(p.disbursed)}</td>
                    <td>${formatCurrency(p.basicSalary - p.disbursed)}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    return generateReportHTML('تقرير المرتبات', '#6366f1', content);
};

export const generateExpensesReportContent = (appData: AppData) => {
    const { expenses } = appData;
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const content = `
        <div class="summary"><h3>ملخص المصاريف</h3><div class="summary-grid"><div class="summary-item"><p>إجمالي المصاريف</p><strong>${formatCurrency(totalAmount)}</strong></div></div></div>
        <table>
            <thead><tr><th>التاريخ</th><th>النوع</th><th>الاسم</th><th>المبلغ</th></tr></thead>
            <tbody>
                ${expenses.map(e => `<tr>
                    <td>${formatDate(e.date)}</td>
                    <td>${e.type}</td>
                    <td>${e.name}</td>
                    <td>${formatCurrency(e.amount)}</td>
                </tr>`).join('')}
                <tr class="total-row"><td colspan="3">الإجمالي</td><td>${formatCurrency(totalAmount)}</td></tr>
            </tbody>
        </table>`;
    return generateReportHTML('تقرير المصاريف', '#ef4444', content);
};

export const generateSuppliersReportContent = (appData: AppData) => {
    const { suppliers, payments } = appData;
    const getSupplierName = (id: number) => suppliers.find(s => s.id === id)?.name || 'غير معروف';
    const totalPayments = payments.reduce((s, p) => s + p.payment, 0);
    const totalInvoices = payments.reduce((s, p) => s + p.invoiceTotal, 0);
    
    const content = `
        <div class="summary"><h3>ملخص الموردين</h3><div class="summary-grid">
            <div class="summary-item"><p>إجمالي المدفوعات</p><strong>${formatCurrency(totalPayments)}</strong></div>
            <div class="summary-item"><p>إجمالي الفواتير</p><strong>${formatCurrency(totalInvoices)}</strong></div>
        </div></div>
        <h3>الدفعات</h3>
        <table>
            <thead><tr><th>التاريخ</th><th>المورد</th><th>الدفعة</th><th>الفاتورة</th></tr></thead>
            <tbody>
                ${payments.map(p => `<tr>
                    <td>${formatDate(p.date)}</td>
                    <td>${getSupplierName(p.supplierId)}</td>
                    <td>${formatCurrency(p.payment)}</td>
                    <td>${formatCurrency(p.invoiceTotal)}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    return generateReportHTML('تقرير الموردين', '#10b981', content);
};
