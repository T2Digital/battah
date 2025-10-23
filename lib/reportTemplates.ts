

import { AppData, DailySale, Product } from '../types';
import { formatCurrency, formatDate, calculateHours, normalizeSaleItems } from './utils';

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
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); font-size: 16px; line-height: 24px; font-family: 'Cairo', sans-serif; color: #555; }
        .invoice-box table { width: 100%; line-height: inherit; text-align: right; }
        .invoice-box table td { padding: 5px; vertical-align: top; }
        .invoice-box table tr.top table td { padding-bottom: 20px; }
        .invoice-box table tr.top table td.title { font-size: 45px; line-height: 45px; color: #333; }
        .invoice-box table tr.information table td { padding-bottom: 40px; }
        .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
        .invoice-box table tr.details td { padding-bottom: 20px; }
        .invoice-box table tr.item td{ border-bottom: 1px solid #eee; }
        .invoice-box table tr.item.last td { border-bottom: none; }
        .invoice-box table tr.total td:nth-child(2) { border-top: 2px solid #eee; font-weight: bold; }
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
    const getProductName = (productId: number) => products.find(p => p.id === productId)?.name || 'صنف غير معروف';
    const items = normalizeSaleItems(sale);

    const itemsRows = items.map(item => `
        <tr class="item">
            <td>${getProductName(item.productId)}</td>
            <td style="text-align:center;">${item.quantity}</td>
            <td style="text-align:center;">${formatCurrency(item.unitPrice)}</td>
            <td style="text-align:left;">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>
    `).join('');

    const content = `
    <div class="invoice-box">
        <table cellpadding="0" cellspacing="0">
            <tr class="top">
                <td colspan="4">
                    <table>
                        <tr>
                            <td class="title">
                                <h1>بطاح</h1>
                            </td>
                            <td>
                                فاتورة رقم: ${sale.invoiceNumber}<br>
                                تاريخ: ${formatDate(sale.date)}<br>
                                البائع: ${sale.sellerName}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr class="information">
                <td colspan="4">
                    <table>
                        <tr>
                            <td>
                                شركة بطاح لقطع غيار السيارات<br>
                                شارع الجلاء، وسط البلد<br>
                                القاهرة، مصر
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr class="heading">
                <td>الصنف</td>
                <td style="text-align:center;">الكمية</td>
                <td style="text-align:center;">سعر الوحدة</td>
                <td style="text-align:left;">الإجمالي</td>
            </tr>
            ${itemsRows}
            <tr class="total">
                <td colspan="3" style="text-align:left; font-weight:bold;">الإجمالي</td>
                <td style="text-align:left; font-weight:bold;">${formatCurrency(sale.totalAmount)}</td>
            </tr>
        </table>
        <div class="footer" style="margin-top: 50px;">شكراً لتعاملكم معنا!</div>
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
            <h1>شركة بطاح لقطع غيار السيارات</h1>
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
            <p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p>
        </div>
    `;
    return generateReportHTML('تقرير المبيعات', '#059669', content);
};


export const generateEmployeesReportContent = (appData: AppData) => {
    const { employees } = appData;
    const totalSalaries = employees.reduce((sum, emp) => sum + emp.basicSalary, 0);
    
    const content = `
        <div class="header">
            <h1>شركة بطاح لقطع غيار السيارات</h1>
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
        </table>
        <div class="footer">
            <p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p>
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
        <div class="header"><h1>شركة بطاح لقطع غيار السيارات</h1><h2>تقرير السلف</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
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
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p></div>
        `;
    return generateReportHTML('تقرير السلف', '#f59e0b', content);
};

export const generateAttendanceReportContent = (appData: AppData) => {
    const { attendance, employees } = appData;
    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    const totalHours = attendance.reduce((s, a) => s + calculateHours(a.checkIn, a.checkOut), 0);

    const content = `
        <div class="header"><h1>شركة بطاح لقطع غيار السيارات</h1><h2>تقرير الحضور</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
        <div class="summary"><h3>ملخص الحضور</h3><div class="summary-grid"><div class="summary-item"><p>إجمالي الساعات</p><strong>${totalHours.toFixed(2)} ساعة</strong></div></div></div>
        <table>
            <thead><tr><th>التاريخ</th><th>الموظف</th><th>الحاضر</th><th>الانصراف</th><th>الساعات</th></tr></thead>
            <tbody>
                ${attendance.map(a => `<tr>
                    <td>${formatDate(a.date)}</td>
                    <td>${getEmployeeName(a.employeeId)}</td>
                    <td>${a.checkIn}</td>
                    <td>${a.checkOut}</td>
                    <td>${calculateHours(a.checkIn, a.checkOut).toFixed(2)}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p></div>
        `;
    return generateReportHTML('تقرير الحضور', '#059669', content);
};

export const generatePayrollReportContent = (appData: AppData) => {
    const { payroll, employees } = appData;
    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';
    const totalDisbursed = payroll.reduce((s, p) => s + p.disbursed, 0);

    const content = `
        <div class="header"><h1>شركة بطاح لقطع غيار السيارات</h1><h2>تقرير المرتبات</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
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
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p></div>
        `;
    return generateReportHTML('تقرير المرتبات', '#6366f1', content);
};

export const generateExpensesReportContent = (appData: AppData) => {
    const { expenses } = appData;
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const content = `
        <div class="header"><h1>شركة بطاح لقطع غيار السيارات</h1><h2>تقرير المصاريف</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
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
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p></div>
        `;
    return generateReportHTML('تقرير المصاريف', '#ef4444', content);
};

export const generateSuppliersReportContent = (appData: AppData) => {
    const { suppliers, payments } = appData;
    const getSupplierName = (id: number) => suppliers.find(s => s.id === id)?.name || 'غير معروف';
    const totalPayments = payments.reduce((s, p) => s + p.payment, 0);
    const totalInvoices = payments.reduce((s, p) => s + p.invoiceTotal, 0);
    
    const content = `
        <div class="header"><h1>شركة بطاح لقطع غيار السيارات</h1><h2>تقرير الموردين</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
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
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p></div>
        `;
    return generateReportHTML('تقرير الموردين', '#10b981', content);
};

export const generateProductCardexReportContent = (appData: AppData, productId: number) => {
    const { dailySales, products } = appData;
    const product = products.find(p => p.id === productId);
    if (!product) return generateReportHTML('خطأ', '#ef4444', 'لم يتم العثور على المنتج');
    
    const movements = dailySales
        .flatMap(sale => normalizeSaleItems(sale).map(item => ({ ...item, ...sale })))
        .filter(movement => movement.productId === productId)
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
    const content = `
        <div class="header">
            <h1>شركة بطاح لقطع غيار السيارات</h1>
            <h2>تقرير حركة صنف (كارت الصنف)</h2>
            <p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p>
        </div>
        <div class="summary">
            <h3>بيانات الصنف</h3>
            <div class="summary-grid">
                <div class="summary-item" style="grid-column: span 2;"><p>اسم الصنف</p><strong>${product.name}</strong></div>
                <div class="summary-item"><p>الكود (SKU)</p><strong>${product.sku}</strong></div>
                <div class="summary-item"><p>سعر البيع</p><strong>${formatCurrency(product.sellingPrice)}</strong></div>
            </div>
        </div>
        <table>
            <thead><tr><th>التاريخ</th><th>رقم الفاتورة</th><th>نوع الحركة</th><th>الفرع</th><th>الكمية</th><th>ملاحظات</th></tr></thead>
            <tbody>
                ${movements.length > 0 ? movements.map(m => {
                    const quantityChange = m.direction === 'مرتجع' ? `+${m.quantity}` : `-${m.quantity}`;
                    const rowClass = m.direction === 'مرتجع' ? 'text-green-600' : 'text-red-600';
                    return `<tr>
                        <td>${formatDate(m.date)}</td>
                        <td>${m.invoiceNumber}</td>
                        <td>${m.direction}</td>
                        <td>${m.branchSoldFrom}</td>
                        <td class="${rowClass} font-bold">${quantityChange}</td>
                        <td>${m.notes || '-'}</td>
                    </tr>`
                }).join('') : `<tr><td colspan="6" style="text-align: center; padding: 20px;">لا توجد حركات مسجلة لهذا الصنف.</td></tr>`}
            </tbody>
        </table>
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p></div>
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
        <div class="header"><h1>شركة بطاح لقطع غيار السيارات</h1><h2>تقرير حد الطلب</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
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
        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p></div>
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
        <div class="header"><h1>شركة بطاح لقطع غيار السيارات</h1><h2>تقرير تحليل المبيعات</h2><p>تاريخ التقرير: ${formatDate(new Date().toISOString())}</p></div>
        
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

        <div class="footer"><p>تم إنشاء هذا التقرير بواسطة نظام إدارة شركة بطاح المتكامل</p></div>
    `;
    return generateReportHTML('تحليل المبيعات', '#059669', content);
};