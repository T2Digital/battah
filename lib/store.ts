

import { create } from 'zustand';
import {
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import {
    collection,
    getDocs,
    doc,
    writeBatch,
    setDoc,
    getDoc,
    updateDoc,
    Timestamp,
    deleteDoc,
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
import { initialData } from './initialData'; // Assuming initialData.ts exists for seeding
import { formatCurrency } from './utils';

type AppState = {
    currentUser: User | null;
    isInitialized: boolean;
    isLoading: boolean;
    isSeeded: boolean;
    appData: AppData | null;
};

type AppActions = {
    fetchInitialData: () => Promise<void>;
    checkIfSeeded: () => Promise<void>;
    seedDatabase: () => Promise<void>;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    setCurrentUser: (user: User) => void;
    clearCurrentUser: () => void;
    
    // Actions to modify appData subsets
    setProducts: (products: Product[]) => Promise<void>;
    setDailySales: (sales: DailySale[]) => Promise<void>;
    setEmployees: (employees: Employee[]) => Promise<void>;
    addAdvance: (advance: Omit<Advance, 'id'>) => Promise<void>;
    updateAdvance: (advanceId: number, updates: Partial<Advance>) => Promise<void>;
    deleteAdvance: (advanceId: number) => Promise<void>;
    setAttendance: (attendance: Attendance[]) => Promise<void>;
    addPayroll: (payroll: Omit<Payroll, 'id'>) => Promise<void>;
    updatePayroll: (payrollId: number, updates: Partial<Payroll>) => Promise<void>;
    deletePayroll: (payrollId: number) => Promise<void>;
    setSuppliers: (suppliers: Supplier[]) => Promise<void>;
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
    addTreasuryTransaction: (transaction: Omit<TreasuryTransaction, 'id'>) => Promise<void>;

    // Storefront Actions
    createOrder: (customerDetails: { name: string; phone: string; address: string }, items: OrderItem[], totalAmount: number, paymentMethod: Order['paymentMethod'], paymentProof?: File) => Promise<string | undefined>;
    updateOrderStatus: (orderId: number, status: Order['status']) => Promise<void>;
    updateStorefrontSettings: (settings: StorefrontSettings) => Promise<void>;
    uploadImage: (file: File, path: string) => Promise<string>;
    markNotificationAsRead: (notificationId: number) => Promise<void>;
};

// Helper to compare two arrays of objects by ID and generate a Firestore batch
const syncCollectionToFirestore = async <T extends { id: number }>(
    collectionName: string,
    oldData: T[],
    newData: T[],
) => {
    const batch = writeBatch(db);
    const oldMap = new Map(oldData.map(item => [item.id, item]));
    const newMap = new Map(newData.map(item => [item.id, item]));

    // Deletions
    for (const id of oldMap.keys()) {
        if (!newMap.has(id)) {
            batch.delete(doc(db, collectionName, String(id)));
        }
    }

    // Additions and Updates
    for (const [id, newItem] of newMap.entries()) {
        const oldItem = oldMap.get(id);
        const docRef = doc(db, collectionName, String(id));
        
        const cleanNewItem = JSON.parse(JSON.stringify(newItem));

        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(cleanNewItem)) {
             batch.set(docRef, cleanNewItem);
        }
    }
    
    await batch.commit();
};

const uploadToImgBB = async (file: File): Promise<string> => {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey || apiKey === "YOUR_IMGBB_API_KEY_HERE") {
        throw new Error("ImgBB API key is not configured.");
    }
    
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Image upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
        return data.data.url;
    } else {
        throw new Error(data.error?.message || 'Unknown error uploading to ImgBB');
    }
};


const useStore = create<AppState & AppActions>((set, get) => ({
    currentUser: null,
    isInitialized: false,
    isLoading: true,
    isSeeded: true, 
    appData: null,

    fetchInitialData: async () => {
        set({ isLoading: true });
        try {
            const collections: AppData = {
                users: [], products: [], dailySales: [], employees: [], advances: [],
                attendance: [], payroll: [], suppliers: [], purchaseOrders: [],
                payments: [], expenses: [], treasury: [], dailyReview: [],
                orders: [], notifications: [],
                storefrontSettings: { featuredProductIds: [], newArrivalProductIds: [] }
            };
            
            const collectionNames = Object.keys(collections).filter(c => c !== 'storefrontSettings');

            for (const name of collectionNames) {
                const querySnapshot = await getDocs(collection(db, name));
                (collections as any)[name] = querySnapshot.docs.map(d => ({ ...d.data(), id: d.data().id ?? parseInt(d.id, 10) }));
            }
            
            const settingsDoc = await getDoc(doc(db, "settings", "storefront"));
            if (settingsDoc.exists()) {
                 collections.storefrontSettings = settingsDoc.data() as StorefrontSettings;
            }

            set({ appData: collections, isInitialized: true });
        } catch (error) {
            console.error("Error fetching initial data:", error);
        } finally {
            set({ isLoading: false });
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
    },
    setCurrentUser: (user) => set({ currentUser: user }),
    clearCurrentUser: () => set({ currentUser: null }),
    
    // Specific setters with Firestore sync
    setProducts: async (products) => {
        await syncCollectionToFirestore('products', get().appData?.products || [], products);
        set(state => ({ appData: state.appData ? { ...state.appData, products } : null }));
    },
    setDailySales: async (sales) => {
        await syncCollectionToFirestore('dailySales', get().appData?.dailySales || [], sales);
        set(state => ({ appData: state.appData ? { ...state.appData, dailySales: sales } : null }));
    },
    setEmployees: async (employees) => {
        await syncCollectionToFirestore('employees', get().appData?.employees || [], employees);
        set(state => ({ appData: state.appData ? { ...state.appData, employees } : null }));
    },
    addAdvance: async (advance) => {
        const state = get();
        if (!state.appData) return;
        const newId = (state.appData.advances.length > 0 ? Math.max(...state.appData.advances.map(a => a.id)) : 0) + 1;
        const newAdvance = { ...advance, id: newId };
        await setDoc(doc(db, "advances", String(newId)), newAdvance);
        set(s => ({ appData: s.appData ? { ...s.appData, advances: [...s.appData.advances, newAdvance] } : null }));
        
        if (newAdvance.amount > 0) {
            const employeeName = state.appData.employees.find(e => e.id === newAdvance.employeeId)?.name || 'موظف';
            await get().addTreasuryTransaction({
                date: newAdvance.date, type: 'سلفة', description: `سلفة لـ ${employeeName}`,
                amountIn: 0, amountOut: newAdvance.amount, relatedId: newId
            });
        }
    },
    updateAdvance: async (advanceId, updates) => {
        await updateDoc(doc(db, "advances", String(advanceId)), updates);
        set(s => ({ appData: s.appData ? { ...s.appData, advances: s.appData.advances.map(a => a.id === advanceId ? { ...a, ...updates } : a) } : null }));
    },
    deleteAdvance: async (advanceId) => {
        await deleteDoc(doc(db, "advances", String(advanceId)));
        set(s => ({ appData: s.appData ? { ...s.appData, advances: s.appData.advances.filter(a => a.id !== advanceId) } : null }));
    },
    setAttendance: async (attendance) => {
        await syncCollectionToFirestore('attendance', get().appData?.attendance || [], attendance);
        set(state => ({ appData: state.appData ? { ...state.appData, attendance } : null }));
    },
    addPayroll: async (payroll) => {
        const state = get();
        if (!state.appData) return;
        const newId = (state.appData.payroll.length > 0 ? Math.max(...state.appData.payroll.map(p => p.id)) : 0) + 1;
        const newPayroll = { ...payroll, id: newId };
        await setDoc(doc(db, "payroll", String(newId)), newPayroll);
        set(s => ({ appData: s.appData ? { ...s.appData, payroll: [...s.appData.payroll, newPayroll] } : null }));

        if (newPayroll.disbursed > 0) {
            const employeeName = state.appData.employees.find(e => e.id === newPayroll.employeeId)?.name || 'موظف';
            await get().addTreasuryTransaction({
                date: newPayroll.date, type: 'راتب', description: `راتب لـ ${employeeName}`,
                amountIn: 0, amountOut: newPayroll.disbursed, relatedId: newId
            });
        }
    },
    updatePayroll: async (payrollId, updates) => {
        const state = get();
        if (!state.appData) return;
        const docRef = doc(db, "payroll", String(payrollId));
        await updateDoc(docRef, updates);
        set(s => ({
            appData: s.appData ? {
                ...s.appData,
                payroll: s.appData.payroll.map(p => p.id === payrollId ? { ...p, ...updates } : p)
            } : null
        }));
    },
    deletePayroll: async (payrollId) => {
        await deleteDoc(doc(db, "payroll", String(payrollId)));
        set(state => {
            if (!state.appData) return state;
            return {
                appData: { ...state.appData, payroll: state.appData.payroll.filter(p => p.id !== payrollId) }
            }
        });
    },
    setSuppliers: async (suppliers) => {
        await syncCollectionToFirestore('suppliers', get().appData?.suppliers || [], suppliers);
        set(state => ({ appData: state.appData ? { ...state.appData, suppliers } : null }));
    },
    addPurchaseOrder: async (order) => {
        const state = get();
        if (!state.appData) return;
        const newId = (state.appData.purchaseOrders.length > 0 ? Math.max(...state.appData.purchaseOrders.map(o => o.id)) : 0) + 1;
        const newOrder = { ...order, id: newId };
        await setDoc(doc(db, "purchaseOrders", String(newId)), newOrder);
        set(s => ({ appData: s.appData ? { ...s.appData, purchaseOrders: [...s.appData.purchaseOrders, newOrder] } : null }));
    },
    updatePurchaseOrder: async (orderId, updates) => {
        await updateDoc(doc(db, "purchaseOrders", String(orderId)), updates);
        set(s => ({ appData: s.appData ? { ...s.appData, purchaseOrders: s.appData.purchaseOrders.map(o => o.id === orderId ? { ...o, ...updates } : o) } : null }));
    },
    deletePurchaseOrder: async (orderId) => {
        await deleteDoc(doc(db, "purchaseOrders", String(orderId)));
        set(s => ({ appData: s.appData ? { ...s.appData, purchaseOrders: s.appData.purchaseOrders.filter(o => o.id !== orderId) } : null }));
    },
    addPayment: async (payment) => {
        const state = get();
        if (!state.appData) return;
        const newId = (state.appData.payments.length > 0 ? Math.max(...state.appData.payments.map(p => p.id)) : 0) + 1;
        const newPayment = { ...payment, id: newId };
        await setDoc(doc(db, "payments", String(newId)), newPayment);
        set(s => ({ appData: s.appData ? { ...s.appData, payments: [...s.appData.payments, newPayment] } : null }));
        
        if (newPayment.payment > 0) {
            const supplierName = state.appData.suppliers.find(s => s.id === newPayment.supplierId)?.name || 'مورد';
            await get().addTreasuryTransaction({
                date: newPayment.date, type: 'دفعة لمورد', description: `دفعة لـ ${supplierName}`,
                amountIn: 0, amountOut: newPayment.payment, relatedId: newId
            });
        }
    },
    updatePayment: async (paymentId, updates) => {
        await updateDoc(doc(db, "payments", String(paymentId)), updates);
        set(s => ({ appData: s.appData ? { ...s.appData, payments: s.appData.payments.map(p => p.id === paymentId ? { ...p, ...updates } : p) } : null }));
    },
    deletePayment: async (paymentId) => {
        await deleteDoc(doc(db, "payments", String(paymentId)));
        set(s => ({ appData: s.appData ? { ...s.appData, payments: s.appData.payments.filter(p => p.id !== paymentId) } : null }));
    },
    addExpense: async (expense) => {
        const state = get();
        if (!state.appData) return;
        const newId = (state.appData.expenses.length > 0 ? Math.max(...state.appData.expenses.map(e => e.id)) : 0) + 1;
        const newExpense = { ...expense, id: newId };
        await setDoc(doc(db, "expenses", String(newId)), newExpense);
        set(s => ({ appData: s.appData ? { ...s.appData, expenses: [...s.appData.expenses, newExpense] } : null }));
        if (newExpense.amount > 0) {
            await get().addTreasuryTransaction({
                date: newExpense.date, type: 'مصروف', description: newExpense.name,
                amountIn: 0, amountOut: newExpense.amount, relatedId: newId
            });
        }
    },
    updateExpense: async (expenseId, updates) => {
        const state = get();
        if (!state.appData) return;
        const docRef = doc(db, "expenses", String(expenseId));
        await updateDoc(docRef, updates);
        set(s => ({
            appData: s.appData ? {
                ...s.appData,
                expenses: s.appData.expenses.map(e => e.id === expenseId ? { ...e, ...updates } : e)
            } : null
        }));
    },
    deleteExpense: async (expenseId) => {
        await deleteDoc(doc(db, "expenses", String(expenseId)));
        set(state => {
            if (!state.appData) return state;
            return {
                appData: { ...state.appData, expenses: state.appData.expenses.filter(e => e.id !== expenseId) }
            }
        });
    },
    setDailyReviews: async (reviews) => {
        await syncCollectionToFirestore('dailyReview', get().appData?.dailyReview || [], reviews);
        set(state => ({ appData: state.appData ? { ...state.appData, dailyReview: reviews } : null }));
    },
    updateStorefrontSettings: async (settings) => {
        await setDoc(doc(db, "settings", "storefront"), settings);
        set(state => ({ appData: state.appData ? { ...state.appData, storefrontSettings: settings } : null }));
    },

    addTreasuryTransaction: async (transaction) => {
        const state = get();
        if (!state.appData) return;
        const newId = (state.appData.treasury.length > 0 ? Math.max(...state.appData.treasury.map(t => t.id)) : 0) + 1;
        const newTransaction = { ...transaction, id: newId };
        
        await setDoc(doc(db, "treasury", String(newId)), newTransaction);

        set({
            appData: {
                ...state.appData,
                treasury: [...state.appData.treasury, newTransaction]
            }
        });
    },

    uploadImage: async (file, path) => {
        try {
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error("Image Upload Failed:", error);
            throw new Error("Failed to upload image.");
        }
    },

    createOrder: async (customerDetails, items, totalAmount, paymentMethod, paymentProof) => {
        const state = get();
        if (!state.appData) throw new Error("App data not loaded");

        let imageUrl: string | undefined = undefined;
        if (paymentMethod === 'electronic' && paymentProof) {
            try {
                // Use the new ImgBB upload function
                imageUrl = await uploadToImgBB(paymentProof);
            } catch(e) {
                console.error("ImgBB Upload Failed:", e);
                // Propagate the error to the UI
                throw e;
            }
        }

        const newId = (state.appData.orders.length > 0 ? Math.max(...state.appData.orders.map(o => o.id)) : 0) + 1;
        
        const newOrder: Omit<Order, 'paymentProofUrl'> & { paymentProofUrl?: string } = {
            id: newId,
            date: new Date().toISOString().split('T')[0],
            customerName: customerDetails.name,
            customerPhone: customerDetails.phone,
            customerAddress: customerDetails.address,
            items,
            totalAmount,
            status: 'pending',
            paymentMethod,
        };

        if (imageUrl) {
            newOrder.paymentProofUrl = imageUrl;
        }

        const newNotificationId = (state.appData.notifications.length > 0 ? Math.max(...state.appData.notifications.map(n => n.id)) : 0) + 1;
        const newNotification: Notification = {
            id: newNotificationId,
            date: new Date().toISOString(),
            message: `طلب جديد من ${customerDetails.name} بقيمة ${formatCurrency(totalAmount)}`,
            read: false,
            orderId: newId,
        }

        await setDoc(doc(db, "orders", String(newId)), newOrder);
        await setDoc(doc(db, "notifications", String(newNotificationId)), newNotification);

        set({
            appData: {
                ...state.appData,
                orders: [...state.appData.orders, newOrder as Order],
                notifications: [newNotification, ...state.appData.notifications],
            }
        });

        // Return the image URL so the frontend can use it for WhatsApp
        return imageUrl;
    },
    
    updateOrderStatus: async (orderId, status) => {
        const state = get();
        if (!state.appData) return;

        const orderToUpdate = state.appData.orders.find(o => o.id === orderId);
        if (!orderToUpdate) {
            console.error("Order not found!");
            return;
        }
        
        const isAlreadyProcessed = orderToUpdate.status === 'confirmed' || orderToUpdate.status === 'shipped';
        const isNowBeingProcessed = status === 'confirmed' || status === 'shipped';

        await updateDoc(doc(db, "orders", String(orderId)), { status });

        const updatedOrders = state.appData.orders.map(o => o.id === orderId ? { ...o, status } : o);
        let updatedAppData = { ...state.appData, orders: updatedOrders };
        set({ appData: updatedAppData });
        
        if (isNowBeingProcessed && !isAlreadyProcessed) {
            const batch = writeBatch(db);
            
            let lastSaleId = (state.appData.dailySales.length > 0) ? Math.max(...state.appData.dailySales.map(s => s.id)) : 0;
            const seller = state.appData.users.find(u => u.role === Role.Admin) || state.appData.users[0];
            
            const saleItems: SaleItem[] = orderToUpdate.items.map(item => {
                const product = state.appData!.products.find(p => p.id === item.productId);
                let itemTypeForSale: SaleItem['itemType'] = 'أخرى';
                if (product) {
                     switch (product.mainCategory) {
                        case 'قطع غيار': itemTypeForSale = 'قطع غيار'; break;
                        case 'كماليات': itemTypeForSale = 'كماليات'; break;
                        case 'زيوت وشحومات': itemTypeForSale = 'زيوت'; break;
                        case 'بطاريات': itemTypeForSale = 'بطاريات'; break;
                        default: itemTypeForSale = 'أخرى'; break;
                    }
                }
                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    itemType: itemTypeForSale,
                };
            });

            const newSale: DailySale = {
                id: ++lastSaleId,
                date: orderToUpdate.date,
                invoiceNumber: `ONLINE-${orderToUpdate.id}`,
                sellerId: seller.id,
                sellerName: seller.name,
                source: 'أونلاين',
                branchSoldFrom: 'main',
                direction: 'بيع',
                items: saleItems,
                totalAmount: orderToUpdate.totalAmount,
            };
            batch.set(doc(db, "dailySales", String(newSale.id)), newSale);
            updatedAppData.dailySales = [...updatedAppData.dailySales, newSale];
            
            let lastTreasuryId = (state.appData.treasury.length > 0) ? Math.max(...state.appData.treasury.map(t => t.id)) : 0;
            const newTransaction: TreasuryTransaction = {
                id: ++lastTreasuryId, date: orderToUpdate.date, type: 'إيراد مبيعات',
                description: `طلب أونلاين #${orderToUpdate.id} - ${orderToUpdate.customerName}`,
                amountIn: orderToUpdate.totalAmount, amountOut: 0, relatedId: orderToUpdate.id,
            };
            batch.set(doc(db, "treasury", String(newTransaction.id)), newTransaction);
            updatedAppData.treasury = [...state.appData.treasury, newTransaction];
            
            let productUpdates = new Map<number, number>();
            orderToUpdate.items.forEach(item => {
                productUpdates.set(item.productId, (productUpdates.get(item.productId) || 0) + item.quantity);
            });
            
            let updatedProducts = state.appData.products.map(p => {
                if (productUpdates.has(p.id)) {
                    const newStock = { ...p.stock, main: p.stock.main - (productUpdates.get(p.id) || 0) };
                    const updatedProduct = { ...p, stock: newStock };
                    batch.update(doc(db, "products", String(p.id)), { stock: newStock });
                    return updatedProduct;
                }
                return p;
            });
            updatedAppData.products = updatedProducts;
            
            await batch.commit();
            set({ appData: updatedAppData });
        }
    },
    
    markNotificationAsRead: async (notificationId) => {
        await updateDoc(doc(db, "notifications", String(notificationId)), { read: true });
        set(state => {
            if (!state.appData) return {};
            return {
                appData: {
                    ...state.appData,
                    notifications: state.appData.notifications.map(n => n.id === notificationId ? { ...n, read: true } : n),
                }
            };
        });
    }

}));

export default useStore;