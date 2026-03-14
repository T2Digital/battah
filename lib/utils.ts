

import { DailySale, SaleItem } from '../types';

export const normalizeSaleItems = (sale: DailySale): SaleItem[] => {
    if (sale.items && Array.isArray(sale.items)) {
        return sale.items;
    }
    if (sale.productId && sale.quantity && sale.unitPrice && sale.itemType) {
        return [{
            productId: sale.productId,
            quantity: sale.quantity,
            unitPrice: sale.unitPrice,
            itemType: sale.itemType,
        }];
    }
    return [];
};


export const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0.00 ج.م';
    }
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(parseFloat(amount.toString())).replace('EGP', 'ج.م');
};

export const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
};

export const formatDateTime = (dateString: string | undefined, timestamp?: string): string => {
    if (!dateString && !timestamp) return '';
    try {
        const date = new Date(timestamp || dateString!);
        if (isNaN(date.getTime())) return timestamp || dateString!;
        return date.toLocaleString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        return timestamp || dateString!;
    }
};

export const calculateHours = (checkIn?: string, checkOut?: string): number => {
    if (!checkIn || !checkOut) return 0;
    try {
        const [inHours, inMinutes] = checkIn.split(':').map(Number);
        const [outHours, outMinutes] = checkOut.split(':').map(Number);
        const inTotalMinutes = inHours * 60 + inMinutes;
        const outTotalMinutes = outHours * 60 + outMinutes;
        let diffMinutes = outTotalMinutes - inTotalMinutes;
        if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight shifts
        return parseFloat((diffMinutes / 60).toFixed(2));
    } catch (error) {
        console.error('Error calculating hours:', error);
        return 0;
    }
};