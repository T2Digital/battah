export enum Section {
    Dashboard = 'Dashboard',
    Treasury = 'Treasury',
    DailySales = 'DailySales',
    Inventory = 'Inventory',
    Purchasing = 'Purchasing',
    Employees = 'Employees',
    Advances = 'Advances',
    Attendance = 'Attendance',
    Payroll = 'Payroll',
    Suppliers = 'Suppliers',
    Expenses = 'Expenses',
    DailyReview = 'DailyReview',
    Reports = 'Reports',
}

export enum Role {
    Admin = 'admin',
    BranchManager = 'manager',
    Accountant = 'accountant',
    Seller = 'seller',
}

export type Branch = 'main' | 'branch1' | 'branch2' | 'branch3';

export interface User {
    id: number;
    username: string;
    password?: string;
    name: string;
    role: Role;
    branch: Branch;
    permissions: Section[];
    active: boolean;
    phone?: string;
}

export interface Stock {
    main: number;
    branch1: number;
    branch2: number;
    branch3: number;
}

export type MainCategory = 'قطع غيار' | 'ميكانيكا' | 'كماليات';

export interface Compatibility {
    make: string;
    model: string;
    years: number[];
}

export interface Product {
    id: number;
    name: string;
    sku: string;
    mainCategory: MainCategory;
    category: string;
    brand: string;
    purchasePrice: number;
    sellingPrice: number;
    stock: Stock;
    reorderPoint?: number;
    description?: string;
    images: string[];
    compatibility: Compatibility[];
    featured?: boolean;
}

export interface DailySale {
    id: number;
    date: string;
    invoiceNumber: string;
    sellerName: string;
    sellerId: number;
    source: 'المحل' | 'أونلاين';
    productId: number;
    branchSoldFrom: Branch;
    itemType: string;
    direction: 'بيع' | 'مرتجع' | 'تبديل' | 'ضمان';
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    notes?: string;
}

export interface TreasuryTransaction {
    id: number;
    date: string;
    type: 'إيراد مبيعات' | 'مرتجع مبيعات' | 'مصروف' | 'راتب' | 'دفعة لمورد' | 'سلفة' | 'رصيد افتتاحي';
    description: string;
    amountIn: number;
    amountOut: number;
    relatedId?: number; // e.g., saleId, expenseId
}

export interface Employee {
    id: number;
    name: string;
    position: string;
    basicSalary: number;
    hireDate: string;
    phone: string;
    address: string;
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
    checkIn: string;
    checkOut: string;
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

export interface Payment {
    id: number;
    date: string;
    supplierId: number;
    payment: number;
    invoiceTotal: number;
    returnedItems?: string;
    notes?: string;
    purchaseOrderId?: number;
}

export interface Expense {
    id: number;
    date: string;
    type: 'شخصية' | 'عامة' | 'موظفين';
    name: string;
    amount: number;
    notes?: string;
}

export interface DailyReview {
    id: number;
    date: string;
    branch: Branch;
    salesCash: number;
    salesElectronic: number;
    salesParts?: number;
    salesAccessories?: number;
    drawerBalance: number;
    notes?: string;
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

export interface CartItem {
    product: Product;
    quantity: number;
}


export interface AppData {
    users: User[];
    products: Product[];
    dailySales: DailySale[];
    treasury: TreasuryTransaction[];
    employees: Employee[];
    advances: Advance[];
    attendance: Attendance[];
    payroll: Payroll[];
    suppliers: Supplier[];
    payments: Payment[];
    expenses: Expense[];
    dailyReview: DailyReview[];
    purchaseOrders: PurchaseOrder[];
    categories: { id: number; name: string; icon: string; description: string }[];
}
