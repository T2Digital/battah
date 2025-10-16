import { AppData, Role, Section } from '../types';

export const initialData: AppData = {
    users: [
        { id: 1, username: 'admin@battah.com', name: 'المدير العام', role: Role.Admin, branch: 'main', permissions: [] },
        { id: 2, username: 'manager@battah.com', name: 'مدير فرع 1', role: Role.BranchManager, branch: 'branch1', permissions: [Section.Dashboard, Section.DailySales, Section.StoreManagement] },
        { id: 3, username: 'seller@battah.com', name: 'بائع فرع 1', role: Role.Seller, branch: 'branch1', permissions: [Section.DailySales] },
        { id: 4, username: 'accountant@battah.com', name: 'محاسب', role: Role.Accountant, branch: 'main', permissions: [Section.Treasury, Section.Expenses, Section.Suppliers, Section.Payroll] },
    ],
    employees: [
        { id: 1, name: 'أحمد محمود', position: 'مدير عام', basicSalary: 12000, hireDate: '2022-01-15', phone: '01012345678', address: 'القاهرة' },
        { id: 2, name: 'محمد علي', position: 'مدير فرع', basicSalary: 8000, hireDate: '2022-05-20', phone: '01112345678', address: 'الجيزة' },
        { id: 3, name: 'سارة حسين', position: 'محاسب', basicSalary: 7500, hireDate: '2023-02-10', phone: '01212345678', address: 'القاهرة' },
        { id: 4, name: 'كريم فتحي', position: 'فني', basicSalary: 5000, hireDate: '2023-08-01', phone: '01512345678', address: 'القليوبية' },
    ],
    products: [
      { id: 1, name: 'فلتر زيت Bosch', sku: 'BOS-001', mainCategory: 'قطع غيار', category: 'فلاتر', brand: 'Bosch', purchasePrice: 150, sellingPrice: 220, stock: { main: 50, branch1: 20, branch2: 15, branch3: 10 }, reorderPoint: 10, description: 'فلتر زيت عالي الجودة من بوش، يضمن أفضل أداء للمحرك.', images: ['https://i.ibb.co/L5BKn1g/oil-filter.jpg'], compatibility: ['Toyota Corolla 2020'] },
      { id: 2, name: 'تيل فرامل Brembo أمامي', sku: 'BRE-F01', mainCategory: 'قطع غيار', category: 'تيل فرامل', brand: 'Brembo', purchasePrice: 800, sellingPrice: 1150, stock: { main: 30, branch1: 10, branch2: 8, branch3: 5 }, reorderPoint: 5, description: 'تيل فرامل أمامي من بريمبو، يوفر قوة فرملة فائقة وأمان.', images: ['https://i.ibb.co/5hTRXmm/brake-pads.jpg'], compatibility: ['Hyundai Elantra AD 2018'] },
      { id: 3, name: 'بوجيهات NGK ليزر إيريديوم', sku: 'NGK-L03', mainCategory: 'قطع غيار', category: 'بوجيهات', brand: 'NGK', purchasePrice: 180, sellingPrice: 250, stock: { main: 100, branch1: 40, branch2: 30, branch3: 20 }, reorderPoint: 25, description: 'بوجيهات ليزر إيريديوم من NGK لأداء مثالي وعمر افتراضي طويل.', images: ['https://i.ibb.co/1qgZ2kX/spark-plug.jpg'] },
      { id: 4, name: 'بطارية Varta Blue Dynamic', sku: 'VAR-B05', mainCategory: 'بطاريات', category: 'بطاريات جافة', brand: 'Varta', purchasePrice: 1800, sellingPrice: 2300, stock: { main: 20, branch1: 8, branch2: 5, branch3: 4 }, reorderPoint: 4, description: 'بطارية فارتا الزرقاء، طاقة موثوقة وقوة تشغيل عالية.', images: ['https://i.ibb.co/kHbzBw0/battery.jpg'] },
      { id: 5, name: 'زيت محرك Mobil 1 5W-30', sku: 'MOB-530', mainCategory: 'زيوت وشحومات', category: 'زيت محرك', brand: 'Mobil', purchasePrice: 900, sellingPrice: 1200, stock: { main: 40, branch1: 15, branch2: 12, branch3: 10 }, reorderPoint: 10, description: 'زيت محرك تخليقي بالكامل من موبيل 1 لأقصى حماية للمحرك.', images: ['https://i.ibb.co/dKxYVvW/engine-oil.jpg'] },
      { id: 6, name: 'إطار Hankook Ventus S1', sku: 'HAN-S1', mainCategory: 'إطارات', category: 'إطارات صيفي', brand: 'Hankook', purchasePrice: 2200, sellingPrice: 2800, stock: { main: 16, branch1: 4, branch2: 4, branch3: 2 }, reorderPoint: 4, description: 'إطار هانكوك فينتوس S1، أداء رياضي وثبات على الطرق الجافة والمبتلة.', images: ['https://i.ibb.co/3cqC8wT/tire.jpg'] },
      { id: 7, name: 'مساعدين أمامي Sachs', sku: 'SAC-F02', mainCategory: 'قطع غيار', category: 'مساعدين', brand: 'Sachs', purchasePrice: 1300, sellingPrice: 1750, stock: { main: 25, branch1: 10, branch2: 7, branch3: 5 }, reorderPoint: 5, description: 'طقم مساعدين أمامي من ساكس الألمانية لتوفير أعلى درجات الراحة والثبات.', images: ['https://i.ibb.co/9G3tGvT/shocks.jpg'] },
      { id: 8, name: 'معطر جو Little Trees', sku: 'ACC-001', mainCategory: 'كماليات', category: 'معطرات', brand: 'Little Trees', purchasePrice: 20, sellingPrice: 35, stock: { main: 200, branch1: 100, branch2: 80, branch3: 70 }, reorderPoint: 50, description: 'معطر جو برائحة الفانيليا المنعشة.', images: ['https://i.ibb.co/YyY1qgt/air-freshener.jpg'] },
    ],
    dailySales: [],
    suppliers: [
        { id: 1, name: 'الشركة المتحدة للتجارة', contact: '01098765432', address: 'المنطقة الصناعية، القاهرة' },
        { id: 2, name: 'موزعين بوش المعتمدين', contact: '01198765432', address: 'مدينة نصر، القاهرة' },
    ],
    purchaseOrders: [],
    payments: [],
    advances: [],
    attendance: [],
    payroll: [],
    expenses: [],
    treasury: [],
    dailyReview: [],
    orders: [],
    notifications: [],
    storefrontSettings: {
        featuredProductIds: [2, 4, 5],
        newArrivalProductIds: [7, 8],
    }
};
