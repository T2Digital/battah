import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Order, Role, ShippingCarrierProvider } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import { formatDate, formatCurrency, formatDateTime } from '../../lib/utils';
import useStore from '../../lib/store';
import Modal from '../shared/Modal';
import ConfirmationModal from '../shared/ConfirmationModal';
import { resolveTenantBrandId } from '../../lib/tenantBootstrap';
import { getTenantSessionToken } from '../../lib/tenantErpSync';
import {
    SHIPPING_CARRIERS,
    getShippingConfig,
    getStoreBranding,
    getCarrierLabel,
    buildCarrierTrackingUrl,
} from '../../lib/appConfig';

const escapeHtml = (str: any) =>
    String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

const printShippingWaybill = (order: Order, storeName: string, storePhone?: string, storeAddress?: string) => {
    const win = window.open('', '_blank', 'width=520,height=760');
    if (!win) {
        alert('يرجى السماح بالنوافذ المنبثقة لطباعة بوليصة الشحن.');
        return;
    }
    const isCod = order.paymentMethod === 'cod';
    const itemsHtml = (order.items || [])
        .map(
            (i) =>
                `<tr><td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;">${escapeHtml(i.productName)}</td><td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;">${Number(i.quantity || 1)}</td><td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:left;">${formatCurrency(Number(i.unitPrice || 0) * Number(i.quantity || 1))}</td></tr>`
        )
        .join('');

    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>بوليصة شحن #${escapeHtml(order.id)}</title>
<style>
  @page { size: A6 portrait; margin: 6mm; }
  body { font-family: 'Cairo', Tahoma, Arial, sans-serif; margin: 0; padding: 10px; color: #111827; font-size: 12px; }
  .box { border: 2px solid #111827; border-radius: 10px; padding: 10px; }
  .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .cod { margin: 8px 0; padding: 8px; text-align: center; border-radius: 8px; font-weight: 800; font-size: 14px; border: 2px dashed #111827; background: ${isCod ? '#fef3c7' : '#d1fae5'}; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
  @media print { .no-print { display: none; } }
</style></head><body>
  <div class="no-print" style="margin-bottom:8px;text-align:center;"><button onclick="window.print()" style="padding:8px 18px;background:#1e40af;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">طباعة البوليصة (A6)</button></div>
  <div class="box">
    <div class="row" style="border-bottom:2px solid #111827;padding-bottom:6px;margin-bottom:8px;">
      <div><div style="font-weight:900;font-size:15px;">${escapeHtml(storeName)}</div>${storePhone ? `<div style="font-size:11px;">${escapeHtml(storePhone)}</div>` : ''}${storeAddress ? `<div style="font-size:10px;color:#4b5563;">${escapeHtml(storeAddress)}</div>` : ''}</div>
      <div style="text-align:left;"><div style="font-size:10px;color:#4b5563;">رقم الطلب</div><div style="font-weight:900;font-size:18px;">#${escapeHtml(order.id)}</div></div>
    </div>
    <div style="margin-bottom:6px;">
      <strong>المُرسل إليه:</strong> ${escapeHtml(order.customerName)}<br/>
      <strong>الموبايل:</strong> <span dir="ltr">${escapeHtml(order.customerPhone)}</span><br/>
      ${order.shippingZone ? `<strong>المحافظة / المنطقة:</strong> ${escapeHtml(order.shippingZone)}<br/>` : ''}
      <strong>العنوان:</strong> ${escapeHtml(order.customerAddress)}
    </div>
    ${(order.shippingCompany || order.trackingNumber) ? `<div style="padding:6px;background:#f3f4f6;border-radius:6px;margin-bottom:6px;"><strong>الشحن:</strong> ${escapeHtml(order.shippingCompany || '')} ${order.trackingNumber ? `— بوليصة: <span dir="ltr">${escapeHtml(order.trackingNumber)}</span>` : ''}</div>` : ''}
    <div class="cod">${isCod ? `التحصيل عند الاستلام (COD): ${formatCurrency(order.totalAmount)}` : `مدفوع مسبقاً (تحصيل: 0 ج.م) — قيمة الطلب: ${formatCurrency(order.totalAmount)}`}</div>
    <table><thead><tr style="background:#f3f4f6;"><th style="text-align:right;padding:4px 6px;">الصنف</th><th>الكمية</th><th style="text-align:left;padding:4px 6px;">القيمة</th></tr></thead><tbody>${itemsHtml}</tbody></table>
    ${order.shippingNotes ? `<div style="margin-top:6px;font-size:11px;color:#374151;"><strong>ملاحظات:</strong> ${escapeHtml(order.shippingNotes)}</div>` : ''}
    <div style="margin-top:8px;font-size:10px;color:#6b7280;text-align:center;">تاريخ الطلب: ${escapeHtml(formatDateTime(order.date, order.timestamp))}</div>
  </div>
</body></html>`);
    win.document.close();
};

const OrderDetailsModal: React.FC<{
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
}> = ({ order, isOpen, onClose }) => {
    if (!order) return null;
    const getWhatsAppLink = (phone: string, order: Order) => {
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        if (!cleanPhone.startsWith('20')) cleanPhone = '20' + cleanPhone;

        const locationText = order.locationLink ? `\nرابط الموقع: ${order.locationLink}` : '';
        const message = `مرحباً ${order.customerName}،\nتم استلام طلبك رقم #${order.id}.\nالإجمالي: ${formatCurrency(order.totalAmount)}.${locationText}\nشكراً لتسوقك معنا!`;
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل الطلب رقم #${order.id}`}>
            <div className="space-y-4">
                <div>
                    <h3 className="font-bold">بيانات العميل</h3>
                    <p>الاسم: {order.customerName}</p>
                    <p className="flex items-center gap-2">
                        الهاتف: {order.customerPhone}
                        <a 
                            href={getWhatsAppLink(order.customerPhone, order)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-green-500 hover:text-green-600"
                            title="إرسال عبر واتساب"
                        >
                            <i className="fab fa-whatsapp text-xl"></i>
                        </a>
                    </p>
                    <p>العنوان: {order.customerAddress}</p>
                    {order.locationLink && (
                        <p>
                            <a href={order.locationLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                                <i className="fas fa-map-marker-alt"></i>
                                عرض الموقع على الخريطة
                            </a>
                        </p>
                    )}
                </div>
                <div>
                    <h3 className="font-bold">المنتجات</h3>
                    <ul>
                        {order.items.map(item => (
                             <li key={item.productId} className="flex justify-between">
                                <span>{item.productName} (x{item.quantity})</span>
                                <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="font-bold text-lg flex justify-between border-t pt-2">
                    <span>الإجمالي:</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                </div>
                 <div>
                    <h3 className="font-bold">طريقة الدفع</h3>
                    <p>{order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : order.paymentMethod === 'paymob' ? 'بطاقة بنكية (Paymob)' : 'دفع إلكتروني (محفظة / إنستاباي)'}</p>
                </div>
                {order.shippingZone && (
                    <div>
                        <h3 className="font-bold">منطقة الشحن والرسوم</h3>
                        <p>{order.shippingZone} {typeof order.deliveryFee === 'number' ? `(${order.deliveryFee === 0 ? 'شحن مجاني' : formatCurrency(order.deliveryFee)})` : ''}</p>
                    </div>
                )}
                {(order.shippingCompany || order.trackingNumber) && (
                    <div>
                        <h3 className="font-bold">بيانات الشحن والتتبع</h3>
                        <p>{order.shippingCompany || '-'} {order.trackingNumber ? `— ${order.trackingNumber}` : ''}</p>
                    </div>
                )}
                {order.paymentProofUrl && (
                    <div>
                        <h3 className="font-bold">إثبات الدفع</h3>
                        <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            عرض صورة الإيصال
                        </a>
                        <img src={order.paymentProofUrl} alt="Payment Proof" className="mt-2 rounded-lg max-w-full h-auto"/>
                    </div>
                )}
            </div>
        </Modal>
    );
};


const Orders: React.FC = () => {
    const { orders, appCustomization, storefrontSettings, updateOrderStatus, deleteOrder, fetchDataByDateRange } = useStore(state => ({
        orders: state.appData?.orders || [],
        appCustomization: state.appData?.appCustomization,
        storefrontSettings: state.appData?.storefrontSettings,
        updateOrderStatus: state.updateOrderStatus,
        deleteOrder: state.deleteOrder,
        fetchDataByDateRange: state.fetchDataByDateRange
    }));
    const shippingConfig = useMemo(() => getShippingConfig(appCustomization), [appCustomization]);
    const branding = useMemo(() => getStoreBranding(storefrontSettings, 'المتجر الإلكتروني'), [storefrontSettings]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDispatchingCarrier, setIsDispatchingCarrier] = useState(false);
    
    const [activeTab, setActiveTab] = useState<'orders' | 'shipping'>('orders');
    const [orderToShip, setOrderToShip] = useState<Order | null>(null);
    const [shippingDetails, setShippingDetails] = useState<{
        provider: ShippingCarrierProvider;
        company: string;
        tracking: string;
        notes: string;
    }>({ provider: 'manual', company: '', tracking: '', notes: '' });
    
    // Filtering and Pagination State
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const sortedOrders = useMemo(() => {
        if (!orders || !Array.isArray(orders)) return [];
        let filtered = [...orders];
        
        if (filterStatus !== 'all') {
            filtered = filtered.filter(order => order.status === filterStatus);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
            filtered = filtered.filter(o => {
                const d = new Date(o.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            });
        } else if (dateFilter === 'week') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            filtered = filtered.filter(o => {
                const d = new Date(o.date);
                d.setHours(0, 0, 0, 0);
                return d >= lastWeek;
            });
        } else if (dateFilter === 'month') {
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            filtered = filtered.filter(o => {
                const d = new Date(o.date);
                d.setHours(0, 0, 0, 0);
                return d >= lastMonth;
            });
        } else if (dateFilter === 'custom' && customDateFrom && customDateTo) {
            const from = new Date(customDateFrom);
            from.setHours(0, 0, 0, 0);
            const to = new Date(customDateTo);
            to.setHours(23, 59, 59, 999);
            filtered = filtered.filter(o => {
                const d = new Date(o.date);
                return d >= from && d <= to;
            });
        }

        return filtered.sort((a, b) => {
            const getTime = (dateObj: any, dateStr: string) => {
                if (!dateObj) return new Date(dateStr).getTime() || 0;
                // Handle Firestore Timestamp instance
                if (typeof dateObj.toMillis === 'function') return dateObj.toMillis();
                // Handle serialized Timestamp object (e.g. from JSON)
                if (typeof dateObj.seconds === 'number') return dateObj.seconds * 1000;
                // Handle Date object or string
                const time = new Date(dateObj).getTime();
                return isNaN(time) ? (new Date(dateStr).getTime() || 0) : time;
            };
            
            const timeA = getTime(a.createdAt, a.date);
            const timeB = getTime(b.createdAt, b.date);
            
            return timeB - timeA;
        });
    }, [orders, filterStatus, dateFilter]);

    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedOrders.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedOrders, currentPage]);

    const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);

    const statusMap: Record<string, { text: string; color: string }> = {
        pending: { text: 'معلق', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
        confirmed: { text: 'مؤكد', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
        shipped: { text: 'تم الشحن', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
        collected: { text: 'تم التحصيل', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
        returned: { text: 'مرتجع', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
        cancelled: { text: 'ملغي', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    };

    const openShipModal = (order: Order) => {
        const defaultProvider =
            order.carrierProvider ||
            shippingConfig.carrierIntegration?.provider ||
            'manual';
        setOrderToShip(order);
        setShippingDetails({
            provider: defaultProvider,
            company: order.shippingCompany || getCarrierLabel(defaultProvider),
            tracking: order.trackingNumber || '',
            notes: order.shippingNotes || '',
        });
    };

    const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
        if (newStatus === 'shipped') {
            openShipModal(order);
        } else {
            await updateOrderStatus(order.id, newStatus);
        }
    };

    const handleShippingSubmit = async (useBostaApi = false) => {
        if (!orderToShip) return;
        const companyName = shippingDetails.company.trim() || getCarrierLabel(shippingDetails.provider);
        const slug = resolveTenantBrandId();
        const token = slug ? getTenantSessionToken(slug) : null;

        if (useBostaApi && slug && token) {
            setIsDispatchingCarrier(true);
            try {
                const res = await fetch(
                    `/api/tenant-shipping?slug=${encodeURIComponent(slug)}&action=create-shipment`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            orderId: orderToShip.id,
                            provider: shippingDetails.provider,
                            shippingCompany: companyName,
                            trackingNumber: shippingDetails.tracking.trim(),
                            notes: shippingDetails.notes.trim(),
                        }),
                    }
                );
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data?.ok || !data?.order) {
                    alert(data?.error || 'تعذر إنشاء بوليصة الشحن الآلية');
                    return;
                }
                await updateOrderStatus(orderToShip.id, 'shipped', {
                    carrierProvider: data.order.carrierProvider || shippingDetails.provider,
                    shippingCompany: data.order.shippingCompany || companyName,
                    trackingNumber: data.order.trackingNumber || shippingDetails.tracking.trim(),
                    trackingUrl: data.order.trackingUrl,
                    shippingNotes: data.order.shippingNotes || shippingDetails.notes,
                });
                setOrderToShip(null);
                return;
            } finally {
                setIsDispatchingCarrier(false);
            }
        }

        const trackingUrl = buildCarrierTrackingUrl(
            shippingDetails.provider || companyName,
            shippingDetails.tracking
        );
        await updateOrderStatus(orderToShip.id, 'shipped', {
            carrierProvider: shippingDetails.provider,
            shippingCompany: companyName,
            trackingNumber: shippingDetails.tracking.trim(),
            trackingUrl: trackingUrl || undefined,
            shippingNotes: shippingDetails.notes,
        });
        setOrderToShip(null);
    };

    const handleExportCourierSheet = () => {
        const targetOrders =
            filterStatus === 'all'
                ? orders.filter((o) => ['pending', 'confirmed'].includes(o.status))
                : sortedOrders;
        if (targetOrders.length === 0) {
            alert('لا توجد طلبات معلقة أو مؤكدة للتصدير حالياً.');
            return;
        }
        const rows = targetOrders.map((o) => ({
            'رقم الطلب': `#${o.id}`,
            'اسم العميل': o.customerName,
            'رقم الموبايل': o.customerPhone,
            'المحافظة / المنطقة': o.shippingZone || '',
            'العنوان بالتفصيل': o.customerAddress,
            'مبلغ التحصيل (COD)': o.paymentMethod === 'cod' ? Number(o.totalAmount || 0) : 0,
            'إجمالي الطلب': Number(o.totalAmount || 0),
            'طريقة الدفع': o.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
            'الأصناف': (o.items || []).map((i) => `${i.productName} (x${i.quantity})`).join(' | '),
            'شركة الشحن': o.shippingCompany || getCarrierLabel(shippingConfig.carrierIntegration?.provider),
            'ملاحظات': o.shippingNotes || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
        XLSX.writeFile(wb, `courier-orders-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleDeleteClick = (order: Order) => {
        if (!order.id) {
            alert("هذا الطلب تالف ولا يمكن حذفه. يرجى حذفه يدوياً من قاعدة بيانات Firebase.");
            return;
        }
        setOrderToDelete(order);
    };

    const confirmDelete = async () => {
        if (!orderToDelete) return;
        setIsDeleting(true);
        try {
            await deleteOrder(orderToDelete.id);
            setOrderToDelete(null);
        } catch (error) {
            console.error("Failed to delete order:", error);
            alert(`حدث خطأ أثناء حذف الطلب: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const getDeleteWarningMessage = (order: Order | null): string => {
        if (!order) return '';
        if (['confirmed', 'shipped', 'collected'].includes(order.status)) {
            return 'هذا الطلب تم تأكيده بالفعل. هل أنت متأكد من حذفه؟ سيتم عكس جميع العمليات المرتبطة به (فاتورة البيع، حركة الخزينة، والمخزون).';
        }
        return 'هل أنت متأكد من حذف هذا الطلب؟';
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-receipt" title="إدارة الطلبات" />
            
            <div className="flex border-b dark:border-gray-700 mb-4">
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'orders' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab('orders')}
                >
                    الطلبات
                </button>
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'shipping' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab('shipping')}
                >
                    متابعة الشحن
                </button>
            </div>

            {activeTab === 'orders' ? (
                <>
            {/* Filter Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">تصفية حسب الحالة:</span>
                        <select
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                            className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="all">الكل</option>
                            <option value="pending">معلق</option>
                            <option value="confirmed">مؤكد</option>
                            <option value="shipped">تم الشحن</option>
                            <option value="collected">تم التحصيل</option>
                            <option value="cancelled">ملغي</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الفترة:</span>
                        <select
                            value={dateFilter}
                            onChange={(e) => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
                            className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="all">الكل</option>
                            <option value="today">اليوم</option>
                            <option value="week">هذا الأسبوع</option>
                            <option value="month">هذا الشهر</option>
                            <option value="custom">مخصص</option>
                        </select>
                    </div>
                    {dateFilter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input type="date" value={customDateFrom} onChange={e => { setCustomDateFrom(e.target.value); setCurrentPage(1); }} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <span className="text-gray-500">-</span>
                            <input type="date" value={customDateTo} onChange={e => { setCustomDateTo(e.target.value); setCurrentPage(1); }} className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <button 
                                onClick={() => {
                                    if (customDateFrom && customDateTo) {
                                        fetchDataByDateRange('orders', customDateFrom, customDateTo);
                                    }
                                }}
                                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                title="جلب بيانات من الخادم"
                            >
                                <i className="fas fa-cloud-download-alt"></i>
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExportCourierSheet}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm"
                        title="تصدير ملف إكسل جاهز للرفع على بوسطة / أرامكس / مايلرز / تربو"
                    >
                        <i className="fas fa-file-excel"></i>
                        <span>تصدير شيت شركات الشحن</span>
                    </button>
                    <div className="text-sm text-gray-500">
                        إجمالي الطلبات: {sortedOrders.length}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">رقم الطلب</th>
                            <th className="px-6 py-3">التاريخ والوقت</th>
                            <th className="px-6 py-3">العميل</th>
                            <th className="px-6 py-3">الإجمالي</th>
                            <th className="px-6 py-3">الدفع</th>
                            <th className="px-6 py-3">الحالة</th>
                            <th className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedOrders.map((order, index) => {
                            const isCorrupted = !order.id;
                            return (
                            <tr key={order.id || `corrupted-${index}`} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className={`px-6 py-4 font-bold ${isCorrupted ? 'text-red-500' : ''}`}>#{order.id || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(order.date, order.timestamp)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    <div>{order.customerName}</div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                        <a href={`tel:${order.customerPhone}`} className="hover:text-blue-500" title="اتصال">
                                            <i className="fas fa-phone"></i> {order.customerPhone}
                                        </a>
                                        {order.locationLink && (
                                            <a href={order.locationLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="الموقع">
                                                <i className="fas fa-map-marker-alt"></i>
                                            </a>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">{formatCurrency(order.totalAmount)}</td>
                                <td className="px-6 py-4">{order.paymentMethod === 'cod' ? 'عند الاستلام' : order.paymentMethod === 'paymob' ? 'Paymob' : 'إلكتروني'}</td>
                                <td className="px-6 py-4">
                                    <select 
                                        value={order.status}
                                        onChange={(e) => handleStatusChange(order, e.target.value as Order['status'])}
                                        className={`p-1 rounded text-xs border-none ${statusMap[order.status]?.color || 'bg-gray-100 text-gray-800'}`}
                                        disabled={isCorrupted}
                                    >
                                        <option value="pending">معلق</option>
                                        <option value="confirmed">مؤكد</option>
                                        <option value="shipped">تم الشحن</option>
                                        <option value="collected">تم التحصيل</option>
                                        <option value="returned">مرتجع</option>
                                        <option value="cancelled">ملغي</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => setSelectedOrder(order)} className="text-blue-500 hover:text-blue-700 text-lg" title="عرض التفاصيل">
                                        <i className="fas fa-eye"></i>
                                    </button>
                                    <button
                                        onClick={() => printShippingWaybill(order, branding.companyName, branding.contactPhone, branding.address)}
                                        className="text-indigo-500 hover:text-indigo-700 text-lg"
                                        title="طباعة بوليصة شحن (A6)"
                                    >
                                        <i className="fas fa-print"></i>
                                    </button>
                                     {order.paymentProofUrl && <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-700 text-lg" title="عرض إيصال الدفع">
                                        <i className="fas fa-file-invoice-dollar"></i>
                                    </a>}
                                    <button 
                                        onClick={() => handleDeleteClick(order)} 
                                        className="text-red-500 hover:text-red-700 text-lg w-6 text-center" 
                                        title="حذف الطلب"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        )})}
                        {paginatedOrders.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    لا توجد طلبات للعرض
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                    >
                        السابق
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        صفحة {currentPage} من {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                    >
                        التالي
                    </button>
                </div>
            )}
            </>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">رقم الطلب</th>
                                <th className="px-6 py-3">العميل</th>
                                <th className="px-6 py-3">شركة الشحن</th>
                                <th className="px-6 py-3">رقم التتبع</th>
                                <th className="px-6 py-3">ملاحظات</th>
                                <th className="px-6 py-3">الحالة</th>
                                <th className="px-6 py-3">تحديث</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.filter(o => ['shipped', 'returned', 'collected'].includes(o.status)).map((order) => (
                                <tr key={order.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-bold">#{order.id}</td>
                                    <td className="px-6 py-4">{order.customerName}</td>
                                    <td className="px-6 py-4">{order.shippingCompany || '-'}</td>
                                    <td className="px-6 py-4">
                                        {order.trackingNumber ? (
                                            (order.trackingUrl || buildCarrierTrackingUrl(order.carrierProvider || order.shippingCompany, order.trackingNumber)) ? (
                                                <a
                                                    href={order.trackingUrl || buildCarrierTrackingUrl(order.carrierProvider || order.shippingCompany, order.trackingNumber)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-blue-600 hover:underline font-mono font-bold"
                                                >
                                                    {order.trackingNumber} <i className="fas fa-external-link-alt text-[10px]"></i>
                                                </a>
                                            ) : (
                                                order.trackingNumber
                                            )
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4">{order.shippingNotes || '-'}</td>
                                    <td className="px-6 py-4">
                                        <select 
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order, e.target.value as Order['status'])}
                                            className={`p-1 rounded text-xs border-none ${statusMap[order.status]?.color || 'bg-gray-100 text-gray-800'}`}
                                        >
                                            <option value="shipped">تم الشحن</option>
                                            <option value="collected">تم التحصيل</option>
                                            <option value="returned">مرتجع</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => openShipModal(order)}
                                                className="text-blue-500 hover:text-blue-700"
                                                title="تحديث بيانات الشحن"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                onClick={() => printShippingWaybill(order, branding.companyName, branding.contactPhone, branding.address)}
                                                className="text-indigo-500 hover:text-indigo-700"
                                                title="طباعة بوليصة شحن"
                                            >
                                                <i className="fas fa-print"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.filter(o => ['shipped', 'returned', 'collected'].includes(o.status)).length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        لا توجد طلبات في مرحلة الشحن
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <OrderDetailsModal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
            />

            {orderToDelete && (
                <ConfirmationModal
                    isOpen={!!orderToDelete}
                    onClose={() => setOrderToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد حذف الطلب"
                    message={getDeleteWarningMessage(orderToDelete)}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}

            <Modal isOpen={!!orderToShip} onClose={() => setOrderToShip(null)} title={`شحن الطلب #${orderToShip?.id || ''}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مزود / شركة الشحن</label>
                        <select
                            value={shippingDetails.provider}
                            onChange={(e) => {
                                const nextProv = e.target.value as ShippingCarrierProvider;
                                setShippingDetails(prev => ({
                                    ...prev,
                                    provider: nextProv,
                                    company: getCarrierLabel(nextProv),
                                }));
                            }}
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {SHIPPING_CARRIERS.map((c) => (
                                <option key={c.provider} value={c.provider}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم شركة الشحن / المندوب</label>
                        <input 
                            type="text"
                            value={shippingDetails.company}
                            onChange={(e) => setShippingDetails({...shippingDetails, company: e.target.value})}
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="مثال: بوسطة، أرامكس، مايلرز..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم التتبع (بوليصة الشحن)</label>
                        <input 
                            type="text"
                            dir="ltr"
                            value={shippingDetails.tracking}
                            onChange={(e) => setShippingDetails({...shippingDetails, tracking: e.target.value})}
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                            placeholder="يُترك فارغاً عند الإرسال التلقائي لبوسطة"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات الشحن</label>
                        <textarea 
                            value={shippingDetails.notes}
                            onChange={(e) => setShippingDetails({...shippingDetails, notes: e.target.value})}
                            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="أي ملاحظات إضافية لشركة الشحن..."
                            rows={3}
                        />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 mt-4">
                        <button 
                            onClick={() => setOrderToShip(null)}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                            إلغاء
                        </button>
                        {shippingDetails.provider === 'bosta' && shippingConfig.carrierIntegration?.enabled && !shippingDetails.tracking.trim() && (
                            <button
                                onClick={() => handleShippingSubmit(true)}
                                disabled={isDispatchingCarrier}
                                className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-bold disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDispatchingCarrier ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                                <span>إنشاء بوليصة بوسطة آلياً</span>
                            </button>
                        )}
                        <button 
                            onClick={() => handleShippingSubmit(false)}
                            disabled={isDispatchingCarrier}
                            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50"
                        >
                            حفظ وتحديث الحالة
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Orders;