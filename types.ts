

import { Timestamp } from 'firebase/firestore';

export type Branch = 'main' | 'branch1' | 'branch2' | 'branch3';

export enum Role {
    Admin = 'admin',
    BranchManager = 'manager',
    Seller = 'seller',
    Accountant = 'accountant',
}

export enum Section {
    Dashboard = 'dashboard',
    Treasury = 'treasury',
    DailySales = 'daily-sales',
    StoreManagement = 'store-management',
    Purchasing = 'purchasing',
    Employees = 'employees',
    Advances = 'advances',
    Attendance = 'attendance',
    Payroll = 'payroll',
    Suppliers = 'suppliers',
    Expenses = 'expenses',
    DailyReview = 'daily-review',
    Reports = 'reports',
    Orders = 'orders',
    Customers = 'customers',
    Promotions = 'promotions',
    Settings = 'settings',
    Notifications = 'notifications',
}

export interface User {
    id: string;
    username: string; // email
    name: string;
    role: Role;
    branch: Branch;
    permissions: Section[];
}

export type MainCategory = 'قطع غيار' | 'كماليات واكسسوارات' | 'زيوت وشحومات' | 'بطاريات' | 'إطارات';

export interface Product {
    id: number;
    name: string;
    sku: string;
    mainCategory: MainCategory;
    category: string;
    brand: string;
    countryOfOrigin?: string; // Added
    purchasePrice: number;
    sellingPrice: number; // Default selling price (can be retail)
    wholesalePrice?: number; // Added
    retailPrice?: number; // Added
    stock: Record<Branch, number>;
    reorderPoint?: number;
    description?: string;
    images: string[];
    compatibility?: string[];
    hasSerialNumber?: boolean; // Added
}

export interface SaleItem {
    productId: number;
    quantity: number;
    unitPrice: number;
    itemType: MainCategory | 'خدمة' | 'أخرى';
    serialNumbers?: string[]; // Added
}

export interface DailySale {
    id: number;
    date: string;
    invoiceNumber: string;
    sellerId: string;
    sellerName: string;
    source: 'المحل' | 'أونلاين';
    branchSoldFrom: Branch;
    direction: 'بيع' | 'مرتجع' | 'تبديل' | 'ضمان';
    invoiceType?: 'wholesale' | 'retail'; // Added
    discount?: number; // Added (percentage)
    totalAmount: number;
    notes?: string;

    // New multi-item structure (optional for backward compatibility)
    items?: SaleItem[];

    // Legacy single-item fields for backward compatibility
    productId?: number;
    quantity?: number;
    unitPrice?: number;
    itemType?: MainCategory | 'خدمة' | 'أخرى';
}


export interface Employee {
    id: number;
    name: string;
    position: string;
    basicSalary: number;
    hireDate: string;
    phone?: string;
    address?: string;
    email?: string; // Added for linking to auth
}

export interface Advance {
    id: number;
    date: string;
    employeeId: number;
    amount: number;
    payment: number;
    notes?: string;
}

export interface Attendance {
    id: number;
    date: string;
    employeeId: number;
    checkIn?: string;
    checkOut?: string;
    notes?: string;
}

export interface Payroll {
    id: number;
    date: string;
    employeeId: number;
    basicSalary: number;
    incentives?: number; // Added
    disbursed: number;
    notes?: string;
}

export interface Supplier {
    id: number;
    name: string;
    contact: string;
    address?: string;
}

export interface PurchaseOrderItem {
    productId: number;
    quantity: number;
    purchasePrice: number;
}

export interface PurchaseOrder {
    id: number;
    supplierId: number;
    orderDate: string;
    status: 'معلق' | 'مكتمل' | 'ملغي';
    items: PurchaseOrderItem[];
    totalAmount: number;
    notes?: string;
}

export interface Payment {
    id: number;
    date: string;
    supplierId: number;
    payment: number;
    invoiceTotal: number;
    purchaseOrderId?: number;
    returnedItems?: string;
    notes?: string;
}

export interface Expense {
    id: number;
    date: string;
    type: 'شخصية' | 'عامة' | 'موظفين';
    name: string;
    amount: number;
    notes?: string;
}

export interface TreasuryTransaction {
    id: number;
    date: string;
    type: string;
    description: string;
    amountIn: number;
    amountOut: number;
    relatedId?: number | string; // e.g., saleId, expenseId, orderId (string)
}

export interface DailyReview {
    id: number;
    date: string;
    branch: Branch;
    salesCash: number;
    salesElectronic: number;
    totalSales: number;
    salesParts?: number;
    salesAccessories?: number;
    drawerBalance: number;
    notes?: string;
}

export interface OrderItem {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export interface Order {
    id: number | string;
    date: string;
    createdAt: Timestamp; // To track new orders for notifications
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    items: OrderItem[];
    totalAmount: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'cancelled';
    paymentMethod: 'cod' | 'electronic';
    paymentProofUrl?: string;
    // New fields
    customerId?: string; // For future use with customer accounts
    discountCode?: string;
    discountAmount?: number;
}

export interface Notification {
    id: string;
    date: string;
    createdAt?: Timestamp | number; // Added for sorting
    message: string;
    read: boolean;
    orderId?: number | string;
    type?: 'order' | 'system' | 'status_change'; // Added
    targetGroup?: 'admin' | 'all' | 'customer'; // Added
}

export interface Broadcast {
    id: string;
    message: string;
    date: string;
    sentBy: string;
}

export interface StorefrontSettings {
    featuredProductIds: number[];
    newArrivalProductIds: number[];
    adminPassword?: string;
}


export interface CartItem {
    product: Product;
    quantity: number;
}

export interface StockTransfer {
    id: number;
    date: string;
    productId: number;
    productName: string;
    quantity: number;
    fromBranch: Branch;
    toBranch: Branch;
    notes?: string;
}

export interface DiscountCode {
    id: string; // Use the code itself as the ID
    code: string;
    type: 'fixed' | 'percentage';
    value: number;
    minPurchase: number;
    expiresAt: string;
    isActive: boolean;
}

export interface Toast {
    id: number;
    message: string;
    type: 'info' | 'success' | 'error';
}

export interface AppData {
    users: User[];
    products: Product[];
    dailySales: DailySale[];
    employees: Employee[];
    advances: Advance[];
    attendance: Attendance[];
    payroll: Payroll[];
    suppliers: Supplier[];
    purchaseOrders: PurchaseOrder[];
    payments: Payment[];
    expenses: Expense[];
    treasury: TreasuryTransaction[];
    dailyReview: DailyReview[];
    orders: Order[];
    notifications: Notification[];
    broadcasts: Broadcast[];
    storefrontSettings: StorefrontSettings;
    stockTransfers: StockTransfer[];
    discountCodes: DiscountCode[];
    toasts: Toast[];
    settings: Settings;
}

export interface Settings {
    allowedIP?: string;
    enableIPRestriction: boolean;
    enableTimeRestriction: boolean;
    workStartTime: string; // "09:00"
    workEndTime: string; // "23:00"
}