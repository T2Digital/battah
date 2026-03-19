

import { AppData, DailySale, Product } from '../types';
import { formatCurrency, formatDate, formatDateTime, calculateHours, normalizeSaleItems } from './utils';

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
    .sub-header {
        font-size: 18px;
        font-weight: bold;
        color: #1f2937;
        margin-top: 30px;
        margin-bottom: 15px;
        border-bottom: 1px solid #d1d5db;
        padding-bottom: 5px;
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

const generateReportHTML = (title: string, themeColor: string, content: string, isInvoice = false) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    ${getReportStyles(themeColor)}
    ${isInvoice ? `
    <style>
        @page { margin: 0; size: 80mm auto; }
        body { margin: 0; padding: 0; background: #fff; width: 80mm; font-family: 'Cairo', sans-serif; font-size: 12px; color: #000; }
        .invoice-box { width: 100%; max-width: 80mm; margin: 0 auto; padding: 5mm; box-sizing: border-box; }
        .invoice-box table { width: 100%; line-height: 1.2; text-align: right; border-collapse: collapse; }
        .invoice-box table td { padding: 2px 0; vertical-align: top; font-size: 12px; }
        .invoice-box table tr.top table td { padding-bottom: 5px; text-align: center; }
        .invoice-box table tr.top table td.title { font-size: 20px; line-height: 24px; color: #000; font-weight: bold; }
        .invoice-box table tr.information table td { padding-bottom: 10px; text-align: center; border-bottom: 1px dashed #000; }
        .invoice-box table tr.heading td { background: transparent; border-bottom: 1px dashed #000; font-weight: bold; padding: 5px 0; }
        .invoice-box table tr.details td { padding-bottom: 5px; }
        .invoice-box table tr.item td { border-bottom: 1px dotted #ccc; padding: 4px 0; }
        .invoice-box table tr.item.last td { border-bottom: 1px dashed #000; }
        .invoice-box table tr.total td { font-weight: bold; padding-top: 5px; font-size: 14px; }
        .invoice-box .text-center { text-align: center; }
        .invoice-box .text-left { text-align: left; }
        .invoice-box .mb-2 { margin-bottom: 5px; }
        .invoice-box .mt-4 { margin-top: 10px; }
        .invoice-box hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
        @media print {
            body { width: 80mm; }
            .invoice-box { padding: 0; }
            .no-print { display: none; }
        }
    </style>
    ` : ''}
</head>
<body>
    ${content}
    <script>
        setTimeout(() => window.print(), 500);
    </script>
</body>
</html>`;

export const generateInvoiceContent = (sale: DailySale, products: Product[]) => {
    const getProductName = (item: any) => item.productName || products.find(p => p.id === item.productId)?.name || 'صنف غير معروف';
    const items = normalizeSaleItems(sale);

    const itemsRows = items.map(item => {
        const serialsHtml = item.serialNumbers && item.serialNumbers.length > 0 
            ? `<div style="font-size: 10px; color: #666; margin-top: 2px;">S/N: ${item.serialNumbers.join(', ')}</div>` 
            : '';
        return `
        <tr class="item">
            <td>
                ${getProductName(item)}
                ${serialsHtml}
            </td>
            <td style="text-align:center;">${item.quantity}</td>
            <td style="text-align:center;">${formatCurrency(item.unitPrice)}</td>
            <td style="text-align:left;">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>
    `}).join('');

    const content = `
    <div class="invoice-box">
        <div class="text-center mb-2">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">بطاح الأصلي</h1>
            <p style="margin: 0; font-size: 12px;">لقطع غيار السيارات</p>
            <p style="margin: 0; font-size: 10px;">79 شارع رمسيس ناصية التوفيقية</p>
            <p style="margin: 0; font-size: 10px;">تليفون: 01080444447</p>
        </div>
        <hr>
        <div style="font-size: 12px; margin-bottom: 5px;">
            <div><strong>رقم الفاتورة:</strong> ${sale.invoiceNumber}</div>
            <div><strong>التاريخ والوقت:</strong> ${formatDateTime(sale.date, sale.timestamp)}</div>
            <div><strong>البائع:</strong> ${sale.sellerName}</div>
            ${sale.customerName ? `<div><strong>العميل:</strong> ${sale.customerName}</div>` : ''}
            ${sale.customerPhone ? `<div><strong>تليفون العميل:</strong> ${sale.customerPhone}</div>` : ''}
        </div>
        <hr>
        <table cellpadding="0" cellspacing="0">
            <tr class="heading">
                <td style="width: 40%;">الصنف</td>
                <td style="text-align:center; width: 15%;">الكمية</td>
                <td style="text-align:center; width: 20%;">السعر</td>
                <td style="text-align:left; width: 25%;">الإجمالي</td>
            </tr>
            ${itemsRows}
        </table>
        <hr>
        <table cellpadding="0" cellspacing="0">
            <tr class="total">
                <td colspan="3" style="text-align:right;">الإجمالي:</td>
                <td style="text-align:left;">${formatCurrency(sale.totalAmount)}</td>
            </tr>
            ${sale.discount ? `
            <tr>
                <td colspan="3" style="text-align:right; font-size: 10px;">خصم (${sale.discount}%):</td>
                <td style="text-align:left; font-size: 10px;">-${formatCurrency((sale.totalAmount / (1 - (sale.discount/100))) * (sale.discount/100))}</td>
            </tr>
            ` : ''}
            ${sale.paymentMethod ? `
            <tr>
                <td colspan="3" style="text-align:right; font-size: 10px;">طريقة الدفع:</td>
                <td style="text-align:left; font-size: 10px;">${sale.paymentMethod}</td>
            </tr>
            ` : ''}
            ${sale.cashAmount ? `
            <tr>
                <td colspan="3" style="text-align:right; font-size: 10px;">المدفوع نقداً:</td>
                <td style="text-align:left; font-size: 10px;">${formatCurrency(sale.cashAmount)}</td>
            </tr>
            ` : ''}
            ${sale.electronicAmount ? `
            <tr>
                <td colspan="3" style="text-align:right; font-size: 10px;">المدفوع إلكترونياً:</td>
                <td style="text-align:left; font-size: 10px;">${formatCurrency(sale.electronicAmount)}</td>
            </tr>
            ` : ''}
            ${sale.remainingDebt ? `
            <tr>
                <td colspan="3" style="text-align:right; font-size: 10px; font-weight: bold;">المتبقي (آجل):</td>
                <td style="text-align:left; font-size: 10px; font-weight: bold;">${formatCurrency(sale.remainingDebt)}</td>
            </tr>
            ` : ''}
        </table>
        ${sale.notes ? `
        <hr>
        <div style="font-size: 10px; text-align: center;">
            <strong>ملاحظات:</strong> ${sale.notes}
        </div>
        ` : ''}
        <hr>
        <div class="text-center mt-4" style="font-size: 10px;">
            <p style="margin: 0; font-weight: bold;">شكراً لتعاملكم معنا!</p>
            <div style="text-align: right; margin-top: 5px;">
                <strong>سياسة الاستبدال والاسترجاع:</strong>
                <ul style="margin: 2px 15px 0 0; padding: 0;">
                    <li>متاح خلال 14 يوم من تاريخ الشراء.</li>
                    <li>الأسبوع الأول: إمكانية استرجاع المبلغ نقداً.</li>
                    <li>الأسبوع الثاني: استبدال بمنتج آخر فقط.</li>
                    <li>لا يمكن الاستبدال أو الاسترجاع بدون أصل الفاتورة.</li>
                    <li>يشترط الحفاظ على حالة المنتج الأصلية (الكرتونة والمحتويات).</li>
                </ul>
            </div>
        </div>
    </div>
    `;
    return generateReportHTML(`فاتورة ${sale.invoiceNumber}`, '#3b82f6', content, true);
};

export const generateSalesReportContent = (appData: AppData) => {
    const { dailySales = [], products = [] } = appData;
    
    const salesByDate = dailySales.reduce((acc, sale) => {
        const date = sale.date;
        if (!acc[date]) {
            acc[date] = { revenue: 0, cost: 0 };
        }
        
        const items = normalizeSaleItems(sale);
        const saleCost = items.reduce((sum, item) => {
             const product = products.find(p => p.id === item.productId);
             return sum + (product ? product.purchasePrice * item.quantity : 0);
        }, 0);
        
        if (sale.direction === 'بيع') {
            acc[date].revenue += sale.totalAmount;
            acc[date].cost += saleCost;
        } else if (sale.direction === 'مرتجع') {
            acc[date].revenue -= sale.totalAmount;
            acc[date].cost -= saleCost;
        }
        return acc;
    }, {} as Record<string, { revenue: number, cost: number }>);

    const sortedDates = Object.keys(salesByDate).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
    
    let totalRevenue = 0;
    let totalCost = 0;

    const tableRows = sortedDates.map(date => {
        const { revenue, cost } = salesByDate[date];
        const profit = revenue - cost;
        totalRevenue += revenue;
        totalCost += cost;
        return `
            <tr>
                <td>${formatDate(date)}</td>
                <td>${formatCurrency(revenue)}</td>
                <td>${formatCurrency(cost)}</td>
                <td style="font-weight: bold; color: ${profit >= 0 ? '#10b981' : '#ef4444'};">${formatCurrency(profit)}</td>
            </tr>
        `;
    }).join('');

    const totalProfit = totalRevenue - totalCost;

    const content = `
        <div class="header">
            <h1>شركة بطاح الأصلي لقطع غيار السيارات</h1>
            <h2>تقرير المبيعات</h2>
            <p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p>
        </div>
        <div class="summary">
            <h3>ملخص شامل</h3>
            <div class="summary-grid">
                <div class="summary-item"><p>إجمالي المبيعات</p><strong>${formatCurrency(totalRevenue)}</strong></div>
                <div class="summary-item"><p>إجمالي التكلفة</p><strong>${formatCurrency(totalCost)}</strong></div>
                <div class="summary-item"><p>إجمالي صافي الربح</p><strong style="color: ${totalProfit >= 0 ? '#10b981' : '#ef4444'};">${formatCurrency(totalProfit)}</strong></div>
            </div>
        </div>
        <table>
            <thead><tr><th>التاريخ</th><th>إجمالي المبيعات</th><th>تكلفة البضاعة المباعة</th><th>صافي الربح</th></tr></thead>
            <tbody>
                ${tableRows}
                <tr class="total-row">
                    <td>الإجمالي</td>
                    <td>${formatCurrency(totalRevenue)}</td>
                    <td>${formatCurrency(totalCost)}</td>
                    <td>${formatCurrency(totalProfit)}</td>
                </tr>
            </tbody>
        </table>
        <div class="footer">
            <p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p>
        </div>
    `;
    return generateReportHTML('تقرير المبيعات', '#059669', content);
};


export const generateEmployeesReportContent = (appData: AppData) => {
    const { employees } = appData;
    const totalSalaries = employees.reduce((sum, emp) => sum + emp.basicSalary, 0);
    
    const content = `
        <div class="header">
            <h1>شركة بطاح الأصلي لقطع غيار السيارات</h1>
            <h2>تقرير الموظفين</h2>
            <p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p>
        </div>
        <div class="summary">
            <h3>ملخص الموظفين</h3>
            <div class="summary-grid">
                <div class="summary-item"><p>إجمالي الموظفين</p><strong>${employees.length}</strong></div>
                <div class="summary-item"><p>إجمالي الرواتب</p><strong>${formatCurrency(totalSalaries)}</strong></div>
            </div>
        </div>
        <table>
            <thead><tr><th>الاسم</th><th>المنصب</th><th>الراتب</th><th>تاريخ التوظيف والوقت</th><th>الهاتف</th></tr></thead>
            <tbody>
                ${employees.map(e => `
                    <tr>
                        <td>${e.name}</td>
                        <td>${e.position}</td>
                        <td>${formatCurrency(e.basicSalary)}</td>
                        <td dir="ltr">${formatDateTime(e.hireDate, e.timestamp)}</td>
                        <td>${e.phone || '-'}</td>
                    </tr>`).join('')}
                <tr class="total-row">
                    <td colspan="2">الإجمالي</td>
                    <td>${formatCurrency(totalSalaries)}</td>
                    <td colspan="2"></td>
                </tr>
            </tbody>
        </table>
        <div class="footer">
            <p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p>
        </div>
        `;
    return generateReportHTML('تقرير الموظفين', '#1e40af', content);
};

export const generateAdvancesReportContent = (appData: AppData) => {
    const { advances, employees } = appData;
    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    const totalAmount = advances.reduce((s, a) => s + a.amount, 0);
    const totalPaid = advances.reduce((s, a) => s + a.payment, 0);
    const totalRemaining = totalAmount - totalPaid;
    
    const content = `
        <div class="header"><h1>شركة بطاح الأصلي لقطع غيار السيارات</h1><h2>تقرير السلف</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
        <div class="summary">
            <h3>ملخص السلف</h3>
            <div class="summary-grid">
                <div class="summary-item"><p>إجمالي السلف</p><strong>${formatCurrency(totalAmount)}</strong></div>
                <div class="summary-item"><p>إجمالي المسدد</p><strong>${formatCurrency(totalPaid)}</strong></div>
                <div class="summary-item"><p>إجمالي المتبقي</p><strong>${formatCurrency(totalRemaining)}</strong></div>
            </div>
        </div>
        <table>
            <thead><tr><th>التاريخ والوقت</th><th>الموظف</th><th>المبلغ</th><th>المسدد</th><th>المتبقي</th><th>الحالة</th></tr></thead>
            <tbody>
                ${advances.map(a => {
                    const remaining = a.amount - a.payment;
                    return `<tr>
                        <td dir="ltr">${formatDateTime(a.date, a.timestamp)}</td>
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
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p></div>
        `;
    return generateReportHTML('تقرير السلف', '#f59e0b', content);
};

export const generateAttendanceReportContent = (appData: AppData) => {
    const { attendance, employees } = appData;
    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    const totalHours = attendance.reduce((s, a) => s + calculateHours(a.checkIn, a.checkOut), 0);

    const content = `
        <div class="header"><h1>شركة بطاح الأصلي لقطع غيار السيارات</h1><h2>تقرير الحضور</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
        <div class="summary"><h3>ملخص الحضور</h3><div class="summary-grid"><div class="summary-item"><p>إجمالي الساعات</p><strong>${totalHours.toFixed(2)} ساعة</strong></div></div></div>
        <table>
            <thead><tr><th>التاريخ والوقت</th><th>الموظف</th><th>الحاضر</th><th>الانصراف</th><th>الساعات</th></tr></thead>
            <tbody>
                ${attendance.map(a => `<tr>
                    <td dir="ltr">${formatDateTime(a.date, a.timestamp)}</td>
                    <td>${getEmployeeName(a.employeeId)}</td>
                    <td>${a.checkIn}</td>
                    <td>${a.checkOut}</td>
                    <td>${calculateHours(a.checkIn, a.checkOut).toFixed(2)}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p></div>
        `;
    return generateReportHTML('تقرير الحضور', '#059669', content);
};

export const generatePayrollReportContent = (appData: AppData) => {
    const { payroll, employees } = appData;
    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    const totalPayroll = payroll.reduce((sum, p) => sum + Math.max(0, p.basicSalary + (p.incentives || 0) - (p.expenseDeductions || 0)), 0);

    const content = `
        <div class="header"><h1>شركة بطاح الأصلي لقطع غيار السيارات</h1><h2>تقرير المرتبات</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
        <div class="summary"><h3>ملخص المرتبات</h3><div class="summary-grid"><div class="summary-item"><p>إجمالي التكلفة الفعلية</p><strong>${formatCurrency(totalPayroll)}</strong></div></div></div>
        <table>
            <thead><tr><th>التاريخ والوقت</th><th>الموظف</th><th>الراتب الأساسي</th><th>المنصرف</th><th>التكلفة الفعلية</th></tr></thead>
            <tbody>
                ${payroll.map(p => `<tr>
                    <td dir="ltr">${formatDateTime(p.date, p.timestamp)}</td>
                    <td>${getEmployeeName(p.employeeId)}</td>
                    <td>${formatCurrency(p.basicSalary)}</td>
                    <td>${formatCurrency(p.disbursed)}</td>
                    <td>${formatCurrency(Math.max(0, p.basicSalary + (p.incentives || 0) - (p.expenseDeductions || 0)))}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p></div>
        `;
    return generateReportHTML('تقرير المرتبات', '#6366f1', content);
};

export const generateExpensesReportContent = (appData: AppData) => {
    const { expenses } = appData;
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const content = `
        <div class="header"><h1>شركة بطاح الأصلي لقطع غيار السيارات</h1><h2>تقرير المصاريف</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
        <div class="summary"><h3>ملخص المصاريف</h3><div class="summary-grid"><div class="summary-item"><p>إجمالي المصاريف</p><strong>${formatCurrency(totalAmount)}</strong></div></div></div>
        <table>
            <thead><tr><th>التاريخ والوقت</th><th>النوع</th><th>الاسم</th><th>المبلغ</th></tr></thead>
            <tbody>
                ${expenses.map(e => `<tr>
                    <td dir="ltr">${formatDateTime(e.date, e.timestamp)}</td>
                    <td>${e.type}</td>
                    <td>${e.name}</td>
                    <td>${formatCurrency(e.amount)}</td>
                </tr>`).join('')}
                <tr class="total-row"><td colspan="3">الإجمالي</td><td>${formatCurrency(totalAmount)}</td></tr>
            </tbody>
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p></div>
        `;
    return generateReportHTML('تقرير المصاريف', '#ef4444', content);
};

export const generateSuppliersReportContent = (appData: AppData) => {
    const { suppliers, payments, purchaseOrders } = appData;
    const getSupplierName = (id: number) => suppliers.find(s => s.id === id)?.name || 'غير معروف';
    const totalPayments = payments.reduce((s, p) => s + p.payment, 0);
    const totalInvoices = purchaseOrders.filter(po => po.status === 'مكتمل').reduce((sum, po) => sum + (po.type === 'مرتجع' ? -po.totalAmount : po.totalAmount), 0);
    
    const content = `
        <div class="header"><h1>شركة بطاح الأصلي لقطع غيار السيارات</h1><h2>تقرير الموردين</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
        <div class="summary"><h3>ملخص الموردين</h3><div class="summary-grid">
            <div class="summary-item"><p>إجمالي المدفوعات</p><strong>${formatCurrency(totalPayments)}</strong></div>
            <div class="summary-item"><p>إجمالي الفواتير</p><strong>${formatCurrency(totalInvoices)}</strong></div>
        </div></div>
        <h3>الدفعات</h3>
        <table>
            <thead><tr><th>التاريخ والوقت</th><th>المورد</th><th>الدفعة</th><th>الفاتورة</th></tr></thead>
            <tbody>
                ${payments.map(p => `<tr>
                    <td dir="ltr">${formatDateTime(p.date, p.timestamp)}</td>
                    <td>${getSupplierName(p.supplierId)}</td>
                    <td>${formatCurrency(p.payment)}</td>
                    <td>${formatCurrency(p.invoiceTotal)}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p></div>
        `;
    return generateReportHTML('تقرير الموردين', '#10b981', content);
};

export const generateFilteredSalesReportContent = (sales: DailySale[], filterDate: string, filterPeriod: string) => {
    let periodText = 'يومي';
    if (filterPeriod === 'weekly') periodText = 'أسبوعي';
    if (filterPeriod === 'monthly') periodText = 'شهري';
    if (filterPeriod === 'yearly') periodText = 'سنوي';

    let html = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير المبيعات - ${periodText}</title>
            ${getReportStyles('#10b981')}
            <style>
                @media print {
                    .no-print { display: none; }
                    body { background-color: white; }
                    table { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align: left; margin-bottom: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">طباعة التقرير</button>
            </div>
            <div class="header">
                <h1>تقرير المبيعات المفلتر</h1>
                <h2>الفترة: ${periodText} (${filterDate})</h2>
                <p>تاريخ الطباعة: ${formatDate(new Date().toISOString())}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ والوقت</th>
                        <th>الفرع</th>
                        <th>البائع</th>
                        <th>النوع</th>
                        <th>المبلغ</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let total = 0;
    sales.forEach(sale => {
        if (sale.direction === 'بيع') total += sale.totalAmount;
        if (sale.direction === 'مرتجع') total -= sale.totalAmount;
        
        html += `
            <tr>
                <td>${sale.invoiceNumber}</td>
                <td dir="ltr">${formatDateTime(sale.date, sale.timestamp)}</td>
                <td>${sale.branchSoldFrom === 'main' ? 'الرئيسي' : sale.branchSoldFrom}</td>
                <td>${sale.sellerName}</td>
                <td>${sale.direction}</td>
                <td style="font-weight: bold; color: ${sale.direction === 'مرتجع' ? 'red' : 'green'};">${formatCurrency(sale.totalAmount)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            
            <div class="summary" style="margin-top: 30px; border-right-color: #10b981;">
                <h3>ملخص المبيعات</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <p>إجمالي العمليات</p>
                        <strong>${sales.length}</strong>
                    </div>
                    <div class="summary-item">
                        <p>صافي المبيعات</p>
                        <strong style="color: ${total >= 0 ? '#10b981' : '#ef4444'};">${formatCurrency(total)}</strong>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
    return html;
};

export const generateInventoryReportContent = (appData: AppData, branch: string) => {
    const branchName = branch === 'main' ? 'الرئيسي' : branch === 'branch1' ? 'فرع 1' : branch === 'branch2' ? 'فرع 2' : 'فرع 3';
    
    let html = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير جرد المخزون - ${branchName}</title>
            ${getReportStyles('#3b82f6')}
            <style>
                @media print {
                    .no-print { display: none; }
                    body { background-color: white; }
                    table { box-shadow: none; }
                }
                .empty-cell {
                    width: 100px;
                    border-bottom: 1px dotted #999;
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align: left; margin-bottom: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">طباعة التقرير</button>
            </div>
            <div class="header">
                <h1>تقرير جرد المخزون</h1>
                <h2>الفرع: ${branchName}</h2>
                <p>تاريخ الجرد: ${formatDate(new Date().toISOString())}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>كود الصنف</th>
                        <th>اسم الصنف</th>
                        <th>التصنيف</th>
                        <th>العدد على النظام</th>
                        <th>العدد الفعلي</th>
                        <th>ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Sort products by category then name
    const sortedProducts = [...appData.products].sort((a, b) => {
        if (a.mainCategory !== b.mainCategory) return a.mainCategory.localeCompare(b.mainCategory);
        return a.name.localeCompare(b.name);
    });

    sortedProducts.forEach(product => {
        const stock = product.stock[branch as keyof typeof product.stock] || 0;
        html += `
            <tr>
                <td>${product.sku}</td>
                <td>${product.name}</td>
                <td>${product.mainCategory}</td>
                <td style="font-weight: bold; text-align: center;">${stock}</td>
                <td class="empty-cell"></td>
                <td class="empty-cell" style="width: 150px;"></td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            
            <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                <div>توقيع أمين المخزن: ___________________</div>
                <div>توقيع المراجع: ___________________</div>
            </div>
        </body>
        </html>
    `;
    return html;
};

export const generateProductCardexReportContent = (appData: AppData, productId: number, startDate?: string, endDate?: string) => {
    const { dailySales, products, purchaseOrders, stockTransfers } = appData;
    const product = products.find(p => p.id === productId);
    if (!product) return generateReportHTML('خطأ', '#ef4444', 'لم يتم العثور على المنتج');
    
    let allMovements: any[] = [];

    // 1. Sales & Returns
    dailySales.forEach(sale => {
        normalizeSaleItems(sale).forEach(item => {
            if (item.productId === productId) {
                const isReturn = sale.direction === 'مرتجع' || item.isReturn;
                allMovements.push({
                    date: sale.date,
                    timestamp: sale.timestamp,
                    type: isReturn ? 'مرتجع مبيعات' : 'مبيعات',
                    invoiceNumber: sale.invoiceNumber,
                    branch: sale.branchSoldFrom,
                    quantityChange: isReturn ? item.quantity : -item.quantity,
                    notes: sale.notes || '',
                    price: item.unitPrice
                });
            }
        });
    });

    // 2. Purchases & Returns
    purchaseOrders.forEach(po => {
        if (po.status === 'مكتمل') {
            po.items.forEach(item => {
                if (item.productId === productId) {
                    const isReturn = po.type === 'مرتجع';
                    allMovements.push({
                        date: po.orderDate,
                        timestamp: po.timestamp,
                        type: isReturn ? 'مرتجع مشتريات' : 'مشتريات',
                        invoiceNumber: `PO-${po.id}`,
                        branch: 'main', // Assuming purchases go to main branch initially
                        quantityChange: isReturn ? -item.quantity : item.quantity,
                        notes: po.notes || '',
                        price: item.purchasePrice
                    });
                }
            });
        }
    });

    // 3. Stock Transfers
    stockTransfers.forEach(transfer => {
        if (transfer.productId === productId) {
            // Outgoing
            allMovements.push({
                date: transfer.date,
                timestamp: transfer.timestamp,
                type: 'نقل مخزون (صادر)',
                invoiceNumber: `TR-${transfer.id}`,
                branch: transfer.fromBranch,
                quantityChange: -transfer.quantity,
                notes: `إلى ${transfer.toBranch} - ${transfer.notes || ''}`,
                price: 0
            });
            // Incoming
            allMovements.push({
                date: transfer.date,
                timestamp: transfer.timestamp,
                type: 'نقل مخزون (وارد)',
                invoiceNumber: `TR-${transfer.id}`,
                branch: transfer.toBranch,
                quantityChange: transfer.quantity,
                notes: `من ${transfer.fromBranch} - ${transfer.notes || ''}`,
                price: 0
            });
        }
    });

    // Sort all movements by date and timestamp
    allMovements.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.date).getTime();
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.date).getTime();
        return timeA - timeB;
    });

    // Calculate running balance and filter by date
    let runningBalance = 0; // Ideally, we'd have an initial stock value, but we'll calculate from 0 or assume current stock is the end result.
    // Actually, it's better to calculate backwards from current stock to get the initial stock before the first movement.
    const totalStock = product.stock.main + product.stock.branch1 + product.stock.branch2 + product.stock.branch3;
    
    let netChange = 0;
    allMovements.forEach(m => {
        netChange += m.quantityChange;
    });
    
    // Initial stock before any recorded movement
    let currentBalance = totalStock - netChange;
    
    let filteredMovements: any[] = [];
    let openingBalanceForPeriod = currentBalance;

    allMovements.forEach(m => {
        const mDate = new Date(m.date);
        const isAfterStart = !startDate || mDate >= new Date(startDate);
        const isBeforeEnd = !endDate || mDate <= new Date(endDate);
        
        if (!startDate || mDate < new Date(startDate)) {
            openingBalanceForPeriod += m.quantityChange;
        }

        currentBalance += m.quantityChange;
        m.runningBalance = currentBalance;

        if (isAfterStart && isBeforeEnd) {
            filteredMovements.push(m);
        }
    });

    const dateRangeText = startDate && endDate ? `من ${formatDate(startDate)} إلى ${formatDate(endDate)}` : (startDate ? `من ${formatDate(startDate)}` : (endDate ? `حتى ${formatDate(endDate)}` : 'كل الأوقات'));

    const content = `
        <div class="header">
            <h1>شركة بطاح الأصلي لقطع غيار السيارات</h1>
            <h2>تقرير حركة صنف (كارت الصنف)</h2>
            <p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p>
            <p>الفترة: ${dateRangeText}</p>
        </div>
        <div class="summary">
            <h3>بيانات الصنف</h3>
            <div class="summary-grid">
                <div class="summary-item" style="grid-column: span 2;"><p>اسم الصنف</p><strong>${product.name}</strong></div>
                <div class="summary-item"><p>الكود (SKU)</p><strong>${product.sku}</strong></div>
                <div class="summary-item"><p>سعر البيع</p><strong>${formatCurrency(product.sellingPrice)}</strong></div>
                <div class="summary-item"><p>المخزون الفعلي الحالي</p><strong class="text-blue-600">${totalStock}</strong></div>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>التاريخ والوقت</th>
                    <th>رقم المرجع</th>
                    <th>نوع الحركة</th>
                    <th>الفرع</th>
                    <th>الكمية</th>
                    <th>الرصيد التراكمي</th>
                    <th>ملاحظات</th>
                </tr>
            </thead>
            <tbody>
                <tr class="bg-gray-100 font-bold">
                    <td colspan="5" style="text-align: right;">رصيد بداية المدة</td>
                    <td class="text-blue-600">${openingBalanceForPeriod}</td>
                    <td></td>
                </tr>
                ${filteredMovements.length > 0 ? filteredMovements.map(m => {
                    const quantityChangeStr = m.quantityChange > 0 ? `+${m.quantityChange}` : `${m.quantityChange}`;
                    const rowClass = m.quantityChange > 0 ? 'text-green-600' : 'text-red-600';
                    return `<tr>
                        <td dir="ltr">${formatDateTime(m.date, m.timestamp)}</td>
                        <td>${m.invoiceNumber}</td>
                        <td>${m.type}</td>
                        <td>${m.branch}</td>
                        <td class="${rowClass} font-bold" dir="ltr">${quantityChangeStr}</td>
                        <td class="font-bold">${m.runningBalance}</td>
                        <td>${m.notes || '-'}</td>
                    </tr>`
                }).join('') : `<tr><td colspan="7" style="text-align: center; padding: 20px;">لا توجد حركات مسجلة لهذا الصنف في هذه الفترة.</td></tr>`}
                <tr class="bg-gray-100 font-bold">
                    <td colspan="5" style="text-align: right;">رصيد نهاية المدة</td>
                    <td class="text-blue-600">${filteredMovements.length > 0 ? filteredMovements[filteredMovements.length - 1].runningBalance : openingBalanceForPeriod}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p></div>
    `;
    return generateReportHTML(`كارت الصنف - ${product.name}`, '#1e40af', content);
};

export const generateReorderPointReportContent = (appData: AppData) => {
    const { products } = appData;
    const lowStockProducts = products.filter(p => {
        const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
        return totalStock <= (p.reorderPoint || 0);
    });

    const content = `
        <div class="header"><h1>شركة بطاح الأصلي لقطع غيار السيارات</h1><h2>تقرير حد الطلب</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
        <table>
            <thead><tr><th>الصنف</th><th>الكود</th><th>الرصيد الحالي</th><th>حد الطلب</th></tr></thead>
            <tbody>
                ${lowStockProducts.length > 0 ? lowStockProducts.map(p => {
                    const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
                    return `<tr>
                        <td>${p.name}</td>
                        <td>${p.sku}</td>
                        <td class="font-bold text-red-600">${totalStock}</td>
                        <td>${p.reorderPoint}</td>
                    </tr>`
                }).join('') : `<tr><td colspan="4" style="text-align: center; padding: 20px;">لا توجد أصناف وصلت إلى حد الطلب.</td></tr>`}
            </tbody>
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p></div>
    `;
    return generateReportHTML('تقرير حد الطلب', '#f59e0b', content);
};


export const generateSalesAnalysisReportContent = (appData: AppData) => {
    const { dailySales, products } = appData;
    const salesData = new Map<number, { name: string; sku: string; quantity: number; value: number }>();

    dailySales.forEach(sale => {
        normalizeSaleItems(sale).forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return;

            const currentData = salesData.get(item.productId) || { name: product.name, sku: product.sku, quantity: 0, value: 0 };
            const change = sale.direction === 'مرتجع' ? -1 : 1;
            currentData.quantity += item.quantity * change;
            currentData.value += (item.unitPrice * item.quantity) * change;
            salesData.set(item.productId, currentData);
        });
    });

    const sortedSales = Array.from(salesData.values()).sort((a,b) => b.quantity - a.quantity);
    const bestSellers = sortedSales.slice(0, 10);
    const worstSellers = sortedSales.filter(p => p.quantity <= 0).slice(0, 10);

    const content = `
        <div class="header"><h1>شركة بطاح الأصلي لقطع غيار السيارات</h1><h2>تقرير تحليل المبيعات</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
        
        <div class="sub-header">الأصناف الأكثر مبيعاً (حسب الكمية)</div>
        <table>
            <thead><tr><th>#</th><th>الصنف</th><th>الكود</th><th>الكمية المباعة</th><th>قيمة المبيعات</th></tr></thead>
            <tbody>
                ${bestSellers.map((p, i) => `<tr>
                    <td>${i + 1}</td>
                    <td>${p.name}</td>
                    <td>${p.sku}</td>
                    <td class="font-bold text-green-600">${p.quantity}</td>
                    <td>${formatCurrency(p.value)}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        
        <div class="sub-header">الأصناف الأقل مبيعاً / الراكدة</div>
        <table>
            <thead><tr><th>الصنف</th><th>الكود</th><th>الكمية المباعة</th><th>قيمة المبيعات</th></tr></thead>
            <tbody>
                ${worstSellers.length > 0 ? worstSellers.map(p => `<tr>
                    <td>${p.name}</td>
                    <td>${p.sku}</td>
                    <td class="font-bold text-red-600">${p.quantity}</td>
                    <td>${formatCurrency(p.value)}</td>
                </tr>`).join('') : `<tr><td colspan="4" style="text-align: center; padding: 20px;">لا توجد أصناف راكدة.</td></tr>`}
            </tbody>
        </table>

        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p></div>
    `;
    return generateReportHTML('تحليل المبيعات', '#059669', content);
};

export const generateFinancialClosingReportContent = (appData: AppData, startDate: string, endDate: string) => {
    const { dailySales, expenses, payroll, products } = appData;

    // Filter data by date range
    const filteredSales = dailySales.filter(s => s.date >= startDate && s.date <= endDate);
    const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
    const filteredPayroll = payroll.filter(p => p.date >= startDate && p.date <= endDate);

    // Calculate Sales and COGS
    let totalSalesRevenue = 0;
    let totalSalesReturns = 0;
    let totalCOGS = 0;
    let totalReturnsCOGS = 0;

    filteredSales.forEach(sale => {
        const items = normalizeSaleItems(sale);
        
        if (sale.direction === 'بيع') {
            totalSalesRevenue += sale.totalAmount;
            items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    totalCOGS += (product.purchasePrice * item.quantity);
                }
            });
        } else if (sale.direction === 'مرتجع') {
            totalSalesReturns += Math.abs(sale.totalAmount);
            items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    totalReturnsCOGS += (product.purchasePrice * item.quantity);
                }
            });
        } else if (sale.direction === 'تبديل') {
            items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const itemTotal = item.quantity * item.unitPrice;
                const itemDiscountedTotal = itemTotal - (itemTotal * (sale.discount || 0) / 100);
                
                if (item.isReturn) {
                    totalSalesReturns += itemDiscountedTotal;
                    if (product) {
                        totalReturnsCOGS += (product.purchasePrice * item.quantity);
                    }
                } else {
                    totalSalesRevenue += itemDiscountedTotal;
                    if (product) {
                        totalCOGS += (product.purchasePrice * item.quantity);
                    }
                }
            });
        }
    });

    const netSales = totalSalesRevenue - totalSalesReturns;
    const netCOGS = totalCOGS - totalReturnsCOGS;
    const grossProfit = netSales - netCOGS;

    // Calculate Expenses
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate Payroll
    const totalPayroll = filteredPayroll.reduce((sum, p) => sum + Math.max(0, p.basicSalary + (p.incentives || 0) - (p.expenseDeductions || 0)), 0);

    // Calculate Net Profit
    const netProfit = grossProfit - totalExpenses - totalPayroll;

    const content = `
        ${getReportStyles('#4f46e5')}
        <div class="header">
            <h1>تقرير تقفيل الحسابات (قائمة الدخل)</h1>
            <h2>الفترة من: ${formatDate(startDate)} إلى: ${formatDate(endDate)}</h2>
        </div>

        <div class="summary">
            <h3>ملخص الأرباح والخسائر</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <p>إجمالي المبيعات</p>
                    <strong>${formatCurrency(totalSalesRevenue)}</strong>
                </div>
                <div class="summary-item">
                    <p>إجمالي المرتجعات</p>
                    <strong>${formatCurrency(totalSalesReturns)}</strong>
                </div>
                <div class="summary-item">
                    <p>صافي المبيعات</p>
                    <strong>${formatCurrency(netSales)}</strong>
                </div>
                <div class="summary-item">
                    <p>تكلفة البضاعة المباعة</p>
                    <strong>${formatCurrency(netCOGS)}</strong>
                </div>
                <div class="summary-item" style="background-color: #f0fdf4; border-color: #22c55e;">
                    <p style="color: #166534; font-weight: bold;">مجمل الربح</p>
                    <strong style="color: #15803d;">${formatCurrency(grossProfit)}</strong>
                </div>
                <div class="summary-item">
                    <p>إجمالي المصروفات</p>
                    <strong>${formatCurrency(totalExpenses)}</strong>
                </div>
                <div class="summary-item">
                    <p>إجمالي تكلفة المرتبات</p>
                    <strong>${formatCurrency(totalPayroll)}</strong>
                </div>
                <div class="summary-item" style="background-color: ${netProfit >= 0 ? '#dcfce7' : '#fee2e2'}; border-color: ${netProfit >= 0 ? '#22c55e' : '#ef4444'};">
                    <p style="color: ${netProfit >= 0 ? '#166534' : '#991b1b'}; font-weight: bold;">صافي الربح / الخسارة</p>
                    <strong style="color: ${netProfit >= 0 ? '#15803d' : '#b91c1c'}; font-size: 24px;">${formatCurrency(netProfit)}</strong>
                </div>
            </div>
        </div>

        <div class="sub-header">تفاصيل المصروفات</div>
        <table>
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>البيان</th>
                    <th>المبلغ</th>
                </tr>
            </thead>
            <tbody>
                ${filteredExpenses.length > 0 ? filteredExpenses.map(e => `
                    <tr>
                        <td dir="ltr">${formatDate(e.date)}</td>
                        <td>${e.type}</td>
                        <td>${e.name}</td>
                        <td>${formatCurrency(e.amount)}</td>
                    </tr>
                `).join('') : '<tr><td colspan="4" style="text-align: center;">لا توجد مصروفات في هذه الفترة</td></tr>'}
            </tbody>
        </table>

        <div class="sub-header">تفاصيل المرتبات المنصرفة</div>
        <table>
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>الموظف</th>
                    <th>الراتب الأساسي</th>
                    <th>المبلغ المنصرف</th>
                </tr>
            </thead>
            <tbody>
                ${filteredPayroll.length > 0 ? filteredPayroll.map(p => {
                    const emp = appData.employees.find(e => e.id === p.employeeId);
                    return `
                    <tr>
                        <td dir="ltr">${formatDate(p.date)}</td>
                        <td>${emp ? emp.name : 'غير معروف'}</td>
                        <td>${formatCurrency(p.basicSalary)}</td>
                        <td>${formatCurrency(p.disbursed)}</td>
                    </tr>
                `}).join('') : '<tr><td colspan="4" style="text-align: center;">لا توجد مرتبات منصرفة في هذه الفترة</td></tr>'}
            </tbody>
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح الأصلي المتكامل</p></div>
    `;

    return generateReportHTML('تقرير تقفيل الحسابات', '#4f46e5', content);
};