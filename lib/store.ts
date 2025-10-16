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
    Notification
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
    setAdvances: (advances: Advance[]) => Promise<void>;
    setAttendance: (attendance: Attendance[]) => Promise<void>;
    addPayroll: (payroll: Omit<Payroll, 'id'>) => Promise<void>;
    updatePayroll: (payrollId: number, updates: Partial<Payroll>) => Promise<void>;
    deletePayroll: (payrollId: number) => Promise<void>;
    setSuppliers: (suppliers: Supplier[]) => Promise<void>;
    setPurchaseOrders: (orders: PurchaseOrder[]) => Promise<void>;
    setPayments: (payments: Payment[]) => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (expenseId: number, updates: Partial<Expense>) => Promise<void>;
    deleteExpense: (expenseId: number) => Promise<void>;
    setDailyReviews: (reviews: DailyReview[]) => Promise<void>;
    addTreasuryTransaction: (transaction: Omit<TreasuryTransaction, 'id'>) => Promise<void>;

    // Storefront Actions
    createOrder: (customerDetails: { name: string; phone: string; address: string }, items: OrderItem[], totalAmount: number, paymentMethod: Order['paymentMethod'], paymentProof?: File) => Promise<void>;
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
    setAdvances: async (advances) => {
        await syncCollectionToFirestore('advances', get().appData?.advances || [], advances);
        set(state => ({ appData: state.appData ? { ...state.appData, advances } : null }));
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
    setPurchaseOrders: async (orders) => {
        await syncCollectionToFirestore('purchaseOrders', get().appData?.purchaseOrders || [], orders);
        set(state => ({ appData: state.appData ? { ...state.appData, purchaseOrders: orders } : null }));
    },
    setPayments: async (payments) => {
        await syncCollectionToFirestore('payments', get().appData?.payments || [], payments);
        set(state => ({ appData: state.appData ? { ...state.appData, payments } : null }));
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
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    },

    createOrder: async (customerDetails, items, totalAmount, paymentMethod, paymentProof) => {
        const state = get();
        if (!state.appData) throw new Error("App data not loaded");

        let imageUrl: string | undefined = undefined;
        if (paymentMethod === 'electronic' && paymentProof) {
            imageUrl = await state.uploadImage(paymentProof, `paymentProofs/${Date.now()}_${paymentProof.name}`);
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
    },
    
    updateOrderStatus: async (orderId, status) => {
        await updateDoc(doc(db, "orders", String(orderId)), { status });
        set(state => {
            if (!state.appData) return {};
            return {
                appData: {
                    ...state.appData,
                    orders: state.appData.orders.map(o => o.id === orderId ? { ...o, status } : o),
                }
            };
        });
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
