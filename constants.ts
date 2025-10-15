import { AppData, Role, Section } from './types';

export const PERMISSIONS: Record<Role, Section[]> = {
    [Role.Admin]: Object.values(Section),
    [Role.BranchManager]: [
        Section.Dashboard,
        Section.DailySales,
        Section.Inventory,
        Section.Purchasing,
        Section.Employees,
        Section.Advances,
        Section.Attendance,
        Section.Payroll,
        Section.DailyReview,
        Section.Reports,
    ],
    [Role.Accountant]: [
        Section.Dashboard,
        Section.Treasury,
        Section.DailySales,
        Section.Purchasing,
        Section.Advances,
        Section.Payroll,
        Section.Suppliers,
        Section.Expenses,
        Section.DailyReview,
        Section.Reports,
    ],
    [Role.Seller]: [
        Section.Dashboard,
        Section.DailySales,
        Section.Inventory, // Allow sellers to view inventory
    ],
};

export const initialData: AppData = {
    users: [
        { id: 1, username: 'admin', password: '123', name: 'المدير العام', role: Role.Admin, branch: 'main', permissions: PERMISSIONS.admin, active: true, phone: '201030956097' },
        { id: 2, username: 'manager', password: '123', name: 'مدير فرع 1', role: Role.BranchManager, branch: 'branch1', permissions: PERMISSIONS.manager, active: true },
        { id: 3, username: 'accountant', password: '123', name: 'محاسب', role: Role.Accountant, branch: 'main', permissions: PERMISSIONS.accountant, active: true },
        { id: 4, username: 'seller', password: '123', name: 'باسم بائع', role: Role.Seller, branch: 'branch1', permissions: PERMISSIONS.seller, active: true },
    ],
    products: [
        { 
            id: 1, name: 'فلتر زيت Bosch لهيونداي النترا', sku: 'BOS-001', mainCategory: 'ميكانيكا', category: 'فلاتر', brand: 'Bosch', 
            purchasePrice: 150, sellingPrice: 250, 
            stock: { main: 50, branch1: 20, branch2: 15, branch3: 10 }, reorderPoint: 10, 
            images: ['https://i.ibb.co/LQr1f2h/oil-filter.png', 'https://i.ibb.co/6yJ4y1W/engine-parts.png'],
            description: "فلتر زيت عالي الجودة من بوش، مصمم خصيصًا لسيارات هيونداي النترا لضمان أفضل أداء وحماية للمحرك.",
            compatibility: [{ make: 'هيونداي', model: 'النترا', years: [2016, 2017, 2018, 2019, 2020] }],
            featured: true,
        },
        { 
            id: 2, name: 'تيل فرامل Brembo لتويوتا كورولا', sku: 'BRE-002', mainCategory: 'قطع غيار', category: 'فرامل', brand: 'Brembo', 
            purchasePrice: 400, sellingPrice: 650, 
            stock: { main: 30, branch1: 15, branch2: 10, branch3: 5 }, reorderPoint: 5, 
            images: ['https://i.ibb.co/yQxGdBc/brake-pads.png'],
            description: "تيل فرامل أمامي من بريمبو الإيطالية، يوفر أداء فرملة استثنائي وأمان مطلق لسيارات تويوتا كورولا.",
            compatibility: [{ make: 'تويوتا', model: 'كورولا', years: [2019, 2020, 2021, 2022] }],
            featured: true,
        },
        { 
            id: 3, name: 'طقم بوجيهات NGK لكيا سبورتاج', sku: 'NGK-003', mainCategory: 'ميكانيكا', category: 'كهرباء', brand: 'NGK', 
            purchasePrice: 80, sellingPrice: 150, 
            stock: { main: 100, branch1: 50, branch2: 30, branch3: 20 }, reorderPoint: 25, 
            images: ['https://i.ibb.co/JqjJzZv/spark-plug.png'],
            description: "طقم بوجيهات إيريديوم من NGK اليابانية، يعزز من كفاءة الاحتراق ويوفر في استهلاك الوقود.",
            compatibility: [{ make: 'كيا', model: 'سبورتاج', years: [2018, 2019, 2020] }],
            featured: true,
        },
        { 
            id: 4, name: 'مساعدين أمامي KYB لنيسان صني', sku: 'KYB-004', mainCategory: 'قطع غيار', category: 'عفشة', brand: 'KYB', 
            purchasePrice: 600, sellingPrice: 950, 
            stock: { main: 25, branch1: 10, branch2: 8, branch3: 4 }, reorderPoint: 8, 
            images: ['https://i.ibb.co/kH7cQy2/suspension.png'],
            description: "طقم مساعدين أمامي ياباني من KYB لراحة وثبات على الطريق لا مثيل لهما.",
            compatibility: [{ make: 'نيسان', model: 'صني', years: [2015, 2016, 2017, 2018] }],
            featured: false,
        },
        { 
            id: 5, name: 'فانوس شبورة LED', sku: 'LED-005', mainCategory: 'كماليات', category: 'إضاءة', brand: 'Generic', 
            purchasePrice: 220, sellingPrice: 350, 
            stock: { main: 40, branch1: 20, branch2: 20, branch3: 15 }, reorderPoint: 15, 
            images: ['https://i.ibb.co/D5Yv7gH/led-light.png'],
            description: "فانوس شبورة LED عالي السطوع، مناسب لمختلف أنواع السيارات لتحسين الرؤية في الظروف الصعبة.",
            compatibility: [],
            featured: false,
        },
    ],
    categories: [
        { id: 1, name: "قطع غيار", icon: "⚙️", description: "جميع قطع غيار الهيكل والعفشة" },
        { id: 2, name: "ميكانيكا", icon: "🔧", description: "أجزاء المحرك والكهرباء" },
        { id: 3, name: "كماليات", icon: "✨", description: "إكسسوارات وإضافات للسيارة" },
    ],
    dailySales: [],
    treasury: [
        { id: 1, date: new Date().toISOString().split('T')[0], type: 'رصيد افتتاحي', description: 'رصيد بداية الفترة', amountIn: 100000, amountOut: 0 },
    ],
    employees: [
        { id: 1, name: 'أحمد محمود', position: 'فني أول', basicSalary: 8000, hireDate: '2022-01-15', phone: '01012345678', address: 'القاهرة' },
        { id: 2, name: 'محمد علي', position: 'محاسب', basicSalary: 7500, hireDate: '2021-05-20', phone: '01112345678', address: 'الجيزة' },
    ],
    advances: [],
    attendance: [],
    payroll: [],
    suppliers: [
        { id: 1, name: 'الشركة المتحدة للتجارة', contact: '02-23456789', address: 'المنطقة الصناعية' },
        { id: 2, name: 'موردين بوش مصر', contact: '03-34567890', address: 'الإسكندرية' },
    ],
    payments: [],
    expenses: [],
    dailyReview: [],
    purchaseOrders: [],
};