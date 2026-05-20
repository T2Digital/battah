
import React, { useMemo, useState } from 'react';
import useStore from '../../lib/store';
import { Order, DailySale } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import Modal from '../shared/Modal';

interface Customer {
    phone: string;
    name: string;
    address: string;
    orderCount: number;
    totalSpent: number;
    totalDebt: number;
    lastOrderDate: string;
    orders: Order[];
    sales: DailySale[];
}

const CustomerDetails: React.FC<{
    customer: Customer;
    onBack: () => void;
    treasury: any[];
}> = ({ customer, onBack, treasury }) => {
    const { updateDailySale, addTreasuryTransaction } = useStore();
    const [payingSaleId, setPayingSaleId] = useState<number | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number | ''>('');

    // Extract receipts from Treasury
    const customerPayments = useMemo(() => {
        return treasury.filter(t => 
            t.description?.includes(customer.name) && 
            t.amountIn > 0
        ).sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
        });
    }, [treasury, customer.name]);

    const handlePaymentSubmit = async (sale: DailySale) => {
        const amount = Number(paymentAmount);
        if (amount <= 0 || amount > (sale.remainingDebt || 0)) {
            alert('المبلغ غير صحيح');
            return;
        }

        try {
            const newPaid = (sale.paidAmount || 0) + amount;
            const newRemaining = (sale.remainingDebt || 0) - amount;

            await updateDailySale(sale.id, {
                paidAmount: newPaid,
                remainingDebt: newRemaining
            });

            await addTreasuryTransaction({
                date: new Date().toISOString().split('T')[0],
                type: 'إيراد مبيعات',
                amountIn: amount,
                amountOut: 0,
                description: `تسديد مديونية فاتورة رقم ${sale.invoiceNumber} للعميل ${customer.name}`,
            });

            setPayingSaleId(null);
            setPaymentAmount('');
            alert('تم تسجيل الدفعة بنجاح');
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('حدث خطأ أثناء تسجيل الدفعة');
        }
    };

    const totalSpent = customer.totalSpent;
    const totalDebt = customer.totalDebt;
    const totalPaid = totalSpent - totalDebt;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-2">
                    <i className="fas fa-arrow-right"></i> عودة للعملاء
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">كشف حساب العميل: {customer.name}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">إجمالي المشتريات</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalSpent)}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">إجمالي السداد</div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">المديونية المتبقية</div>
                    <div className={`text-2xl font-bold ${totalDebt > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                        {formatCurrency(totalDebt)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Outgoing sales/orders */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700 font-bold bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white">الفواتير والمبيعات للعميل</div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">المستند</th>
                                    <th className="px-4 py-3">التاريخ</th>
                                    <th className="px-4 py-3">الإجمالي</th>
                                    <th className="px-4 py-3">المديونية</th>
                                    <th className="px-4 py-3">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customer.sales.length === 0 && customer.orders.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-4 text-center">لا توجد فواتير أو مسحوبات للعميل.</td></tr>
                                ) : (
                                    <>
                                        {customer.sales.map(sale => (
                                            <tr key={sale.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">فاتورة #{sale.invoiceNumber}</td>
                                                <td className="px-4 py-3 whitespace-nowrap" dir="ltr">{formatDateTime(sale.date, sale.timestamp)}</td>
                                                <td className="px-4 py-3 font-medium">{formatCurrency(sale.totalAmount)}</td>
                                                <td className={`px-4 py-3 font-semibold ${sale.remainingDebt && sale.remainingDebt > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                                    {sale.remainingDebt && sale.remainingDebt > 0 ? formatCurrency(sale.remainingDebt) : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {sale.remainingDebt && sale.remainingDebt > 0 ? (
                                                        payingSaleId === sale.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input 
                                                                    type="number" 
                                                                    value={paymentAmount}
                                                                    onChange={e => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                                                                    placeholder="أدخل مبلغ الدفعة"
                                                                    className="p-1 border rounded text-xs w-24 dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                                                                    max={sale.remainingDebt}
                                                                />
                                                                <button 
                                                                    onClick={() => handlePaymentSubmit(sale)}
                                                                    className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 font-bold"
                                                                >
                                                                    حفظ
                                                                </button>
                                                                <button 
                                                                    onClick={() => { setPayingSaleId(null); setPaymentAmount(''); }}
                                                                    className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-400"
                                                                >
                                                                    إلغاء
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => { setPayingSaleId(sale.id); setPaymentAmount(sale.remainingDebt || 0); }}
                                                                className="bg-primary text-white px-3 py-1 rounded text-xs hover:bg-primary-dark font-medium transition"
                                                            >
                                                                سداد دفعة
                                                            </button>
                                                        )
                                                    ) : (
                                                        <span className="text-green-500 text-xs font-bold">مدفوعة بالكامل</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {customer.orders.map(order => (
                                            <tr key={order.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <td className="px-4 py-3 text-blue-500 font-semibold text-right">طلب أونلاين #{order.id}</td>
                                                <td className="px-4 py-3 whitespace-nowrap" dir="ltr">{formatDateTime(order.date, order.timestamp)}</td>
                                                <td className="px-4 py-3 font-medium">{formatCurrency(order.totalAmount)}</td>
                                                <td className="px-4 py-3 text-gray-500">-</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-gray-400 text-xs">-</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Received payments */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700 font-bold bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white">المدفوعات والمتحصلات من العميل</div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">التاريخ والوقت</th>
                                    <th className="px-4 py-3">المبلغ المورد</th>
                                    <th className="px-4 py-3">البيان</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerPayments.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-4 text-center">لا توجد سجلات دفعات مسجلة</td></tr>
                                ) : (
                                    customerPayments.map(p => (
                                        <tr key={p.id} className="border-b dark:border-gray-700">
                                            <td className="px-4 py-3 whitespace-nowrap" dir="ltr">{formatDateTime(p.date, p.timestamp)}</td>
                                            <td className="px-4 py-3 text-green-600 font-bold">{formatCurrency(p.amountIn)}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{p.description}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


const Customers: React.FC = () => {
    const { orders, dailySales, treasury } = useStore(state => ({
        orders: state.appData?.orders || [],
        dailySales: state.appData?.dailySales || [],
        treasury: state.appData?.treasury || []
    }));
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showOnlyDebtors, setShowOnlyDebtors] = useState(false);

    const allCustomers = useMemo(() => {
        const customerMap = new Map<string, Customer>();
        
        // Process Orders
        orders.forEach(order => {
            const key = `${order.customerName || 'عميل غير معروف'}-${order.customerPhone || ''}`;
            if (key === 'عميل غير معروف-') return;
            
            const existing = customerMap.get(key);
            if (existing) {
                existing.orderCount++;
                existing.totalSpent += order.totalAmount;
                if (new Date(order.date) > new Date(existing.lastOrderDate)) {
                    existing.lastOrderDate = order.date;
                    existing.name = order.customerName || existing.name; // Update to latest name/address
                    existing.address = order.customerAddress || existing.address;
                    existing.phone = order.customerPhone || existing.phone;
                }
                existing.orders.push(order);
            } else {
                customerMap.set(key, {
                    phone: order.customerPhone || '',
                    name: order.customerName || 'عميل غير معروف',
                    address: order.customerAddress || '',
                    orderCount: 1,
                    totalSpent: order.totalAmount,
                    totalDebt: 0,
                    lastOrderDate: order.date,
                    orders: [order],
                    sales: []
                });
            }
        });

        // Process Daily Sales for Debts and History
        dailySales.forEach(sale => {
            const key = `${sale.customerName || 'عميل غير معروف'}-${sale.customerPhone || ''}`;
            if (key === 'عميل غير معروف-' && !sale.remainingDebt) return; // Only process 'Unknown' if they have debt, else skip to avoid noise. Actually, if they have debt, we want to know. If not, maybe skip. But to be safe, let's include if key !== 'عميل غير معروف-' or if they have debt. 
            if (key === 'عميل غير معروف-' && (!sale.remainingDebt || sale.remainingDebt <= 0)) return;

            const existing = customerMap.get(key);
            if (existing) {
                existing.orderCount++;
                existing.totalSpent += sale.totalAmount;
                existing.totalDebt += (sale.remainingDebt || 0);
                if (new Date(sale.date) > new Date(existing.lastOrderDate)) {
                    existing.lastOrderDate = sale.date;
                    if (sale.customerName) existing.name = sale.customerName;
                    if (sale.customerPhone) existing.phone = sale.customerPhone;
                }
                existing.sales.push(sale);
            } else {
                customerMap.set(key, {
                    phone: sale.customerPhone || '',
                    name: sale.customerName || 'عميل غير معروف',
                    address: '',
                    orderCount: 1,
                    totalSpent: sale.totalAmount,
                    totalDebt: sale.remainingDebt || 0,
                    lastOrderDate: sale.date,
                    orders: [],
                    sales: [sale]
                });
            }
        });

        return Array.from(customerMap.values());
    }, [orders, dailySales]);

    const customers = useMemo(() => {
        let result = [...allCustomers];
        if (showOnlyDebtors) {
            result = result.filter(c => c.totalDebt > 0);
        }
        return result.sort((a,b) => b.totalSpent - a.totalSpent);
    }, [allCustomers, showOnlyDebtors]);

    const dashboardStats = useMemo(() => {
        const totalCustomers = allCustomers.length;
        const totalPurchases = allCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
        const totalDebt = allCustomers.reduce((sum, c) => sum + c.totalDebt, 0);
        const totalPaid = totalPurchases - totalDebt;
        return { totalCustomers, totalPurchases, totalDebt, totalPaid };
    }, [allCustomers]);

    if (selectedCustomer) {
        return (
            <CustomerDetails 
                customer={selectedCustomer} 
                onBack={() => setSelectedCustomer(null)} 
                treasury={treasury}
            />
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-users-cog" title="إدارة العملاء">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border dark:border-gray-700">
                    <input 
                        type="checkbox" 
                        id="debtors-filter" 
                        checked={showOnlyDebtors} 
                        onChange={(e) => setShowOnlyDebtors(e.target.checked)}
                        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="debtors-filter" className="text-sm font-medium text-gray-900 dark:text-gray-300 cursor-pointer">
                        عرض المديونيات فقط
                    </label>
                </div>
            </SectionHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-xl">
                        <i className="fas fa-users"></i>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي العملاء</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalCustomers}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 text-xl">
                        <i className="fas fa-shopping-bag"></i>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبيعات (المسحوبات)</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(dashboardStats.totalPurchases)}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 text-xl">
                        <i className="fas fa-hand-holding-usd"></i>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبالغ المحصلة</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(dashboardStats.totalPaid)}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-300 text-xl">
                        <i className="fas fa-dollar-sign"></i>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي مديونية العملاء</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(dashboardStats.totalDebt)}</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">اسم العميل</th>
                            <th className="px-6 py-3">رقم الهاتف</th>
                            <th className="px-6 py-3">عدد الطلبات</th>
                            <th className="px-6 py-3">إجمالي المشتريات</th>
                            <th className="px-6 py-3">المديونية</th>
                            <th className="px-6 py-3">آخر طلب</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-gray-500">لا يوجد عملاء لعرضهم.</td>
                            </tr>
                        ) : (
                            customers.map(customer => (
                                <tr key={`${customer.name}-${customer.phone}`} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                                    <td className="px-6 py-4">{customer.phone}</td>
                                    <td className="px-6 py-4 text-center font-bold">{customer.orderCount}</td>
                                    <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{formatCurrency(customer.totalSpent)}</td>
                                    <td className="px-6 py-4 font-bold text-red-500">{customer.totalDebt > 0 ? formatCurrency(customer.totalDebt) : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(customer.lastOrderDate)}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => setSelectedCustomer(customer)} className="text-blue-500 hover:text-blue-700 font-medium" title="عرض كشف الحساب والمدفوعات">
                                            <i className="fas fa-file-invoice-dollar ml-1"></i> كشف الحساب
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Customers;
