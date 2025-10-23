

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
}

export interface User {
    id: number;
    username: string; // email
    name: string;
    role: Role;
    branch: Branch;
    permissions: Section[];
}

export type MainCategory = 'قطع غيار' | 'كماليات' | 'زيوت وشحومات' | 'بطاريات' | 'إطارات';

export interface Product {
    id: number;
    name: string;
    sku: string;
    mainCategory: MainCategory;
    category: string;
    brand: string;
    purchasePrice: number;
    sellingPrice: number;
    stock: Record<Branch, number>;
    reorderPoint?: number;
    description?: string;
    images: string[];
    compatibility?: string[];
}

export interface SaleItem {
    productId: number;
    quantity: number;
    unitPrice: number;
    itemType: 'قطع غيار' | 'بطاريات' | 'زيوت' | 'كماليات' | 'خدمة' | 'أخرى';
}

export interface DailySale {
    id: number;
    date: string;
    invoiceNumber: string;
    sellerId: number;
    sellerName: string;
    source: 'المحل' | 'أونلاين';
    branchSoldFrom: Branch;
    direction: 'بيع' | 'مرتجع' | 'تبديل' | 'ضمان';
    totalAmount: number;
    notes?: string;

    // New multi-item structure (optional for backward compatibility)
    items?: SaleItem[];

    // Legacy single-item fields for backward compatibility
    productId?: number;
    quantity?: number;
    unitPrice?: number;
    itemType?: 'قطع غيار' | 'بطاريات' | 'زيوت' | 'كماليات' | 'خدمة' | 'أخرى';
}


export interface Employee {
    id: number;
    name: string;
    position: string;
    basicSalary: number;
    hireDate: string;
    phone?: string;
    address?: string;
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
    relatedId?: number; // e.g., saleId, expenseId
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
    id: number;
    date: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    items: OrderItem[];
    totalAmount: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'cancelled';
    paymentMethod: 'cod' | 'electronic';
    paymentProofUrl?: string;
}

export interface Notification {
    id: number;
    date: string;
    message: string;
    read: boolean;
    orderId?: number;
}

export interface StorefrontSettings {
    featuredProductIds: number[];
    newArrivalProductIds: number[];
}


export interface CartItem {
    product: Product;
    quantity: number;
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
    storefrontSettings: StorefrontSettings;
}