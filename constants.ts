
import { AppData, Role } from './types';

export const initialData: AppData = {
    users: [
        { id: 1, username: 'admin', password: '123', name: 'المدير العام', role: Role.Admin, branch: null, active: true },
        { id: 2, username: 'manager', password: '123', name: 'مدير فرع القاهرة', role: Role.BranchManager, branch: 'القاهرة', active: true },
        { id: 3, username: 'accountant', password: '123', name: 'محاسب رئيسي', role: Role.Accountant, branch: null, active: true },
        { id: 4, username: 'seller', password: '123', name: 'باسم بائع', role: Role.Seller, branch: 'القاهرة', active: true }
    ],
    employees: [
        { id: 1, name: "أحمد محمد علي", position: "مدير عام", basicSalary: 12000, hireDate: "2023-01-15", phone: "01012345678", address: "القاهرة، مصر الجديدة" },
        { id: 2, name: "فاطمة أحمد حسن", position: "محاسب رئيسي", basicSalary: 8000, hireDate: "2023-03-10", phone: "01087654321", address: "الجيزة، المهندسين" },
        { id: 3, name: "محمد علي حسين", position: "فني أول", basicSalary: 6000, hireDate: "2023-06-20", phone: "01123456789", address: "القاهرة، شبرا" },
        { id: 4, name: "سارة محمود أحمد", position: "أمين مخزن", basicSalary: 5500, hireDate: "2023-08-05", phone: "01098765432", address: "الجيزة، الدقي" },
        { id: 5, name: "عمر حسام الدين", position: "فني", basicSalary: 4500, hireDate: "2024-01-12", phone: "01156789012", address: "القاهرة، عين شمس" }
    ],
    advances: [
        { id: 1, date: "2024-07-15", employeeId: 1, amount: 3000, payment: 1500, notes: "سلفة لظروف طارئة - العلاج" },
        { id: 2, date: "2024-07-10", employeeId: 3, amount: 2000, payment: 800, notes: "سلفة شهرية - مصاريف شخصية" },
    ],
    attendance: [
        { id: 1, date: "2024-07-22", employeeId: 1, checkIn: "08:00", checkOut: "17:00", notes: "يوم عادي" },
        { id: 2, date: "2024-07-22", employeeId: 2, checkIn: "08:30", checkOut: "17:30", notes: "تأخير بسيط - زحمة" },
    ],
    payroll: [
        { id: 1, date: "2024-07-01", employeeId: 1, basicSalary: 12000, disbursed: 10500, notes: "راتب يوليو 2024 - خصم سلفة" },
        { id: 2, date: "2024-07-01", employeeId: 2, basicSalary: 8000, disbursed: 7500, notes: "راتب يوليو 2024 - خصم تأمينات" },
    ],
    suppliers: [
        { id: 1, name: "شركة قطع الغيار المتحدة", contact: "01012345678", address: "القاهرة، العتبة" },
        { id: 2, name: "مؤسسة الأجزاء الحديثة", contact: "01087654321", address: "الجيزة، الهرم" },
    ],
    payments: [
        { id: 1, date: "2024-07-20", supplierId: 1, payment: 25000, invoiceTotal: 30000, returnedItems: "مرشح زيت معيب × 5", notes: "دفعة جزئية" },
        { id: 2, date: "2024-07-18", supplierId: 2, payment: 15000, invoiceTotal: 15000, returnedItems: "", notes: "دفعة كاملة" },
    ],
    expenses: [
        { id: 1, date: "2024-07-22", type: "شخصية", name: "وجبات غداء الموظفين", amount: 450, notes: "وجبات يوم الاثنين" },
        { id: 2, date: "2024-07-21", type: "عامة", name: "فاتورة كهرباء", amount: 2800, notes: "فاتورة شهر يونيو" },
    ],
    dailyReview: [
        { id: 1, date: "2024-07-22", branch: "مركز الصيانة", salesCash: 8500, salesElectronic: 4200, salesParts: 6800, salesAccessories: 3400, drawerBalance: 12700, notes: "يوم نشط" },
        { id: 2, date: "2024-07-22", branch: "الأصلي", salesCash: 12000, salesElectronic: 6500, salesParts: 9200, salesAccessories: 4800, drawerBalance: 18500, notes: "يوم ممتاز" },
    ],
    dailySales: [
        { id: 1, date: "2024-07-23", invoiceNumber: "20240723001", sellerId: 4, sellerName: "باسم بائع", source: "المحل", itemName: "فلتر زيت تويوتا كامري", itemType: "قطع غيار أصلية", direction: "بيع", quantity: 2, unitPrice: 150, totalAmount: 300, notes: "العميل استلم" },
        { id: 2, date: "2024-07-23", invoiceNumber: "20240723002", sellerId: 4, sellerName: "باسم بائع", source: "تلفون", itemName: "بطارية 70 أمبير", itemType: "بطاريات", direction: "بيع", quantity: 1, unitPrice: 1200, totalAmount: 1200, notes: "توصيل للمنزل" }
    ],
};
