

import { Timestamp } from 'firebase/firestore';

export type Branch = 'main' | 'branch1' | 'branch2' | 'branch3';

export enum Role {
    Admin = 'admin',
    BranchManager = 'manager',
    Seller = 'seller',
    Accountant = 'accountant',
    Cashier = 'cashier',
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
    Users = 'users',
}

export interface User {
    id: string;
    username: string; // email
    name: string;
    role: Role;
    branch: Branch;
    permissions: Section[];
    password?: string; // Added to store password for display (Admin only)
}

export type MainCategory = 'قطع غيار' | 'كماليات و إكسسوارات' | 'زيوت وشحومات' | 'بطاريات' | 'إطارات';

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
    discount?: number;
    isNew?: boolean;
    rating?: number;
}

export interface SaleItem {
    productId: number;
    productName?: string;
    quantity: number;
    unitPrice: number;
    itemType: MainCategory | 'خدمة' | 'أخرى';
    serialNumbers?: string[]; // Added
    isReturn?: boolean; // Added for Exchange direction
}

export interface DailySale {
    id: number;
    date: string;
    timestamp?: string;
    invoiceNumber: string;
    sellerId: string;
    sellerName: string;
    source: 'المحل' | 'أونلاين';
    branchSoldFrom: Branch;
    direction: 'بيع' | 'مرتجع' | 'تبديل' | 'ضمان' | 'هدية';
    invoiceType?: 'wholesale' | 'retail'; // Added
    discount?: number; // Added (percentage)
    totalAmount: number;
    notes?: string;
    cashierLocation?: 'فوق' | 'تحت'; // Added
    warrantyPeriod?: string; // Added
    paymentMethod?: 'نقدى' | 'إلكترونى' | 'مختلط' | 'آجل';
    cashAmount?: number;
    electronicAmount?: number;
    customerName?: string;
    customerPhone?: string;
    locationLink?: string; // Added
    remainingDebt?: number;
    paidAmount?: number;

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
    timestamp?: string;
    phone?: string;
    address?: string;
    email?: string; // Added for linking to auth
    idCardUrl?: string; // Added
}

export interface Advance {
    id: number;
    date: string;
    timestamp?: string;
    employeeId: number;
    amount: number;
    payment: number;
    notes?: string;
}

export interface Attendance {
    id: number;
    date: string;
    timestamp?: string;
    employeeId: number;
    checkIn?: string;
    checkOut?: string;
    daysAttended?: number;
    notes?: string;
}

export interface Payroll {
    id: number;
    date: string;
    timestamp?: string;
    employeeId: number;
    basicSalary: number;
    incentives?: number; // Added
    deductions?: number; // Added (calculated from advances/expenses)
    advanceDeductions?: number; // Added to track how much of deductions were advances
    expenseDeductions?: number; // Added to track how much of deductions were expenses
    daysAttended?: number; // Added
    periodStart?: string; // Added
    periodEnd?: string; // Added
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
    purchasePriceTotal?: number; // Optional helper
}

export interface PurchaseOrder {
    id: number;
    supplierId: number;
    orderDate: string;
    timestamp?: string;
    status: 'معلق' | 'مكتمل' | 'ملغي';
    type?: 'شراء' | 'مرتجع'; // Added for purchase returns
    branch?: 'main' | 'branch1' | 'branch2' | 'branch3';
    items: PurchaseOrderItem[];
    totalAmount: number;
    notes?: string;
}

export interface Payment {
    id: number;
    date: string;
    timestamp?: string;
    supplierId: number;
    payment: number;
    invoiceTotal?: number;
    purchaseOrderId?: number;
    returnedItems?: string;
    notes?: string;
}

export interface Expense {
    id: number;
    date: string;
    timestamp?: string;
    type: 'شخصية' | 'عامة' | 'موظفين';
    name: string;
    amount: number;
    notes?: string;
    employeeId?: number; // Added to link expense to employee for payroll
}

export interface TreasuryTransaction {
    id: number;
    date: string;
    timestamp?: string;
    type: string;
    description: string;
    amountIn: number;
    amountOut: number;
    relatedId?: number | string; // e.g., saleId, expenseId, orderId (string)
    paymentMethod?: 'cash' | 'electronic'; // Added
}

export interface DailyReview {
    id: number;
    date: string;
    timestamp?: string;
    branch: Branch;
    salesCash: number;
    salesElectronic: number;
    totalSales: number;
    salesParts?: number;
    salesAccessories?: number;
    drawerBalance: number;
    expensesTotal?: number; // Added for comprehensive review
    onlineOrdersTotal?: number; // Added for comprehensive review
    onlineOrdersCount?: number; // Added for comprehensive review
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
    timestamp?: string;
    createdAt: Timestamp; // To track new orders for notifications
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    locationLink?: string; // Added
    items: OrderItem[];
    totalAmount: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'cancelled' | 'collected' | 'returned';
    paymentMethod: 'cod' | 'electronic';
    paymentProofUrl?: string;
    // New fields
    customerId?: string; // For future use with customer accounts
    discountCode?: string;
    discountAmount?: number;
    shippingCompany?: string; // Added for shipping tracking
    trackingNumber?: string; // Added for shipping tracking
    shippingNotes?: string; // Added for shipping tracking
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
    tickerMessages?: string[]; // Added
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface StockTransfer {
    id: number;
    date: string;
    timestamp?: string;
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
    electronicPaymentNumber?: string; // Added for controlling payment number
    tickerMessages?: string[]; // Added for ticker messages
}