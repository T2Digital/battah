import { create } from 'zustand';
import {
    signInWithEmailAndPassword,
    signOut,
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
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from './firebase';
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
    SaleItem
} from '../types';
import { initialData } from './initialData';
import { formatCurrency, normalizeSaleItems } from './utils';

let unsubscribers: Unsubscribe[] = [];

type AppState = {
    currentUser: User | null;
    isInitialized: boolean;
    isLoading: boolean;
    isSeeded: boolean;
    appData: AppData | null;
};

type AppActions = {
    initRealtimeListeners: () => Promise<void>;
    checkIfSeeded: () => Promise<void>;
    seedDatabase: () => Promise<void>;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    setCurrentUser: (user: User) => void;
    clearCurrentUser: () => void;
    
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
    updateDailySale: (saleId: number, updates: Partial<DailySale>) => Promise<void>;
    deleteDailySale: (saleId: number) => Promise<void>;


    // Storefront Actions
    createOrder: (customerDetails: { name: string; phone: string; address: string }, items: OrderItem[], totalAmount: number, paymentMethod: Order['paymentMethod'], paymentProof?: File) => Promise<string | undefined>;
    updateOrderStatus: (orderId: number, status: Order['status']) => Promise<void>;
    deleteOrder: (orderId: number) => Promise<void>;
    updateStorefrontSettings: (settings: StorefrontSettings) => Promise<void>;
    uploadImage: (file: File, path: string) => Promise<string>;
    markNotificationAsRead: (notificationId: number) => Promise<void>;
};

const useStore = create<AppState & AppActions>((set, get) => ({
    currentUser: null,
    isInitialized: false,
    isLoading: false,
    isSeeded: true, 
    appData: null,

    initRealtimeListeners: async () => {
        if (get().isInitialized) return;
        set({ isLoading: true });
    
        try {
            unsubscribers.forEach(unsub => unsub());
            unsubscribers = [];
        
            const collectionNames: (keyof Omit<AppData, 'storefrontSettings'>)[] = [
                'users', 'products', 'dailySales', 'employees', 'advances',
                'attendance', 'payroll', 'suppliers', 'purchaseOrders',
                'payments', 'expenses', 'treasury', 'dailyReview',
                'orders', 'notifications'
            ];
            
            const initialAppData: AppData = {
                users: [], products: [], dailySales: [], employees: [], advances: [],
                attendance: [], payroll: [], suppliers: [], purchaseOrders: [],
                payments: [], expenses: [], treasury: [], dailyReview: [],
                orders: [], notifications: [], storefrontSettings: { featuredProductIds: [], newArrivalProductIds: [] }
            };
            set({ appData: initialAppData });
        
            collectionNames.forEach(name => {
                const unsub = onSnapshot(collection(db, name as string), (snapshot) => {
                    const data = snapshot.docs.map(d => ({ ...d.data(), id: d.data().id ?? parseInt(d.id, 10) }));
                    set(state => ({
                        appData: { ...(state.appData as AppData), [name]: data }
                    }));

                    if (name === 'users') {
                        const firebaseUser = auth.currentUser;
                        if (firebaseUser && firebaseUser.email) {
                            const appUser = (data as User[]).find(u => u.username.toLowerCase() === firebaseUser.email?.toLowerCase());
                            if (appUser) {
                                set({ currentUser: appUser });
                            }
                        }
                    }

                    if (name === 'orders') {
                        snapshot.docChanges().forEach(async (change) => {
                            if (change.type === "added") {
                                const newOrder = change.doc.data() as Order;
                                if (Notification.permission === 'granted') {
                                    navigator.serviceWorker.ready.then(registration => {
                                        registration.showNotification('طلب جديد!', {
                                            body: `تم استلام طلب جديد من ${newOrder.customerName} بقيمة ${formatCurrency(newOrder.totalAmount)}`,
                                            icon: '/vite.svg',
                                        });
                                    });
                                }
                            }
                        });
                    }
                });
                unsubscribers.push(unsub);
            });
            
            const settingsUnsub = onSnapshot(doc(db, "settings", "storefront"), (doc) => {
                 const storefrontSettings = doc.exists() ? doc.data() as StorefrontSettings : { featuredProductIds: [], newArrivalProductIds: [] };
                 set(state => ({
                    appData: { ...(state.appData as AppData), storefrontSettings }
                }));
            });
            unsubscribers.push(settingsUnsub);

        } catch (error) {
            console.error("Failed to initialize realtime listeners:", error);
            set({ isInitialized: false });
        } finally {
            set({ isInitialized: true, isLoading: false });
        }
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
            } else {
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
        await signOut(auth);
        set({ currentUser: null });
        unsubscribers.forEach(unsub => unsub());
        unsubscribers = [];
        set({ isInitialized: false, appData: null });
    },
    setCurrentUser: (user) => set({ currentUser: user }),
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
    deleteDailySale: async (saleId: number) => {
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
    uploadImage: async (file, path) => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    },
    createOrder: async (customerDetails, items, totalAmount, paymentMethod, paymentProof) => {
        let imageUrl: string | undefined = undefined;
        if (paymentMethod === 'electronic' && paymentProof) {
            const apiKey = (process.env as any).IMGBB_API_KEY;
             if (!apiKey || apiKey === "YOUR_IMGBB_API_KEY_HERE") {
                throw new Error("ImgBB API Key is not configured.");
            }
            const formData = new FormData();
            formData.append('image', paymentProof);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                imageUrl = result.data.url;
            } else {
                throw new Error(result.error?.message || 'ImgBB upload failed');
            }
        }

        const maxId = Math.max(0, ...(get().appData?.orders.map(o => Number(o.id) || 0) || []));
        const newId = maxId + 1;
        const newOrder: Order = {
            id: newId, date: new Date().toISOString().split('T')[0],
            customerName: customerDetails.name, customerPhone: customerDetails.phone, customerAddress: customerDetails.address,
            items, totalAmount, status: 'pending', paymentMethod, paymentProofUrl: imageUrl,
        };
        
        const maxNotificationId = Math.max(0, ...(get().appData?.notifications.map(n => Number(n.id) || 0) || []));
        const newNotification: Notification = {
            id: maxNotificationId + 1, date: new Date().toISOString(),
            message: `طلب جديد من ${customerDetails.name} بقيمة ${formatCurrency(totalAmount)}`,
            read: false, orderId: newId,
        };

        const batch = writeBatch(db);
        batch.set(doc(db, "orders", String(newId)), newOrder);
        batch.set(doc(db, "notifications", String(newNotification.id)), newNotification);
        await batch.commit();
        
        if (Notification.permission !== 'granted') {
            await Notification.requestPermission();
        }

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

        const batch = writeBatch(db);
        batch.update(doc(db, "orders", String(orderId)), { status });

        if (isNowBeingProcessed && !wasAlreadyProcessed) {
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
        }
        await batch.commit();
    },

    deleteOrder: async (orderId: number) => {
        if (isNaN(orderId)) {
            throw new Error(`Order with ID ${orderId} not found!`);
        }
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
    }
}));

export default useStore;