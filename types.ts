
export enum Section {
    Dashboard = 'dashboard',
    Employees = 'employees',
    Advances = 'advances',
    Attendance = 'attendance',
    Payroll = 'payroll',
    Suppliers = 'suppliers',
    Expenses = 'expenses',
    DailyReview = 'daily-review',
    Reports = 'reports',
    DailySales = 'daily-sales',
}

export enum Role {
    Admin = 'admin',
    BranchManager = 'branchManager',
    Accountant = 'accountant',
    Seller = 'seller',
}

export const ROLES: Record<Role, string[]> = {
    [Role.Admin]: ['*'],
    [Role.BranchManager]: [Section.Dashboard, Section.DailySales, Section.DailyReview, Section.Reports],
    [Role.Accountant]: [Section.Dashboard, Section.Employees, Section.Advances, Section.Attendance, Section.Payroll, Section.Expenses, Section.Reports],
    [Role.Seller]: [Section.Dashboard, Section.DailySales],
};

export interface User {
    id: number;
    username: string;
    password?: string;
    name: string;
    role: Role;
    branch: string | null;
    active: boolean;
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
    branch: string;
    salesCash: number;
    salesElectronic: number;
    salesParts: number;
    salesAccessories: number;
    drawerBalance: number;
    notes?: string;
}

export interface DailySale {
    id: number;
    date: string;
    invoiceNumber: string;
    sellerId: number;
    sellerName: string;
    source: 'المحل' | 'أونلاين' | 'تلفون' | 'زيارة' | 'معرض';
    itemName: string;
    itemType: 'قطع غيار أصلية' | 'قطع غيار تجارية' | 'زيوت وشحوم' | 'إطارات' | 'بطاريات' | 'إكسسوارات' | 'أدوات' | 'أخرى';
    direction: 'بيع' | 'مرتجع' | 'تبديل' | 'ضمان';
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    notes?: string;
}

export interface AppData {
    employees: Employee[];
    advances: Advance[];
    attendance: Attendance[];
    payroll: Payroll[];
    suppliers: Supplier[];
    payments: Payment[];
    expenses: Expense[];
    dailyReview: DailyReview[];
    dailySales: DailySale[];
    users: User[];
}
