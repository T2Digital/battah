
import React, { useMemo, useState } from 'react';
import useStore from '../../lib/store';
import { Order } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import { formatCurrency, formatDate } from '../../lib/utils';
import Modal from '../shared/Modal';

interface Customer {
    phone: string;
    name: string;
    address: string;
    orderCount: number;
    totalSpent: number;
    lastOrderDate: string;
    orders: Order[];
}

const CustomerDetailsModal: React.FC<{ customer: Customer | null; onClose: () => void }> = ({ customer, onClose }) => {
    if (!customer) return null;
    return (
        <Modal isOpen={!!customer} onClose={onClose} title={`سجل طلبات: ${customer.name}`}>
            <div className="space-y-4">
                {customer.orders.map(order => (
                    <div key={order.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
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
            </div>
        </Modal>
    );
};


const Customers: React.FC = () => {
    const orders = useStore(state => state.appData?.orders || []);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const customers = useMemo(() => {
        const customerMap = new Map<string, Customer>();
        orders.forEach(order => {
            const phone = order.customerPhone;
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
                    lastOrderDate: order.date,
                    orders: [order],
                });
            }
        });
        return Array.from(customerMap.values()).sort((a,b) => b.totalSpent - a.totalSpent);
    }, [orders]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-users-cog" title="إدارة العملاء" />
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">اسم العميل</th>
                            <th className="px-6 py-3">رقم الهاتف</th>
                            <th className="px-6 py-3">عدد الطلبات</th>
                            <th className="px-6 py-3">إجمالي المشتريات</th>
                            <th className="px-6 py-3">آخر طلب</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(customer => (
                            <tr key={customer.phone} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                                <td className="px-6 py-4">{customer.phone}</td>
                                <td className="px-6 py-4 text-center font-bold">{customer.orderCount}</td>
                                <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{formatCurrency(customer.totalSpent)}</td>
                                <td className="px-6 py-4">{formatDate(customer.lastOrderDate)}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => setSelectedCustomer(customer)} className="text-blue-500 hover:text-blue-700" title="عرض سجل الطلبات">
                                        <i className="fas fa-eye"></i> عرض التفاصيل
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <CustomerDetailsModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
        </div>
    );
};

export default Customers;
