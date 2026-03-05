import { create } from 'zustand';
import { initializeApp } from 'firebase/app';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    getAuth,
    signInAnonymously,
} from 'firebase/auth';
import {
    collection,
    doc,
    writeBatch,
    setDoc,
    getDoc,
    updateDoc,
    Timestamp,
    deleteDoc,
    onSnapshot,
    Unsubscribe,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';
import { 
    AppData, 
    User, 
    Product, 
    DailySale,
    Employee,
    Advance,
    Attendance,
    Payroll,
    Supplier,
    PurchaseOrder,
    Payment,
    Expense,
    TreasuryTransaction,
    DailyReview,
    OrderItem,
    Order,
    StorefrontSettings,
    Notification,
    Role,
    SaleItem,
    StockTransfer,
    DiscountCode,
    Toast,
    Branch,
    Settings
} from '../types';
import { initialData } from './initialData';
import { formatCurrency, normalizeSaleItems } from './utils';

let publicUnsubscribers: Unsubscribe[] = [];
let adminUnsubscribers: Unsubscribe[] = [];

type AppState = {
    currentUser: User | null;
    isInitialized: boolean; // For admin data
    isPublicInitialized: boolean; // For public data
    isLoading: boolean;
    isSeeded: boolean;
    appData: AppData | null;
};

type AppActions = {
    initPublicListeners: () => Promise<void>;
    initAdminListeners: () => Promise<void>;
    clearAdminListeners: () => void;
    checkIfSeeded: () => Promise<void>;
    seedDatabase: () => Promise<void>;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    setCurrentUser: (user: User) => void;
    setCurrentUserByEmail: (email: string) => Promise<void>;
    clearCurrentUser: () => void;
    addToast: (message: string, type?: Toast['type']) => void;
    removeToast: (toastId: number) => void;
    
    // Actions to modify appData subsets
    setProducts: (products: Product[]) => Promise<void>;
    deleteProduct: (productId: number) => Promise<void>;
    
    // Employee Actions (Atomic)
    addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
    updateEmployee: (employeeId: number, updates: Partial<Employee>) => Promise<void>;
    deleteEmployee: (employeeId: number) => Promise<void>;

    addAdvance: (advance: Omit<Advance, 'id'>) => Promise<void>;
    updateAdvance: (advanceId: number, updates: Partial<Advance>) => Promise<void>;
    deleteAdvance: (advanceId: number) => Promise<void>;
    setAttendance: (attendance: Attendance[]) => Promise<void>;
    addPayroll: (payroll: Omit<Payroll, 'id'>) => Promise<void>;
    // Fix: 'PayrollType' is not defined in this scope. The correct type is 'Payroll'.
    updatePayroll: (payrollId: number, updates: Partial<Payroll>) => Promise<void>;
    deletePayroll: (payrollId: number) => Promise<void>;

    // Supplier Actions (Atomic)
    addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
    updateSupplier: (supplierId: number, updates: Partial<Supplier>) => Promise<void>;
    deleteSupplier: (supplierId: number) => Promise<void>;

    addPurchaseOrder: (order: Omit<PurchaseOrder, 'id'>) => Promise<void>;
    updatePurchaseOrder: (orderId: number, updates: Partial<PurchaseOrder>) => Promise<void>;
    deletePurchaseOrder: (orderId: number) => Promise<void>;
    addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
    updatePayment: (paymentId: number, updates: Partial<Payment>) => Promise<void>;
    deletePayment: (paymentId: number) => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (expenseId: number, updates: Partial<Expense>) => Promise<void>;
    deleteExpense: (expenseId: number) => Promise<void>;
    setDailyReviews: (reviews: DailyReview[]) => Promise<void>;
    deleteDailyReview: (reviewId: number) => Promise<void>;
    addTreasuryTransaction: (transaction: Omit<TreasuryTransaction, 'id'>) => Promise<void>;
    
    // Sales action (no longer a simple set, but an atomic add)
    addDailySale: (sale: Omit<DailySale, 'id'>) => Promise<DailySale>;
    updateDailySale: (saleId: number | string, updates: Partial<DailySale>) => Promise<void>;
    deleteDailySale: (saleId: number | string) => Promise<void>;

    // Inventory Actions
    addStockTransfer: (transfer: Omit<StockTransfer, 'id' | 'productName'>) => Promise<void>;


    // Storefront Actions
    createOrder: (customerDetails: { name: string; phone: string; address: string }, items: OrderItem[], totalAmount: number, paymentMethod: Order['paymentMethod'], paymentProof?: File, discountCode?: string) => Promise<string | undefined>;
    updateOrderStatus: (orderId: number | string, status: Order['status']) => Promise<void>;
    deleteOrder: (orderId: number | string) => Promise<void>;
    updateStorefrontSettings: (settings: StorefrontSettings) => Promise<void>;
    uploadImage: (file: File, path: string) => Promise<string>;
    markNotificationAsRead: (notificationId: string) => Promise<void>;
    addDiscountCode: (code: Omit<DiscountCode, 'id'>) => Promise<void>;
    updateDiscountCode: (codeId: string, updates: Partial<DiscountCode>) => Promise<void>;
    deleteDiscountCode: (codeId: string) => Promise<void>;
    addAttendanceRecord: (record: Attendance) => Promise<void>;
    updateAttendanceRecord: (id: number, updates: Partial<Attendance>) => Promise<void>;
    createUser: (email: string, pass: string, role: Role, branch: Branch, name: string) => Promise<void>;
    updateSettings: (settings: Partial<Settings>) => Promise<void>;
    sendBroadcast: (message: string) => Promise<void>;
};

const useStore = create<AppState & AppActions>((set, get) => ({
    currentUser: null,
    isInitialized: false,
    isPublicInitialized: false,
    isLoading: false,
    isSeeded: true, 
    appData: {
        users: [], products: [], dailySales: [], employees: [], advances: [],
        attendance: [], payroll: [], suppliers: [], purchaseOrders: [],
        payments: [], expenses: [], treasury: [], dailyReview: [],
        orders: [], notifications: [], broadcasts: [], stockTransfers: [], discountCodes: [],
        storefrontSettings: { featuredProductIds: [], newArrivalProductIds: [] },
        toasts: [],
        settings: {
            enableIPRestriction: false,
            enableTimeRestriction: false,
            workStartTime: "09:00",
            workEndTime: "23:00"
        }
    },
    addToast: (message: string, type: Toast['type'] = 'info') => {
        set(state => {
            const newToast: Toast = { id: Date.now(), message, type };
            const appData = state.appData ? { ...state.appData, toasts: [...state.appData.toasts, newToast] } : state.appData;
            return { appData };
        });
    },
    removeToast: (toastId) => {
        set(state => {
            const appData = state.appData ? { ...state.appData, toasts: state.appData.toasts.filter(t => t.id !== toastId) } : state.appData;
            return { appData };
        });
    },
    initPublicListeners: async () => {
        if (get().isPublicInitialized) return;
        set({ isLoading: true });
    
        try {
            publicUnsubscribers.forEach(unsub => unsub());
            publicUnsubscribers = [];
        
            const publicCollections: (keyof AppData)[] = ['products', 'discountCodes', 'broadcasts'];

            publicCollections.forEach(name => {
                const unsub = onSnapshot(collection(db, name as string), (snapshot) => {
                    const data = snapshot.docs.map(d => ({ ...d.data(), id: d.data().id ?? (isNaN(parseInt(d.id, 10)) ? d.id : parseInt(d.id, 10)) }));
                    
                    if (name === 'broadcasts') {
                        // Sort broadcasts by date descending
                        (data as any[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    }

                    set(state => ({
                        appData: { ...(state.appData as AppData), [name]: data }
                    }));
                });
                publicUnsubscribers.push(unsub);
            });
            
            const settingsUnsub = onSnapshot(doc(db, "settings", "storefront"), (doc) => {
                 const storefrontSettings = doc.exists() ? doc.data() as StorefrontSettings : { featuredProductIds: [], newArrivalProductIds: [] };
                 set(state => ({
                    appData: { ...(state.appData as AppData), storefrontSettings }
                }));
            });
            publicUnsubscribers.push(settingsUnsub);

            const generalSettingsUnsub = onSnapshot(doc(db, "settings", "general"), (doc) => {
                 const settings = doc.exists() ? doc.data() as Settings : {
                    enableIPRestriction: false,
                    enableTimeRestriction: false,
                    workStartTime: "09:00",
                    workEndTime: "23:00"
                 };
                 set(state => ({
                    appData: { ...(state.appData as AppData), settings }
                }));
            });
            publicUnsubscribers.push(generalSettingsUnsub);

        } catch (error) {
            console.error("Failed to initialize public listeners:", error);
        } finally {
            set({ isPublicInitialized: true, isLoading: false });
        }
    },

    initAdminListeners: async () => {
        if (get().isInitialized || !get().currentUser) return;
        set({ isLoading: true });
    
        try {
            get().clearAdminListeners();
    
            // --- SECTION 1: One-time fetches and Reconciliation for missed notifications ---
    
            // Fetch users once to avoid permission issues with listeners
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const usersData = usersSnapshot.docs.map(d => ({ ...(d.data() as User), id: d.data().id ?? d.id }));
            set(state => ({ appData: { ...(state.appData as AppData), users: usersData } }));
            
            // Fetch all orders and notifications once to find any orders that were placed while admin was offline
            const [ordersSnapshot, notificationsSnapshot] = await Promise.all([
                getDocs(collection(db, 'orders')),
                getDocs(collection(db, 'notifications'))
            ]);
            
            const initialOrders = ordersSnapshot.docs.map(d => ({ ...(d.data() as Order), id: d.id }));
            const initialNotifications = notificationsSnapshot.docs.map(d => ({ ...(d.data() as Notification), id: d.id }));
    
            const notifiedOrderIds = new Set(initialNotifications.map(n => n.orderId));
            const ordersToNotify = initialOrders.filter(order => order.id && !notifiedOrderIds.has(order.id));
    
            if (ordersToNotify.length > 0) {
                const batch = writeBatch(db);
                ordersToNotify.forEach(order => {
                    const newNotificationData: Omit<Notification, 'id'> = {
                        date: order.date, // Use the order's date for accuracy
                        message: `طلب جديد من ${order.customerName} بقيمة ${formatCurrency(order.totalAmount)}`,
                        read: false,
                        orderId: order.id,
                    };
                    const notificationRef = doc(collection(db, "notifications"));
                    batch.set(notificationRef, { ...newNotificationData, id: notificationRef.id });
                });
                await batch.commit();
                get().addToast(`تم العثور على ${ordersToNotify.length} طلبات جديدة.`, 'info');
            }
    
            // --- SECTION 2: Live Listeners for Real-time Updates ---
    
            const settingsUnsub = onSnapshot(doc(db, "settings", "general"), (doc) => {
                 const settings = doc.exists() ? doc.data() as Settings : {
                    enableIPRestriction: false,
                    enableTimeRestriction: false,
                    workStartTime: "09:00",
                    workEndTime: "23:00"
                 };
                 set(state => ({
                    appData: { ...(state.appData as AppData), settings }
                }));
            });
            adminUnsubscribers.push(settingsUnsub);

            const collectionsToListen: (keyof AppData)[] = [
                // 'users' is already fetched. No need for a listener that might fail.
                'dailySales', 'employees', 'advances', 'attendance', 'payroll', 'suppliers', 
                'purchaseOrders', 'payments', 'expenses', 'treasury', 'dailyReview', 
                'notifications', 'stockTransfers', 'orders', 'broadcasts'
            ];
    
            collectionsToListen.forEach(name => {
                const unsub = onSnapshot(collection(db, name as string), (snapshot) => {
                    const data = snapshot.docs.map(d => {
                        const docData = d.data();
                        const id = docData.id ?? d.id; // Prefer self-managed ID, fallback to Firestore's doc ID
                        return { ...docData, id };
                    });
                    
                    if (name === 'notifications') {
                        // Sort notifications by date/createdAt descending
                        (data as any[]).sort((a, b) => {
                            const dateA = a.createdAt ? (a.createdAt.seconds ? a.createdAt.seconds * 1000 : a.createdAt) : new Date(a.date).getTime();
                            const dateB = b.createdAt ? (b.createdAt.seconds ? b.createdAt.seconds * 1000 : b.createdAt) : new Date(b.date).getTime();
                            return dateB - dateA;
                        });
                    }
                    
                    set(state => ({ appData: { ...(state.appData as AppData), [name]: data } }));
                }, (error) => {
                    console.error(`Error listening to ${name}:`, error);
                    if (error.code === 'permission-denied') {
                        get().addToast(`خطأ في الصلاحيات عند تحميل بيانات: ${name}`, 'error');
                    }
                });
                adminUnsubscribers.push(unsub);
            });
    
        } catch (error) {
            console.error("Failed to initialize admin listeners:", error);
            get().addToast('فشل تحميل بيانات النظام.', 'error');
        } finally {
            set({ isInitialized: true, isLoading: false });
        }
    },
    
    clearAdminListeners: () => {
        adminUnsubscribers.forEach(unsub => unsub());
        adminUnsubscribers = [];
        set({ isInitialized: false });
    },

    checkIfSeeded: async () => {
        const docRef = doc(db, "settings", "seeded");
        const docSnap = await getDoc(docRef);
        set({ isSeeded: docSnap.exists() });
    },
    seedDatabase: async () => {
        const batch = writeBatch(db);
        Object.entries(initialData).forEach(([collectionName, data]) => {
            if(collectionName === 'storefrontSettings') {
                const docRef = doc(db, "settings", "storefront");
                batch.set(docRef, data);
            } else if (collectionName !== 'stockTransfers' && collectionName !== 'discountCodes' && collectionName !== 'toasts') { 
                 (data as any[]).forEach((item: any) => {
                    const docRef = doc(db, collectionName, String(item.id));
                    batch.set(docRef, item);
                });
            }
        });
        const seededRef = doc(db, "settings", "seeded");
        batch.set(seededRef, { seededOn: Timestamp.now() });
        await batch.commit();
        set({ isSeeded: true });
    },
    login: async (email, pass) => {
        await signInWithEmailAndPassword(auth, email, pass);
    },
    logout: async () => {
        const user = get().currentUser;
        if (user) {
            // Record Check-out
            const today = new Date().toISOString().split('T')[0];
            
            const employeesSnapshot = await getDocs(collection(db, "employees"));
            const employees = employeesSnapshot.docs.map(d => ({ ...d.data(), id: Number(d.id) } as Employee));
            const employee = employees.find(e => e.email === user.username || e.name === user.name);

            if (employee) {
                const attendanceQuery = query(collection(db, "attendance"), where("date", "==", today), where("employeeId", "==", employee.id));
                const attendanceSnapshot = await getDocs(attendanceQuery);
                if (!attendanceSnapshot.empty) {
                    const docRef = attendanceSnapshot.docs[0].ref;
                    await updateDoc(docRef, { checkOut: new Date().toLocaleTimeString('en-US', { hour12: false }) });
                }
            }
        }
        await signOut(auth);
    },
    setCurrentUser: (user) => set({ currentUser: user }),
    setCurrentUserByEmail: async (email) => {
        try {
            const q = query(collection(db, "users"), where("username", "==", email.toLowerCase()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const remoteUser = userDoc.data() as User;
                set({ currentUser: remoteUser });

                // Record Check-in
                const today = new Date().toISOString().split('T')[0];
                const employeesSnapshot = await getDocs(collection(db, "employees"));
                const employees = employeesSnapshot.docs.map(d => ({ ...d.data(), id: Number(d.id) } as Employee));
                const employee = employees.find(e => e.email === email || e.name === remoteUser.name);

                if (employee) {
                    const attendanceQuery = query(collection(db, "attendance"), where("date", "==", today), where("employeeId", "==", employee.id));
                    const attendanceSnapshot = await getDocs(attendanceQuery);
                    
                    if (attendanceSnapshot.empty) {
                        // Create new attendance record
                        // Get max ID first (need to query all attendance or just use a random ID/timestamp based ID for simplicity, but existing logic uses numeric IDs)
                        // To be safe with numeric IDs, I should fetch all attendance or use a counter.
                        // Since I don't have appData loaded yet, I'll fetch all attendance IDs? That's heavy.
                        // I'll use a timestamp-based ID for now or fetch max ID from a settings doc if I had one.
                        // Or just fetch all attendance docs (might be large).
                        // Let's fetch all attendance docs to find max ID. It's not ideal but consistent with current app logic.
                        const allAttendanceSnapshot = await getDocs(collection(db, "attendance"));
                        const maxId = Math.max(0, ...allAttendanceSnapshot.docs.map(d => Number(d.id) || 0));
                        
                        const newRecord: Attendance = {
                            id: maxId + 1,
                            date: today,
                            employeeId: employee.id,
                            checkIn: new Date().toLocaleTimeString('en-US', { hour12: false }),
                        };
                        await setDoc(doc(db, "attendance", String(newRecord.id)), newRecord);
                    }
                }

            } else {
                console.warn(`User profile not found in DB for email: ${email}. Logging out.`);
                await get().logout();
            }
        } catch (error) {
            console.error("Error fetching user profile from DB:", error);
            await get().logout();
        }
    },
    clearCurrentUser: () => set({ currentUser: null }),
    
    setProducts: async (products) => {
        const batch = writeBatch(db);
        products.forEach(p => {
            const docRef = doc(db, "products", String(p.id));
            batch.set(docRef, p);
        });
        await batch.commit();
    },
    deleteProduct: async (productId: number) => {
        try {
            await deleteDoc(doc(db, "products", String(productId)));
        } catch (error) {
            console.error("Error deleting product:", error);
            throw error;
        }
    },

    addDailySale: async (sale) => {
        const maxId = Math.max(0, ...(get().appData?.dailySales.map(s => Number(s.id) || 0) || []));
        const newSale = { ...sale, id: maxId + 1 };
        await setDoc(doc(db, "dailySales", String(newSale.id)), newSale);
        return newSale as DailySale;
    },
    updateDailySale: async (saleId, updates) => {
        await updateDoc(doc(db, "dailySales", String(saleId)), updates);
    },
    deleteDailySale: async (saleId: number | string) => {
        try {
            const saleDocRef = doc(db, "dailySales", String(saleId));
            const saleSnapshot = await getDoc(saleDocRef);
            if (!saleSnapshot.exists()) throw new Error("Sale not found!");
            const saleToDelete = saleSnapshot.data() as DailySale;

            const batch = writeBatch(db);
            batch.delete(saleDocRef);

            const treasuryQuery = query(collection(db, "treasury"), where("relatedId", "==", saleId), where("type", "in", ["إيراد مبيعات", "مرتجع مبيعات"]));
            const treasurySnapshot = await getDocs(treasuryQuery);
            treasurySnapshot.forEach(doc => batch.delete(doc.ref));

            const items = normalizeSaleItems(saleToDelete);
            for (const item of items) {
                const productRef = doc(db, "products", String(item.productId));
                const productDoc = await getDoc(productRef);
                if (productDoc.exists()) {
                    const product = productDoc.data() as Product;
                    const quantityToRestore = saleToDelete.direction === 'بيع' ? item.quantity : -item.quantity;
                    const newStock = { ...product.stock, [saleToDelete.branchSoldFrom]: product.stock[saleToDelete.branchSoldFrom] + quantityToRestore };
                    batch.update(productRef, { stock: newStock });
                }
            }
            await batch.commit();
        } catch (error) {
            console.error("Error deleting daily sale:", error);
            throw error;
        }
    },
    
    addEmployee: async (employee) => {
        const maxId = Math.max(0, ...(get().appData?.employees.map(e => Number(e.id) || 0) || []));
        const newEmployee = { ...employee, id: maxId + 1 };
        await setDoc(doc(db, "employees", String(newEmployee.id)), newEmployee);
    },
    updateEmployee: async (employeeId, updates) => {
        await updateDoc(doc(db, "employees", String(employeeId)), updates);
    },
    deleteEmployee: async (employeeId) => {
        try {
             await deleteDoc(doc(db, "employees", String(employeeId)));
        } catch(error) {
            console.error("Error deleting employee:", error);
            throw error;
        }
    },
    addAdvance: async (advance) => {
        const maxId = Math.max(0, ...(get().appData?.advances.map(a => Number(a.id) || 0) || []));
        const newAdvance = { ...advance, id: maxId + 1 };
        await setDoc(doc(db, "advances", String(newAdvance.id)), newAdvance);
        if (newAdvance.amount > 0) {
            const employeeName = get().appData?.employees.find(e => e.id === newAdvance.employeeId)?.name || 'موظف';
            await get().addTreasuryTransaction({
                date: newAdvance.date, type: 'سلفة', description: `سلفة لـ ${employeeName}`,
                amountIn: 0, amountOut: newAdvance.amount, relatedId: newAdvance.id
            });
        }
    },
    updateAdvance: async (advanceId, updates) => {
        await updateDoc(doc(db, "advances", String(advanceId)), updates);
    },
    deleteAdvance: async (advanceId) => {
        try {
            await deleteDoc(doc(db, "advances", String(advanceId)));
        } catch(error) {
            console.error("Error deleting advance:", error);
            throw error;
        }
    },
    setAttendance: async (attendance) => {
        const batch = writeBatch(db);
        attendance.forEach(a => batch.set(doc(db, "attendance", String(a.id)), a));
        await batch.commit();
    },
    addPayroll: async (payroll) => {
        const maxId = Math.max(0, ...(get().appData?.payroll.map(p => Number(p.id) || 0) || []));
        const newPayroll = { ...payroll, id: maxId + 1 };
        await setDoc(doc(db, "payroll", String(newPayroll.id)), newPayroll);
        if (newPayroll.disbursed > 0) {
            const employeeName = get().appData?.employees.find(e => e.id === newPayroll.employeeId)?.name || 'موظف';
            await get().addTreasuryTransaction({
                date: newPayroll.date, type: 'راتب', description: `راتب لـ ${employeeName}`,
                amountIn: 0, amountOut: newPayroll.disbursed, relatedId: newPayroll.id
            });
        }
    },
    updatePayroll: async (payrollId, updates) => {
        await updateDoc(doc(db, "payroll", String(payrollId)), updates);
    },
    deletePayroll: async (payrollId) => {
        try {
            await deleteDoc(doc(db, "payroll", String(payrollId)));
        } catch(error) {
            console.error("Error deleting payroll:", error);
            throw error;
        }
    },
    
    addSupplier: async (supplier) => {
        const maxId = Math.max(0, ...(get().appData?.suppliers.map(s => Number(s.id) || 0) || []));
        const newSupplier = { ...supplier, id: maxId + 1 };
        await setDoc(doc(db, "suppliers", String(newSupplier.id)), newSupplier);
    },
    updateSupplier: async (supplierId, updates) => {
        await updateDoc(doc(db, "suppliers", String(supplierId)), updates);
    },
    deleteSupplier: async (supplierId) => {
        try {
            const paymentsToDelete = get().appData?.payments.filter(p => p.supplierId === supplierId) || [];
            const batch = writeBatch(db);
            batch.delete(doc(db, "suppliers", String(supplierId)));
            paymentsToDelete.forEach(payment => batch.delete(doc(db, "payments", String(payment.id))));
            await batch.commit();
        } catch (error) {
            console.error("Error deleting supplier:", error);
            throw error;
        }
    },
    addPurchaseOrder: async (order) => {
        const maxId = Math.max(0, ...(get().appData?.purchaseOrders.map(o => Number(o.id) || 0) || []));
        const newOrder = { ...order, id: maxId + 1 };
        await setDoc(doc(db, "purchaseOrders", String(newOrder.id)), newOrder);
    },
    updatePurchaseOrder: async (orderId, updates) => {
        await updateDoc(doc(db, "purchaseOrders", String(orderId)), updates);
    },
    deletePurchaseOrder: async (orderId) => {
        try {
            await deleteDoc(doc(db, "purchaseOrders", String(orderId)));
        } catch(error) {
            console.error("Error deleting purchase order:", error);
            throw error;
        }
    },
    addPayment: async (payment) => {
        const maxId = Math.max(0, ...(get().appData?.payments.map(p => Number(p.id) || 0) || []));
        const newPayment = { ...payment, id: maxId + 1 };
        await setDoc(doc(db, "payments", String(newPayment.id)), newPayment);
        if (newPayment.payment > 0) {
            const supplierName = get().appData?.suppliers.find(s => s.id === newPayment.supplierId)?.name || 'مورد';
            await get().addTreasuryTransaction({
                date: newPayment.date, type: 'دفعة لمورد', description: `دفعة لـ ${supplierName}`,
                amountIn: 0, amountOut: newPayment.payment, relatedId: newPayment.id
            });
        }
    },
    updatePayment: async (paymentId, updates) => {
        await updateDoc(doc(db, "payments", String(paymentId)), updates);
    },
    deletePayment: async (paymentId) => {
        try {
            await deleteDoc(doc(db, "payments", String(paymentId)));
        } catch(error) {
            console.error("Error deleting payment:", error);
            throw error;
        }
    },
    addExpense: async (expense) => {
        const maxId = Math.max(0, ...(get().appData?.expenses.map(e => Number(e.id) || 0) || []));
        const newExpense = { ...expense, id: maxId + 1 };
        await setDoc(doc(db, "expenses", String(newExpense.id)), newExpense);
        if (newExpense.amount > 0) {
            await get().addTreasuryTransaction({
                date: newExpense.date, type: 'مصروف', description: newExpense.name,
                amountIn: 0, amountOut: newExpense.amount, relatedId: newExpense.id
            });
        }
    },
    updateExpense: async (expenseId, updates) => {
        await updateDoc(doc(db, "expenses", String(expenseId)), updates);
    },
    deleteExpense: async (expenseId) => {
        try {
            await deleteDoc(doc(db, "expenses", String(expenseId)));
        } catch(error) {
            console.error("Error deleting expense:", error);
            throw error;
        }
    },
    setDailyReviews: async (reviews) => {
        const batch = writeBatch(db);
        reviews.forEach(r => batch.set(doc(db, "dailyReview", String(r.id)), r));
        await batch.commit();
    },
    deleteDailyReview: async (reviewId: number) => {
        try {
            await deleteDoc(doc(db, "dailyReview", String(reviewId)));
        } catch (error) {
            console.error("Error deleting daily review:", error);
            throw error;
        }
    },
    updateStorefrontSettings: async (settings) => {
        await setDoc(doc(db, "settings", "storefront"), settings);
    },
    addTreasuryTransaction: async (transaction) => {
        const maxId = Math.max(0, ...(get().appData?.treasury.map(t => Number(t.id) || 0) || []));
        const newTransaction = { ...transaction, id: maxId + 1 };
        await setDoc(doc(db, "treasury", String(newTransaction.id)), newTransaction);
    },

    addStockTransfer: async (transfer) => {
        const { appData } = get();
        const products = appData?.products || [];
        const product = products.find(p => p.id === transfer.productId);
        if (!product) throw new Error("لم يتم العثور على المنتج");

        if (product.stock[transfer.fromBranch] < transfer.quantity) {
            throw new Error("الكمية غير كافية في الفرع المصدر.");
        }

        const batch = writeBatch(db);
        
        const productRef = doc(db, "products", String(transfer.productId));
        const newStock = {
            ...product.stock,
            [transfer.fromBranch]: product.stock[transfer.fromBranch] - transfer.quantity,
            [transfer.toBranch]: product.stock[transfer.toBranch] + transfer.quantity,
        };
        batch.update(productRef, { stock: newStock });

        const maxId = Math.max(0, ...(appData?.stockTransfers.map(t => Number(t.id) || 0) || []));
        const newTransfer: StockTransfer = { 
            ...transfer, 
            id: maxId + 1,
            productName: product.name,
        };
        const transferRef = doc(db, "stockTransfers", String(newTransfer.id));
        batch.set(transferRef, newTransfer);

        await batch.commit();
    },

    uploadImage: async (file: File, path: string) => {
        // Convert file to base64
        const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data:image/png;base64, prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });

        try {
            const base64Image = await toBase64(file);
            
            // Try to upload via our secure API route first
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image }),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    return result.data.url;
                }
            }
            
            // Fallback: If API route fails (e.g. local dev without proxy), try direct upload if key is available
            const apiKey = (process.env as any).IMGBB_API_KEY;
            if (apiKey && apiKey !== "YOUR_IMGBB_API_KEY_HERE") {
                const formData = new FormData();
                formData.append('image', file);
                const directResponse = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                    method: 'POST',
                    body: formData,
                });
                const directResult = await directResponse.json();
                if (directResult.success) {
                    return directResult.data.url;
                }
            }

            throw new Error('Image upload failed. Please check your connection or configuration.');
        } catch (error: any) {
            console.error("Upload error:", error);
            throw new Error(error.message || 'Image upload failed');
        }
    },
    createOrder: async (customerDetails, items, subtotal, paymentMethod, paymentProof, discountCode) => {
        let imageUrl: string | undefined = undefined;
        let finalTotal = subtotal + 50; // Add delivery fee initially
        let validDiscountInfo: Partial<Pick<Order, 'discountCode' | 'discountAmount'>> = {};
        
        // 1. Validate discount code and calculate discount
        if (discountCode) {
            const codeDocRef = doc(db, "discountCodes", discountCode);
            const codeSnapshot = await getDoc(codeDocRef);
            if (codeSnapshot.exists()) {
                const codeData = codeSnapshot.data() as DiscountCode;
                const now = new Date().toISOString().split('T')[0];
                if (codeData.isActive && now <= codeData.expiresAt && subtotal >= codeData.minPurchase) {
                    let calculatedDiscount = 0;
                    if (codeData.type === 'fixed') {
                        calculatedDiscount = codeData.value;
                    } else { // percentage
                        calculatedDiscount = (subtotal * codeData.value) / 100;
                    }
                    
                    finalTotal -= calculatedDiscount; // Apply discount to final total
                    validDiscountInfo = {
                        discountCode: discountCode,
                        discountAmount: calculatedDiscount,
                    };
                }
            }
        }
        
        // 2. Upload payment proof if exists
        if (paymentMethod === 'electronic' && paymentProof) {
            imageUrl = await get().uploadImage(paymentProof, `payment_proofs/${Date.now()}_${paymentProof.name}`);
        }

        // 3. Create order document with conditional discount fields
        const newOrderRef = doc(collection(db, "orders"));
        const newOrderData: Omit<Order, 'id'> = {
            date: new Date().toISOString().split('T')[0],
            createdAt: Timestamp.now(),
            customerName: customerDetails.name, customerPhone: customerDetails.phone, customerAddress: customerDetails.address,
            items, 
            totalAmount: finalTotal, 
            status: 'pending', 
            paymentMethod, 
            paymentProofUrl: imageUrl || undefined, // Ensure undefined if null/empty
            ...validDiscountInfo, // Conditionally adds discountCode and discountAmount
        };
        // Remove undefined fields to prevent Firestore errors if strict
        const cleanOrderData = JSON.parse(JSON.stringify(newOrderData));
        await setDoc(newOrderRef, { ...cleanOrderData, id: newOrderRef.id }); 

        // Add notification for admin
        const notificationRef = doc(collection(db, "notifications"));
        await setDoc(notificationRef, {
            id: notificationRef.id,
            date: newOrderData.date,
            createdAt: Timestamp.now(),
            message: `طلب جديد من ${customerDetails.name} بقيمة ${formatCurrency(finalTotal)}`,
            read: false,
            orderId: newOrderRef.id,
            type: 'order',
            targetGroup: 'admin'
        });

        return imageUrl;
    },
    
    updateOrderStatus: async (orderId, status) => {
        const state = get();
        const { appData } = state;
        if (!appData) throw new Error("App data not loaded!");
    
        const orderToUpdate = appData.orders.find(o => o.id === orderId);
        if (!orderToUpdate) throw new Error("Order not found!");
        
        const isNowBeingProcessed = ['confirmed', 'shipped'].includes(status);
        const wasAlreadyProcessed = ['confirmed', 'shipped'].includes(orderToUpdate.status);
        const isBeingReverted = ['pending', 'cancelled'].includes(status);
    
        const batch = writeBatch(db);
        batch.update(doc(db, "orders", String(orderId)), { status });

        // Add notification for customer/system
        const notificationRef = doc(collection(db, "notifications"));
        batch.set(notificationRef, {
            id: notificationRef.id,
            date: new Date().toISOString().split('T')[0],
            createdAt: Timestamp.now(),
            message: `تم تغيير حالة الطلب #${orderId} إلى ${status === 'confirmed' ? 'تم التأكيد' : status === 'shipped' ? 'تم الشحن' : status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}`,
            read: false,
            orderId: String(orderId),
            type: 'status_change',
            targetGroup: 'customer' // This can be filtered in the UI for customers
        });
    
        if (isNowBeingProcessed && !wasAlreadyProcessed) {
            // Logic to create transactions when confirming an order
            const seller = appData.users.find(u => u.role === Role.Admin) || appData.users[0];
            if (!seller) throw new Error("No admin seller found.");
            
            const maxSaleId = Math.max(0, ...appData.dailySales.map(s => Number(s.id) || 0));
            const saleItems: SaleItem[] = orderToUpdate.items.map(item => {
                const product = appData.products.find(p => p.id === item.productId);
                if (!product) {
                    console.warn(`Product with ID ${item.productId} not found for order ${orderId}. Skipping sale item.`);
                    return null;
                }
                return { productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, itemType: product?.mainCategory || 'أخرى' };
            }).filter((item): item is SaleItem => item !== null);
    
            if(saleItems.length !== orderToUpdate.items.length) {
                 console.error("Some products in the order were not found. Sale record might be incomplete.");
            }
    
            const newSale: DailySale = {
                id: maxSaleId + 1, date: orderToUpdate.date, invoiceNumber: `ONLINE-${orderToUpdate.id}`,
                sellerId: seller.id, sellerName: seller.name, source: 'أونلاين', branchSoldFrom: 'main', 
                direction: 'بيع', items: saleItems, totalAmount: orderToUpdate.totalAmount,
            };
            batch.set(doc(db, "dailySales", String(newSale.id)), newSale);
            
            const maxTreasuryId = Math.max(0, ...appData.treasury.map(t => Number(t.id) || 0));
            const newTransaction: TreasuryTransaction = {
                id: maxTreasuryId + 1, date: orderToUpdate.date, type: 'إيراد مبيعات',
                description: `طلب أونلاين #${orderToUpdate.id}`, amountIn: orderToUpdate.totalAmount, amountOut: 0, relatedId: orderToUpdate.id,
            };
            batch.set(doc(db, "treasury", String(newTransaction.id)), newTransaction);
    
            for (const item of orderToUpdate.items) {
                const product = appData.products.find(p => p.id === item.productId);
                if (product) {
                    const newStock = { ...product.stock, main: product.stock.main - item.quantity };
                    batch.update(doc(db, "products", String(item.productId)), { stock: newStock });
                }
            }
        } else if (isBeingReverted && wasAlreadyProcessed) {
            // Logic to reverse transactions
            const salesQuery = query(collection(db, "dailySales"), where("invoiceNumber", "==", `ONLINE-${orderId}`));
            const salesSnapshot = await getDocs(salesQuery);
            if (!salesSnapshot.empty) {
                salesSnapshot.forEach(doc => batch.delete(doc.ref));
            }
    
            const treasuryQuery = query(collection(db, "treasury"), where("relatedId", "==", orderId), where("type", "==", "إيراد مبيعات"));
            const treasurySnapshot = await getDocs(treasuryQuery);
            if (!treasurySnapshot.empty) {
                treasurySnapshot.forEach(doc => batch.delete(doc.ref));
            }
    
            for (const item of orderToUpdate.items) {
                const product = appData.products.find(p => p.id === item.productId);
                if (product) {
                    const newStock = { ...product.stock, main: product.stock.main + item.quantity };
                    batch.update(doc(db, "products", String(item.productId)), { stock: newStock });
                }
            }
        }
    
        await batch.commit();
    
        if (isBeingReverted && wasAlreadyProcessed) {
            get().addToast('تم عكس المعاملات المرتبطة بالطلب بنجاح.', 'success');
        }
    },

    deleteOrder: async (orderId: number | string) => {
        try {
            const orderDocRef = doc(db, "orders", String(orderId));
            const orderSnapshot = await getDoc(orderDocRef);
        
            if (!orderSnapshot.exists()) throw new Error(`Order with ID ${orderId} not found!`);
            const orderToDelete = orderSnapshot.data() as Order;
        
            const batch = writeBatch(db);
            batch.delete(orderDocRef);
        
            const notificationsQuery = query(collection(db, "notifications"), where("orderId", "==", orderId));
            const notificationsSnapshot = await getDocs(notificationsQuery);
            notificationsSnapshot.forEach(doc => batch.delete(doc.ref));
        
            if (['confirmed', 'shipped'].includes(orderToDelete.status)) {
                const salesQuery = query(collection(db, "dailySales"), where("invoiceNumber", "==", `ONLINE-${orderId}`));
                const salesSnapshot = await getDocs(salesQuery);
                salesSnapshot.forEach(doc => batch.delete(doc.ref));
        
                const treasuryQuery = query(collection(db, "treasury"), where("relatedId", "==", orderId), where("type", "==", "إيراد مبيعات"));
                const treasurySnapshot = await getDocs(treasuryQuery);
                treasurySnapshot.forEach(doc => batch.delete(doc.ref));
        
                for (const item of orderToDelete.items) {
                    const productRef = doc(db, "products", String(item.productId));
                    const productDoc = await getDoc(productRef);
                    if (productDoc.exists()) {
                        const product = productDoc.data() as Product;
                        const newStock = { ...product.stock, main: product.stock.main + item.quantity };
                        batch.update(productRef, { stock: newStock });
                    }
                }
            }
            await batch.commit();
        } catch (error) {
            console.error("!!! CRITICAL: deleteOrder failed !!!", error);
            throw error;
        }
    },
    
    markNotificationAsRead: async (notificationId) => {
        await updateDoc(doc(db, "notifications", String(notificationId)), { read: true });
    },
    addDiscountCode: async (code) => {
        await setDoc(doc(db, "discountCodes", code.code), { ...code, id: code.code });
    },
    updateDiscountCode: async (codeId, updates) => {
        await updateDoc(doc(db, "discountCodes", String(codeId)), updates);
    },
    deleteDiscountCode: async (codeId) => {
        await deleteDoc(doc(db, "discountCodes", String(codeId)));
    },
    addAttendanceRecord: async (record) => {
        await setDoc(doc(db, "attendance", String(record.id)), record);
    },
    updateAttendanceRecord: async (id, updates) => {
        await updateDoc(doc(db, "attendance", String(id)), updates);
    },
    createUser: async (email, pass, role, branch, name) => {
        // Use a secondary app to create user without logging out the current admin
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
            const user = userCredential.user;
            
            // Create user document in Firestore (using main app's db)
            const newUser: User = {
                id: user.uid,
                name: name,
                username: email,
                role: role,
                branch: branch,
                permissions: [] // Default permissions can be set here
            };
            
            await setDoc(doc(db, "users", user.uid), newUser);
            await signOut(secondaryAuth);
            get().addToast(`تم إنشاء حساب المستخدم ${name} بنجاح`, 'success');
        } catch (error: any) {
            console.error("Error creating user:", error);
            throw new Error(error.message || "Failed to create user");
        } finally {
            // Clean up secondary app if possible, though initializeApp caches it.
            // In a real app, we might want to reuse it or delete it.
        }
    },
    updateSettings: async (settings) => {
        await setDoc(doc(db, "settings", "general"), settings, { merge: true });
    },
    sendBroadcast: async (message) => {
        const newBroadcast: Broadcast = {
            id: Date.now().toString(),
            message,
            date: new Date().toISOString(),
            sentBy: get().currentUser?.name || 'Admin'
        };
        await setDoc(doc(db, "broadcasts", newBroadcast.id), newBroadcast);
        // Also add a system notification for admin history
        const notificationRef = doc(collection(db, "notifications"));
        await setDoc(notificationRef, {
            id: notificationRef.id,
            date: newBroadcast.date,
            createdAt: Timestamp.now(),
            message: `تم إرسال إشعار عام: ${message}`,
            read: true,
            type: 'system',
            targetGroup: 'all'
        });
    },
}));

export default useStore;