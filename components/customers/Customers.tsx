
import React, { useMemo, useState } from 'react';
import useStore from '../../lib/store';
import { Order, DailySale } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import { formatCurrency, formatDate } from '../../lib/utils';
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

const CustomerDetailsModal: React.FC<{ customer: Customer | null; onClose: () => void }> = ({ customer, onClose }) => {
    if (!customer) return null;
    return (
        <Modal isOpen={!!customer} onClose={onClose} title={`سجل طلبات: ${customer.name}`}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {customer.totalDebt > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                        <h3 className="text-red-800 dark:text-red-300 font-bold text-lg mb-2">إجمالي المديونية: {formatCurrency(customer.totalDebt)}</h3>
                        <p className="text-sm text-red-600 dark:text-red-400">هذه المديونية ناتجة عن فواتير آجلة أو مدفوعة جزئياً.</p>
                    </div>
                )}
                
                {customer.orders.length > 0 && (
                    <>
                        <h4 className="font-bold text-lg border-b pb-2">طلبات الأونلاين</h4>
                        {customer.orders.map(order => (
                            <div key={`order-${order.id}`} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex justify-between items-center font-bold">
                                    <span>طلب رقم #{order.id} - {formatDate(order.date)}</span>
                                    <span>{formatCurrency(order.totalAmount)}</span>
                                </div>
                                <ul className="text-sm mt-2 list-disc pr-5">
                                    {order.items.map(item => (
                                        <li key={item.productId}>{item.productName} (الكمية: {item.quantity})</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </>
                )}

                {customer.sales.length > 0 && (
                    <>
                        <h4 className="font-bold text-lg border-b pb-2 mt-4">فواتير المحل</h4>
                        {customer.sales.map(sale => (
                            <div key={`sale-${sale.id}`} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex justify-between items-center font-bold">
                                    <span>فاتورة رقم #{sale.invoiceNumber} - {formatDate(sale.date)}</span>
                                    <span>{formatCurrency(sale.totalAmount)}</span>
                                </div>
                                {sale.remainingDebt && sale.remainingDebt > 0 ? (
                                    <div className="text-sm text-red-500 font-semibold mt-1">
                                        متبقي (آجل): {formatCurrency(sale.remainingDebt)}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </>
                )}
            </div>
        </Modal>
    );
};


const Customers: React.FC = () => {
    const orders = useStore(state => state.appData?.orders || []);
    const dailySales = useStore(state => state.appData?.dailySales || []);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showOnlyDebtors, setShowOnlyDebtors] = useState(false);

    const customers = useMemo(() => {
        const customerMap = new Map<string, Customer>();
        
        // Process Orders
        orders.forEach(order => {
            const phone = order.customerPhone;
            if (!phone) return;
            
            const existing = customerMap.get(phone);
            if (existing) {
                existing.orderCount++;
                existing.totalSpent += order.totalAmount;
                if (new Date(order.date) > new Date(existing.lastOrderDate)) {
                    existing.lastOrderDate = order.date;
                    existing.name = order.customerName; // Update to latest name/address
                    existing.address = order.customerAddress;
                }
                existing.orders.push(order);
            } else {
                customerMap.set(phone, {
                    phone,
                    name: order.customerName,
                    address: order.customerAddress,
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
            const phone = sale.customerPhone;
            if (!phone) return;

            const existing = customerMap.get(phone);
            if (existing) {
                existing.orderCount++;
                existing.totalSpent += sale.totalAmount;
                existing.totalDebt += (sale.remainingDebt || 0);
                if (new Date(sale.date) > new Date(existing.lastOrderDate)) {
                    existing.lastOrderDate = sale.date;
                    if (sale.customerName) existing.name = sale.customerName;
                }
                existing.sales.push(sale);
            } else {
                customerMap.set(phone, {
                    phone,
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

        let result = Array.from(customerMap.values());
        
        if (showOnlyDebtors) {
            result = result.filter(c => c.totalDebt > 0);
        }
        
        return result.sort((a,b) => b.totalSpent - a.totalSpent);
    }, [orders, dailySales, showOnlyDebtors]);

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
                                <tr key={customer.phone} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                                    <td className="px-6 py-4">{customer.phone}</td>
                                    <td className="px-6 py-4 text-center font-bold">{customer.orderCount}</td>
                                    <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{formatCurrency(customer.totalSpent)}</td>
                                    <td className="px-6 py-4 font-bold text-red-500">{customer.totalDebt > 0 ? formatCurrency(customer.totalDebt) : '-'}</td>
                                    <td className="px-6 py-4">{formatDate(customer.lastOrderDate)}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => setSelectedCustomer(customer)} className="text-blue-500 hover:text-blue-700" title="عرض سجل الطلبات">
                                            <i className="fas fa-eye"></i> عرض التفاصيل
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <CustomerDetailsModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
        </div>
    );
};

export default Customers;
