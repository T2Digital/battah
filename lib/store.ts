/// <reference types="vite/client" />
import { create } from 'zustand';
import { initializeApp } from 'firebase/app';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    getAuth,
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
    getDocs,
    orderBy,
    limit,
    startAfter,
    runTransaction,
    increment
} from 'firebase/firestore';
import { auth, db, firebaseConfig, handleFirestoreError, OperationType } from './firebase';
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
    Settings,
    Broadcast,
    Section,
    MainCategory
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
    pendingOrderIdToOpen: string | null;
};

type AppActions = {
    setPendingOrderIdToOpen: (id: string | null) => void;
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
    addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
    updateProduct: (productId: number, updates: Partial<Product>) => Promise<void>;
    updateProductStock: (productId: number, branch: Branch, change: number) => Promise<void>;
    deleteProduct: (productId: number) => Promise<void>;
    increasePrices: (percentage: number, category?: MainCategory) => Promise<void>;
    
    // Product Actions (Scalable)
    fetchProducts: (lastDoc?: any, limitCount?: number, filter?: { category?: string }) => Promise<{ products: Product[], lastDoc: any }>;
    fetchProductsByIds: (ids: number[]) => Promise<Product[]>;
    searchProducts: (searchQuery: string) => Promise<Product[]>;
    fetchDataByDateRange: (collectionName: keyof AppData, startDate: string, endDate: string) => Promise<void>;

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
    addExpense: (expense: Omit<Expense, 'id'>, skipTreasury?: boolean) => Promise<void>;
    updateExpense: (expenseId: number, updates: Partial<Expense>) => Promise<void>;
    deleteExpense: (expenseId: number) => Promise<void>;
    setDailyReviews: (reviews: DailyReview[]) => Promise<void>;
    deleteDailyReview: (reviewId: number) => Promise<void>;
    addTreasuryTransaction: (transaction: Omit<TreasuryTransaction, 'id'>) => Promise<void>;
    deleteTreasuryTransaction: (transactionId: number | string) => Promise<void>;
    
    // Sales action (no longer a simple set, but an atomic add)
    addDailySale: (sale: Omit<DailySale, 'id'>) => Promise<DailySale>;
    updateDailySale: (saleId: number | string, updates: Partial<DailySale>) => Promise<void>;
    deleteDailySale: (saleId: number | string) => Promise<void>;

    // Inventory Actions
    addStockTransfer: (transfer: Omit<StockTransfer, 'id' | 'productName'>) => Promise<void>;


    // Storefront Actions
    createOrder: (customerDetails: { name: string; phone: string; address: string }, items: OrderItem[], totalAmount: number, paymentMethod: Order['paymentMethod'], paymentProof?: File, discountCode?: string, locationLink?: string) => Promise<string | undefined>;
    updateOrderStatus: (orderId: number | string, status: Order['status'], shippingDetails?: { shippingCompany?: string, trackingNumber?: string, shippingNotes?: string }) => Promise<void>;
    deleteOrder: (orderId: number | string) => Promise<void>;
    updateStorefrontSettings: (settings: StorefrontSettings) => Promise<void>;
    uploadImage: (file: File, path: string) => Promise<string>;
    markNotificationAsRead: (notificationId: string) => Promise<void>;
    addDiscountCode: (code: Omit<DiscountCode, 'id'>) => Promise<void>;
    updateDiscountCode: (codeId: string, updates: Partial<DiscountCode>) => Promise<void>;
    deleteDiscountCode: (codeId: string) => Promise<void>;
    addAttendanceRecord: (record: Attendance) => Promise<void>;
    updateAttendanceRecord: (id: number, updates: Partial<Attendance>) => Promise<void>;
    createUser: (email: string, pass: string, role: Role, branch: Branch, name: string, permissions?: Section[]) => Promise<void>;
    updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    updateSettings: (settings: Partial<Settings>) => Promise<void>;
    sendBroadcast: (message: string) => Promise<void>;
    saveDeviceToken: (token: string) => Promise<void>;
    resetTreasury: (initialBalance: number) => Promise<void>;
    clearTreasury: () => Promise<void>;
};

const useStore = create<AppState & AppActions>((set, get) => ({
    currentUser: null,
    isInitialized: false,
    isPublicInitialized: false,
    isLoading: false,
    isSeeded: true, 
    pendingOrderIdToOpen: null,
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
    setPendingOrderIdToOpen: (id: string | null) => {
        set({ pendingOrderIdToOpen: id });
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
        
            const publicCollections: (keyof AppData)[] = ['broadcasts'];

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
                }, (error) => {
                    if (error.message.includes('Missing or insufficient permissions')) {
                        handleFirestoreError(error, OperationType.LIST, name as string);
                    }
                    console.warn(`Error listening to ${name}:`, error.message);
                });
                publicUnsubscribers.push(unsub);
            });
            
            const settingsUnsub = onSnapshot(doc(db, "settings", "storefront"), (doc) => {
                 const storefrontSettings = doc.exists() ? doc.data() as StorefrontSettings : { featuredProductIds: [], newArrivalProductIds: [] };
                 set(state => ({
                    appData: { ...(state.appData as AppData), storefrontSettings }
                }));
            }, (error) => {
                if (error.message.includes('Missing or insufficient permissions')) {
                    handleFirestoreError(error, OperationType.GET, 'settings/storefront');
                }
                console.warn("Error listening to storefront settings:", error.message);
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
            }, (error) => {
                if (error.message.includes('Missing or insufficient permissions')) {
                    handleFirestoreError(error, OperationType.GET, 'settings/general');
                }
                console.warn("Error listening to general settings:", error.message);
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
                'users', 'dailySales', 'employees', 'advances', 'attendance', 'payroll', 'suppliers', 
                'purchaseOrders', 'payments', 'expenses', 'treasury', 'dailyReview', 
                'notifications', 'stockTransfers', 'orders', 'broadcasts'
            ];
            
            const largeCollections = ['dailySales', 'expenses', 'treasury', 'purchaseOrders', 'payments', 'attendance', 'payroll', 'stockTransfers', 'dailyReview', 'orders'];
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
            collectionsToListen.forEach(name => {
                let collectionQuery = query(collection(db, name as string));
                
                if (largeCollections.includes(name)) {
                    const dateField = name === 'purchaseOrders' ? 'orderDate' : 'date';
                    collectionQuery = query(collection(db, name as string), where(dateField, ">=", thirtyDaysAgoStr));
                }

                const unsub = onSnapshot(collectionQuery, (snapshot) => {
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
                }, (error: any) => {
                    if (error.message?.includes('Missing or insufficient permissions')) {
                        handleFirestoreError(error, OperationType.LIST, name as string);
                    }
                    console.error(`Error listening to ${name}:`, error);
                    if (error.code === 'permission-denied') {
                        // Suppress broadcast permission errors as they are expected for non-admin users if rules are strict
                        if (name !== 'broadcasts') {
                            get().addToast(`خطأ في الصلاحيات عند تحميل بيانات: ${name}`, 'error');
                        }
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
        await signOut(auth);
        window.location.hash = '';
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
    addProduct: async (product) => {
        // Generate ID based on timestamp and a random number to prevent collisions during bulk uploads
        const newId = Date.now() + Math.floor(Math.random() * 100000); 
        const newProduct = { ...product, id: newId };
        await setDoc(doc(db, "products", String(newId)), newProduct);
        
        // Update local state
        set(state => {
            const currentProducts = state.appData?.products || [];
            return {
                appData: {
                    ...(state.appData as AppData),
                    products: [...currentProducts, newProduct as Product]
                }
            };
        });
        
        get().addToast('تم إضافة المنتج بنجاح', 'success');
        return newProduct as Product;
    },
    updateProduct: async (productId, updates) => {
        await updateDoc(doc(db, "products", String(productId)), updates);
        
        // Update local state
        set(state => {
            const currentProducts = state.appData?.products || [];
            return {
                appData: {
                    ...(state.appData as AppData),
                    products: currentProducts.map(p => p.id === productId ? { ...p, ...updates } : p)
                }
            };
        });
        
        get().addToast('تم تحديث المنتج بنجاح', 'success');
    },
    updateProductStock: async (productId: number, branch: Branch, change: number) => {
        const docRef = doc(db, "products", String(productId));
        await updateDoc(docRef, {
            [`stock.${branch}`]: increment(change)
        });
        
        // Update local state
        set(state => {
            const currentProducts = state.appData?.products || [];
            return {
                appData: {
                    ...(state.appData as AppData),
                    products: currentProducts.map(p => {
                        if (p.id === productId) {
                            return {
                                ...p,
                                stock: {
                                    ...p.stock,
                                    [branch]: (p.stock[branch] || 0) + change
                                }
                            };
                        }
                        return p;
                    })
                }
            };
        });
    },
    deleteProduct: async (productId: number) => {
        try {
            await deleteDoc(doc(db, "products", String(productId)));
            
            // Update local state
            set(state => {
                const currentProducts = state.appData?.products || [];
                return {
                    appData: {
                        ...(state.appData as AppData),
                        products: currentProducts.filter(p => p.id !== productId)
                    }
                };
            });
            
            get().addToast('تم حذف المنتج بنجاح', 'success');
        } catch (error) {
            console.error("Error deleting product:", error);
            throw error;
        }
    },
    
    increasePrices: async (percentage: number, category?: MainCategory) => {
        try {
            const productsRef = collection(db, "products");
            let q = query(productsRef);
            if (category && category !== 'all' as any) {
                q = query(productsRef, where("mainCategory", "==", category));
            }
            const snapshot = await getDocs(q);
            
            const chunks = [];
            for (let i = 0; i < snapshot.docs.length; i += 500) {
                chunks.push(snapshot.docs.slice(i, i + 500));
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(docSnap => {
                    const data = docSnap.data() as Product;
                    const updates: any = {};
                    
                    if (data.sellingPrice !== undefined) {
                        updates.sellingPrice = Math.round(data.sellingPrice * (1 + percentage / 100));
                    }
                    if (data.wholesalePrice !== undefined) {
                        updates.wholesalePrice = Math.round(data.wholesalePrice * (1 + percentage / 100));
                    }
                    if (data.retailPrice !== undefined) {
                        updates.retailPrice = Math.round(data.retailPrice * (1 + percentage / 100));
                    }
                    
                    batch.update(docSnap.ref, updates);
                });
                await batch.commit();
            }

            // Update local state
            set(state => {
                if (!state.appData) return state;
                const updatedProducts = state.appData.products.map(p => {
                    if (!category || (category as string) === 'all' || p.mainCategory === category) {
                        return { 
                            ...p, 
                            sellingPrice: Math.round(p.sellingPrice * (1 + percentage / 100)),
                            wholesalePrice: p.wholesalePrice !== undefined ? Math.round(p.wholesalePrice * (1 + percentage / 100)) : undefined,
                            retailPrice: p.retailPrice !== undefined ? Math.round(p.retailPrice * (1 + percentage / 100)) : undefined,
                        };
                    }
                    return p;
                });
                return { appData: { ...state.appData, products: updatedProducts } };
            });
        } catch (error) {
            console.error("Error adjusting prices:", error);
            throw error;
        }
    },

    addDailySale: async (sale) => {
        const maxId = Math.max(0, ...(get().appData?.dailySales.map(s => Number(s.id) || 0) || []));
        const newSale = { ...sale, id: maxId + 1, timestamp: new Date().toISOString() };
        await setDoc(doc(db, "dailySales", String(newSale.id)), newSale);
        get().addToast('تم حفظ الفاتورة بنجاح', 'success');
        return newSale as DailySale;
    },
    updateDailySale: async (saleId, updates) => {
        const batch = writeBatch(db);
        batch.update(doc(db, "dailySales", String(saleId)), updates);

        const state = get();
        const existingSale = state.appData?.dailySales.find(s => String(s.id) === String(saleId));
        
        if (existingSale) {
            const mergedSale = { ...existingSale, ...updates } as DailySale;
            const relatedTxs = state.appData?.treasury.filter(t => String(t.relatedId) === String(saleId) && ["إيراد مبيعات", "مرتجع مبيعات"].includes(t.type)) || [];
            
            relatedTxs.forEach(t => {
                batch.delete(doc(db, "treasury", String(t.id)));
            });

            if (mergedSale.direction !== 'هدية') {
                let transactionType: 'إيراد مبيعات' | 'مرتجع مبيعات' = 'إيراد مبيعات';
                let amountIn = 0;
                let amountOut = 0;
                const totalPaid = (mergedSale.cashAmount || 0) + (mergedSale.electronicAmount || 0);

                if (mergedSale.direction === 'بيع') {
                    transactionType = 'إيراد مبيعات';
                    amountIn = Math.abs(totalPaid);
                } else if (mergedSale.direction === 'مرتجع') {
                    transactionType = 'مرتجع مبيعات';
                    amountOut = Math.abs(totalPaid);
                } else if (mergedSale.direction === 'تبديل') {
                    if (mergedSale.totalAmount >= 0) {
                        transactionType = 'إيراد مبيعات';
                        amountIn = Math.abs(totalPaid);
                    } else {
                        transactionType = 'مرتجع مبيعات';
                        amountOut = Math.abs(totalPaid);
                    }
                }

                const maxTreasuryId = Math.max(0, ...(state.appData?.treasury.map(t => Number(t.id) || 0) || []));
                let nextTreasuryId = maxTreasuryId + 1;

                if (mergedSale.paymentMethod === 'مختلط' && mergedSale.cashAmount && mergedSale.electronicAmount) {
                    const cashIn = amountIn > 0 ? Math.abs(mergedSale.cashAmount) : 0;
                    const cashOut = amountOut > 0 ? Math.abs(mergedSale.cashAmount) : 0;
                    const elecIn = amountIn > 0 ? Math.abs(mergedSale.electronicAmount) : 0;
                    const elecOut = amountOut > 0 ? Math.abs(mergedSale.electronicAmount) : 0;

                    if (cashIn > 0 || cashOut > 0) {
                        const newTx = {
                            id: nextTreasuryId++,
                            date: mergedSale.date, type: transactionType, description: `${mergedSale.direction} فاتورة #${mergedSale.invoiceNumber} (نقدي)`,
                            amountIn: cashIn, amountOut: cashOut, relatedId: mergedSale.id, paymentMethod: 'cash', timestamp: new Date().toISOString()
                        };
                        batch.set(doc(db, "treasury", String(newTx.id)), newTx);
                    }
                    if (elecIn > 0 || elecOut > 0) {
                        const newTx = {
                            id: nextTreasuryId++,
                            date: mergedSale.date, type: transactionType, description: `${mergedSale.direction} فاتورة #${mergedSale.invoiceNumber} (إلكتروني)`,
                            amountIn: elecIn, amountOut: elecOut, relatedId: mergedSale.id, paymentMethod: 'electronic', timestamp: new Date().toISOString()
                        };
                        batch.set(doc(db, "treasury", String(newTx.id)), newTx);
                    }
                } else if (mergedSale.paymentMethod !== 'آجل') {
                    const method = mergedSale.paymentMethod === 'إلكترونى' ? 'electronic' : 'cash';
                    if (amountIn > 0 || amountOut > 0) {
                        const newTx = {
                            id: nextTreasuryId++,
                            date: mergedSale.date, type: transactionType, description: `${mergedSale.direction} فاتورة #${mergedSale.invoiceNumber}`,
                            amountIn: amountIn, amountOut: amountOut, relatedId: mergedSale.id, paymentMethod: method, timestamp: new Date().toISOString()
                        };
                        batch.set(doc(db, "treasury", String(newTx.id)), newTx);
                    }
                }
            }
        }

        await batch.commit();
        get().addToast('تم تحديث الفاتورة بنجاح', 'success');
    },
    deleteDailySale: async (saleId: number | string) => {
        try {
            const state = get();
            const saleToDelete = state.appData?.dailySales.find(s => String(s.id) === String(saleId));
            if (!saleToDelete) throw new Error("Sale not found!");

            const batch = writeBatch(db);
            const saleDocRef = doc(db, "dailySales", String(saleId));
            batch.delete(saleDocRef);

            const treasuryTransactions = state.appData?.treasury.filter(t => String(t.relatedId) === String(saleId) && ["إيراد مبيعات", "مرتجع مبيعات"].includes(t.type)) || [];
            treasuryTransactions.forEach(t => {
                const tRef = doc(db, "treasury", String(t.id));
                batch.delete(tRef);
            });

            const items = normalizeSaleItems(saleToDelete);
            for (const item of items) {
                const product = state.appData?.products.find(p => String(p.id) === String(item.productId));
                if (product) {
                    const productRef = doc(db, "products", String(item.productId));
                    const quantityToRestore = saleToDelete.direction === 'بيع' ? item.quantity : -item.quantity;
                    batch.update(productRef, { [`stock.${saleToDelete.branchSoldFrom}`]: increment(quantityToRestore) });
                }
            }
            await batch.commit();
            get().addToast('تم حذف الفاتورة بنجاح', 'success');
        } catch (error) {
            console.error("Error deleting daily sale:", error);
            throw error;
        }
    },
    
    fetchDataByDateRange: async (collectionName, startDate, endDate) => {
        try {
            const dateField = collectionName === 'purchaseOrders' ? 'orderDate' : 'date';
            const q = query(
                collection(db, collectionName as string),
                where(dateField, ">=", startDate),
                where(dateField, "<=", endDate)
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => {
                const docData = d.data();
                const id = docData.id ?? d.id;
                return { ...docData, id };
            });
            
            if (collectionName === 'notifications') {
                (data as any[]).sort((a, b) => {
                    const dateA = a.createdAt ? (a.createdAt.seconds ? a.createdAt.seconds * 1000 : a.createdAt) : new Date(a.date).getTime();
                    const dateB = b.createdAt ? (b.createdAt.seconds ? b.createdAt.seconds * 1000 : b.createdAt) : new Date(b.date).getTime();
                    return dateB - dateA;
                });
            }
            
            set(state => {
                const currentData = (state.appData as any)[collectionName] || [];
                const newDataMap = new Map(currentData.map((item: any) => [item.id, item]));
                data.forEach((item: any) => newDataMap.set(item.id, item));
                return { appData: { ...(state.appData as AppData), [collectionName]: Array.from(newDataMap.values()) } };
            });
            get().addToast(`تم جلب بيانات ${collectionName} بنجاح.`, 'success');
        } catch (error: any) {
            if (error.message?.includes('Missing or insufficient permissions')) {
                handleFirestoreError(error, OperationType.LIST, collectionName as string);
            }
            console.error(`Error fetching ${collectionName} by date range:`, error);
            get().addToast(`فشل جلب بيانات ${collectionName}.`, 'error');
        }
    },
    
    fetchProducts: async (lastDoc = null, limitCount = 20, filter?: { category?: string }) => {
        try {
            let constraints: any[] = [orderBy('id', 'desc'), limit(limitCount)];
            
            if (filter?.category && filter.category !== 'all') {
                // Note: Ordering by 'id' with a 'where' filter requires an index on 'mainCategory' + 'id'.
                // If index is missing, this will fail. 
                // Fallback: Filter by category ONLY, then sort client-side or rely on default sort if possible.
                // For now, let's try simple filtering.
                constraints = [where('mainCategory', '==', filter.category), limit(limitCount)];
            }

            if (lastDoc) {
                constraints.push(startAfter(lastDoc));
            }

            const q = query(collection(db, 'products'), ...constraints);
            const snapshot = await getDocs(q);
            const products = snapshot.docs.map(d => ({ ...(d.data() as Product), id: d.data().id ?? d.id }));
            return { products, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
        } catch (error: any) {
            if (error.message?.includes('Missing or insufficient permissions')) {
                handleFirestoreError(error, OperationType.LIST, 'products');
            }
            console.error("Error fetching products:", error);
            // Fallback for missing index error
            return { products: [], lastDoc: null };
        }
    },
    fetchProductsByIds: async (ids: number[]) => {
        if (!ids || ids.length === 0) return [];
        try {
            const state = get();
            const existingProducts = state.appData?.products || [];
            const missingIds = ids.filter(id => !existingProducts.some(p => p.id === id));
            
            if (missingIds.length === 0) {
                return ids.map(id => existingProducts.find(p => p.id === id)).filter(Boolean) as Product[];
            }

            const chunks = [];
            for (let i = 0; i < missingIds.length; i += 10) {
                chunks.push(missingIds.slice(i, i + 10));
            }
            
            const fetchedProducts: Product[] = [];
            for (const chunk of chunks) {
                const q = query(collection(db, 'products'), where('id', 'in', chunk));
                const snapshot = await getDocs(q);
                fetchedProducts.push(...snapshot.docs.map(d => ({ ...(d.data() as Product), id: d.data().id ?? d.id })));
            }

            if (fetchedProducts.length > 0) {
                set(state => ({
                    appData: {
                        ...(state.appData as AppData),
                        products: [...(state.appData?.products || []), ...fetchedProducts]
                    }
                }));
            }

            const allProducts = [...existingProducts, ...fetchedProducts];
            return ids.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as Product[];
        } catch (error: any) {
            if (error.message?.includes('Missing or insufficient permissions')) {
                handleFirestoreError(error, OperationType.LIST, 'products');
            }
            console.error("Error fetching products by IDs:", error);
            return [];
        }
    },
    searchProducts: async (searchQuery: string) => {
        if (!searchQuery.trim()) return [];
        try {
            // Simple search by name (requires exact start match or client-side filtering of a larger set)
            // For true full-text search, Algolia/Typesense is recommended.
            // Here we use a simple range query for "starts with" logic on 'name'
            const q = query(
                collection(db, 'products'), 
                where('name', '>=', searchQuery), 
                where('name', '<=', searchQuery + '\uf8ff'),
                limit(50)
            );
            const snapshot = await getDocs(q);
            const fetchedProducts = snapshot.docs.map(d => ({ ...(d.data() as Product), id: d.data().id ?? d.id }));
            
            if (fetchedProducts.length > 0) {
                set(state => {
                    const existingProducts = state.appData?.products || [];
                    const updatedProducts = existingProducts.map(ep => {
                        const fetched = fetchedProducts.find(fp => fp.id === ep.id);
                        return fetched ? fetched : ep;
                    });
                    const newProducts = fetchedProducts.filter(fp => !existingProducts.some(ep => ep.id === fp.id));
                    
                    return {
                        appData: {
                            ...(state.appData as AppData),
                            products: [...updatedProducts, ...newProducts]
                        }
                    };
                });
            }
            
            return fetchedProducts;
        } catch (error: any) {
            if (error.message?.includes('Missing or insufficient permissions')) {
                handleFirestoreError(error, OperationType.LIST, 'products');
            }
            console.error("Error searching products:", error);
            return [];
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
        const newAdvance = { ...advance, id: maxId + 1, timestamp: new Date().toISOString() };
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
        const batch = writeBatch(db);
        batch.update(doc(db, "advances", String(advanceId)), updates);
        if (updates.amount !== undefined || updates.date !== undefined) {
            const state = get();
            const relatedTx = state.appData?.treasury.find(t => String(t.relatedId) === String(advanceId) && t.type === 'سلفة');
            if (relatedTx) {
                const txUpdates: any = {};
                if (updates.amount !== undefined) txUpdates.amountOut = updates.amount;
                if (updates.date !== undefined) txUpdates.date = updates.date;
                batch.update(doc(db, "treasury", String(relatedTx.id)), txUpdates);
            }
        }
        await batch.commit();
        get().addToast('تم تحديث السلفة بنجاح', 'success');
    },
    deleteAdvance: async (advanceId) => {
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, "advances", String(advanceId)));
            const state = get();
            const relatedTx = state.appData?.treasury.find(t => String(t.relatedId) === String(advanceId) && t.type === 'سلفة');
            if (relatedTx) {
                batch.delete(doc(db, "treasury", String(relatedTx.id)));
            }
            await batch.commit();
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
        const newPayroll = { ...payroll, id: maxId + 1, timestamp: new Date().toISOString() };
        await setDoc(doc(db, "payroll", String(newPayroll.id)), newPayroll);
        if (newPayroll.disbursed > 0) {
            const employeeName = get().appData?.employees.find(e => e.id === newPayroll.employeeId)?.name || 'موظف';
            await get().addTreasuryTransaction({
                date: newPayroll.date, type: 'راتب', description: `راتب لـ ${employeeName}`,
                amountIn: 0, amountOut: newPayroll.disbursed, relatedId: newPayroll.id
            });
        }
        get().addToast('تم إضافة الراتب بنجاح', 'success');
    },
    updatePayroll: async (payrollId, updates) => {
        const batch = writeBatch(db);
        batch.update(doc(db, "payroll", String(payrollId)), updates);
        if (updates.disbursed !== undefined || updates.date !== undefined) {
            const state = get();
            const relatedTx = state.appData?.treasury.find(t => String(t.relatedId) === String(payrollId) && t.type === 'راتب');
            if (relatedTx) {
                const txUpdates: any = {};
                if (updates.disbursed !== undefined) txUpdates.amountOut = updates.disbursed;
                if (updates.date !== undefined) txUpdates.date = updates.date;
                batch.update(doc(db, "treasury", String(relatedTx.id)), txUpdates);
            }
        }
        await batch.commit();
        get().addToast('تم تحديث الراتب بنجاح', 'success');
    },
    deletePayroll: async (payrollId) => {
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, "payroll", String(payrollId)));
            const state = get();
            const relatedTx = state.appData?.treasury.find(t => String(t.relatedId) === String(payrollId) && t.type === 'راتب');
            if (relatedTx) {
                batch.delete(doc(db, "treasury", String(relatedTx.id)));
            }
            await batch.commit();
        } catch(error) {
            console.error("Error deleting payroll:", error);
            throw error;
        }
    },
    
    addSupplier: async (supplier) => {
        const maxId = Math.max(0, ...(get().appData?.suppliers.map(s => Number(s.id) || 0) || []));
        const newSupplier = { ...supplier, id: maxId + 1 };
        await setDoc(doc(db, "suppliers", String(newSupplier.id)), newSupplier);
        get().addToast('تم إضافة المورد بنجاح', 'success');
    },
    updateSupplier: async (supplierId, updates) => {
        await updateDoc(doc(db, "suppliers", String(supplierId)), updates);
        get().addToast('تم تحديث المورد بنجاح', 'success');
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
        try {
            const state = get();
            const maxId = Math.max(0, ...(state.appData?.purchaseOrders.map(o => Number(o.id) || 0) || []));
            const newOrder = { ...order, id: maxId + 1, timestamp: new Date().toISOString() };
            
            const batch = writeBatch(db);
            batch.set(doc(db, "purchaseOrders", String(newOrder.id)), newOrder);

            if (newOrder.status === 'مكتمل' && newOrder.branch) {
                for (const item of newOrder.items) {
                    const productRef = doc(db, "products", String(item.productId));
                    const quantityToAdd = newOrder.type === 'مرتجع' ? -item.quantity : item.quantity;
                    batch.update(productRef, {
                        [`stock.${newOrder.branch}`]: increment(quantityToAdd)
                    });
                }
            }
            
            await batch.commit();
            get().addToast('تم إضافة طلب الشراء بنجاح', 'success');
        } catch (error) {
            console.error("Error adding purchase order:", error);
            throw error;
        }
    },
    updatePurchaseOrder: async (orderId, updates) => {
        try {
            const state = get();
            const oldOrder = state.appData?.purchaseOrders.find(o => String(o.id) === String(orderId));
            if (!oldOrder) throw new Error("Order not found");

            const batch = writeBatch(db);
            batch.update(doc(db, "purchaseOrders", String(orderId)), updates);

            // Revert old stock if it was completed
            if (oldOrder.status === 'مكتمل' && oldOrder.branch) {
                for (const item of oldOrder.items) {
                    const productRef = doc(db, "products", String(item.productId));
                    const quantityToRevert = oldOrder.type === 'مرتجع' ? item.quantity : -item.quantity;
                    batch.update(productRef, {
                        [`stock.${oldOrder.branch}`]: increment(quantityToRevert)
                    });
                }
            }

            // Apply new stock if it is completed
            const newStatus = updates.status !== undefined ? updates.status : oldOrder.status;
            const newBranch = updates.branch !== undefined ? updates.branch : oldOrder.branch;
            const newItems = updates.items !== undefined ? updates.items : oldOrder.items;
            const newType = updates.type !== undefined ? updates.type : oldOrder.type;

            if (newStatus === 'مكتمل' && newBranch) {
                for (const item of newItems) {
                    const productRef = doc(db, "products", String(item.productId));
                    const quantityToAdd = newType === 'مرتجع' ? -item.quantity : item.quantity;
                    batch.update(productRef, {
                        [`stock.${newBranch}`]: increment(quantityToAdd)
                    });
                }
            }

            await batch.commit();
            get().addToast('تم تحديث طلب الشراء بنجاح', 'success');
        } catch (error) {
            console.error("Error updating purchase order:", error);
            throw error;
        }
    },
    deletePurchaseOrder: async (orderId) => {
        try {
            const state = get();
            const order = state.appData?.purchaseOrders.find(o => String(o.id) === String(orderId));
            if (!order) throw new Error("Order not found");

            const batch = writeBatch(db);
            batch.delete(doc(db, "purchaseOrders", String(orderId)));

            if (order.status === 'مكتمل' && order.branch) {
                for (const item of order.items) {
                    const productRef = doc(db, "products", String(item.productId));
                    const quantityToRevert = order.type === 'مرتجع' ? item.quantity : -item.quantity;
                    batch.update(productRef, {
                        [`stock.${order.branch}`]: increment(quantityToRevert)
                    });
                }
            }
            await batch.commit();
            get().addToast('تم حذف طلب الشراء بنجاح', 'success');
        } catch(error) {
            console.error("Error deleting purchase order:", error);
            throw error;
        }
    },
    addPayment: async (payment) => {
        try {
            const maxId = Math.max(0, ...(get().appData?.payments.map(p => Number(p.id) || 0) || []));
            const newPayment = { ...payment, id: maxId + 1, timestamp: new Date().toISOString() };
            await setDoc(doc(db, "payments", String(newPayment.id)), newPayment);
            if (newPayment.payment > 0) {
                const supplierName = get().appData?.suppliers.find(s => s.id === newPayment.supplierId)?.name || 'مورد';
                await get().addTreasuryTransaction({
                    date: newPayment.date, type: 'دفعة لمورد', description: `دفعة لـ ${supplierName}`,
                    amountIn: 0, amountOut: newPayment.payment, relatedId: newPayment.id
                });
            }
            get().addToast('تم إضافة الدفعة بنجاح', 'success');
        } catch (error) {
            console.error("Error adding payment:", error);
            get().addToast('حدث خطأ أثناء إضافة الدفعة', 'error');
            throw error;
        }
    },
    updatePayment: async (paymentId, updates) => {
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, "payments", String(paymentId)), updates);
            if (updates.payment !== undefined || updates.date !== undefined) {
                const state = get();
                const relatedTx = state.appData?.treasury.find(t => String(t.relatedId) === String(paymentId) && t.type === 'دفعة لمورد');
                if (relatedTx) {
                    const txUpdates: any = {};
                    if (updates.payment !== undefined) txUpdates.amountOut = updates.payment;
                    if (updates.date !== undefined) txUpdates.date = updates.date;
                    batch.update(doc(db, "treasury", String(relatedTx.id)), txUpdates);
                }
            }
            await batch.commit();
            get().addToast('تم تحديث الدفعة بنجاح', 'success');
        } catch (error) {
            console.error("Error updating payment:", error);
            get().addToast('حدث خطأ أثناء تحديث الدفعة', 'error');
            throw error;
        }
    },
    deletePayment: async (paymentId) => {
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, "payments", String(paymentId)));
            const state = get();
            const relatedTx = state.appData?.treasury.find(t => String(t.relatedId) === String(paymentId) && t.type === 'دفعة لمورد');
            if (relatedTx) {
                batch.delete(doc(db, "treasury", String(relatedTx.id)));
            }
            await batch.commit();
        } catch(error) {
            console.error("Error deleting payment:", error);
            throw error;
        }
    },
    addExpense: async (expense, skipTreasury = false) => {
        const maxId = Math.max(0, ...(get().appData?.expenses.map(e => Number(e.id) || 0) || []));
        const newExpense = { ...expense, id: maxId + 1, timestamp: new Date().toISOString() };
        await setDoc(doc(db, "expenses", String(newExpense.id)), newExpense);
        if (newExpense.amount > 0 && !skipTreasury) {
            await get().addTreasuryTransaction({
                date: newExpense.date, type: 'مصروف', description: newExpense.name,
                amountIn: 0, amountOut: newExpense.amount, relatedId: newExpense.id
            });
        }
        get().addToast('تم إضافة المصروف بنجاح', 'success');
    },
    updateExpense: async (expenseId, updates) => {
        const batch = writeBatch(db);
        batch.update(doc(db, "expenses", String(expenseId)), updates);
        if (updates.amount !== undefined || updates.date !== undefined || updates.name !== undefined) {
            const state = get();
            const relatedTx = state.appData?.treasury.find(t => String(t.relatedId) === String(expenseId) && t.type === 'مصروف');
            if (relatedTx) {
                const txUpdates: any = {};
                if (updates.amount !== undefined) txUpdates.amountOut = updates.amount;
                if (updates.date !== undefined) txUpdates.date = updates.date;
                if (updates.name !== undefined) txUpdates.description = updates.name;
                batch.update(doc(db, "treasury", String(relatedTx.id)), txUpdates);
            }
        }
        await batch.commit();
        get().addToast('تم تحديث المصروف بنجاح', 'success');
    },
    deleteExpense: async (expenseId) => {
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, "expenses", String(expenseId)));
            const state = get();
            const relatedTx = state.appData?.treasury.find(t => String(t.relatedId) === String(expenseId) && t.type === 'مصروف');
            if (relatedTx) {
                batch.delete(doc(db, "treasury", String(relatedTx.id)));
            }
            await batch.commit();
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
        await setDoc(doc(db, "settings", "storefront"), settings, { merge: true });
    },
    addTreasuryTransaction: async (transaction) => {
        try {
            const maxId = Math.max(0, ...(get().appData?.treasury.map(t => Number(t.id) || 0) || []));
            const newTransaction = { ...transaction, id: maxId + 1, timestamp: new Date().toISOString() };
            await setDoc(doc(db, "treasury", String(newTransaction.id)), newTransaction);
        } catch (error) {
            console.error("Error adding treasury transaction:", error);
            throw error;
        }
    },
    deleteTreasuryTransaction: async (transactionId) => {
        await deleteDoc(doc(db, "treasury", String(transactionId)));
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
        batch.update(productRef, { 
            [`stock.${transfer.fromBranch}`]: increment(-transfer.quantity),
            [`stock.${transfer.toBranch}`]: increment(transfer.quantity)
        });

        const maxId = Math.max(0, ...(appData?.stockTransfers.map(t => Number(t.id) || 0) || []));
        const newTransfer: StockTransfer = { 
            ...transfer, 
            id: maxId + 1,
            timestamp: new Date().toISOString(),
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
            
            // List of API keys to try in order
            const apiKeys = [
                import.meta.env.VITE_IMGBB_API_KEY, // Primary env key
                "6d207e02198a847aa98d0a2a901485a5", // Fallback 1
                "c87eb4683dc6553a29d54d9304027959", // Fallback 2
                "f59b6629158302506353901404390509", // Old key (might work?)
            ].filter(key => key && key !== 'undefined');

            let lastError;

            for (const apiKey of apiKeys) {
                try {
                    console.log(`ImgBB Upload: Trying key ending in ...${apiKey?.slice(-4)}`);
                    const uploadData = new FormData();
                    uploadData.append('image', base64Image);

                    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                        method: 'POST',
                        body: uploadData,
                    });

                    const data = await response.json();

                    if (data.success) {
                        console.log("Image uploaded successfully:", data.data.url);
                        return data.data.url;
                    } else {
                        console.warn(`ImgBB upload failed with key ...${apiKey?.slice(-4)}:`, data);
                        lastError = new Error(data.error?.message || 'ImgBB upload failed');
                    }
                } catch (err) {
                    console.warn(`Network error with key ...${apiKey?.slice(-4)}:`, err);
                    lastError = err;
                }
            }
            
            // If we get here, all keys failed
            throw lastError || new Error("All upload attempts failed");

        } catch (error: any) {
            console.error("Upload error:", error);
            // Throw error to stop order creation if proof is missing
            throw new Error(error.message || 'Image upload failed');
        }
    },
    createOrder: async (customerDetails, items, subtotal, paymentMethod, paymentProof, discountCode, locationLink) => {
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
            try {
                imageUrl = await get().uploadImage(paymentProof, `payment_proofs/${Date.now()}_${paymentProof.name}`);
            } catch (error) {
                console.error("Failed to upload payment proof:", error);
                throw new Error("فشل رفع إيصال الدفع. يرجى المحاولة مرة أخرى.");
            }
        }

        // 3. Create order document with sequential ID using transaction
        try {
            await runTransaction(db, async (transaction) => {
                // READS FIRST
                const counterRef = doc(db, "settings", "counters");
                const counterDoc = await transaction.get(counterRef);
                
                let customerDoc = null;
                const customerRef = auth.currentUser ? doc(db, "customers", auth.currentUser.uid) : null;
                if (customerRef) {
                    customerDoc = await transaction.get(customerRef);
                }
                
                // LOGIC & WRITES
                let newCount = 1;
                if (counterDoc.exists()) {
                    newCount = (counterDoc.data().orderCount || 0) + 1;
                }
                
                const orderId = String(newCount).padStart(3, '0'); // "001", "002"
                
                transaction.set(counterRef, { orderCount: newCount }, { merge: true });
                
                const newOrderRef = doc(db, "orders", orderId);
                const newOrderData: Omit<Order, 'id'> = {
                    date: new Date().toISOString().split('T')[0],
                    timestamp: new Date().toISOString(),
                    createdAt: Timestamp.now(),
                    customerName: customerDetails.name, customerPhone: customerDetails.phone, customerAddress: customerDetails.address,
                    items, 
                    totalAmount: finalTotal, 
                    status: 'pending', 
                    paymentMethod, 
                    paymentProofUrl: imageUrl || undefined, // Ensure undefined if null/empty
                    locationLink: locationLink || undefined,
                    ...validDiscountInfo, // Conditionally adds discountCode and discountAmount
                };
                
                // Remove undefined fields to prevent Firestore errors if strict
                const cleanOrderData = JSON.parse(JSON.stringify(newOrderData));
                transaction.set(newOrderRef, { ...cleanOrderData, id: orderId });
                
                // Add notification for admin
                const notificationRef = doc(collection(db, "notifications"));
                transaction.set(notificationRef, {
                    id: notificationRef.id,
                    date: newOrderData.date,
                    createdAt: Timestamp.now(),
                    message: `طلب جديد #${orderId} من ${customerDetails.name} بقيمة ${formatCurrency(finalTotal)}`,
                    read: false,
                    orderId: orderId,
                    type: 'order',
                    targetGroup: 'admin'
                });

                // Update customer data if user is signed in (even anonymously)
                if (customerRef && auth.currentUser) {
                    const currentOrdersCount = customerDoc && customerDoc.exists() ? (customerDoc.data().ordersCount || 0) : 0;
                    const currentTotalSpent = customerDoc && customerDoc.exists() ? (customerDoc.data().totalSpent || 0) : 0;

                    transaction.set(customerRef, {
                        name: customerDetails.name,
                        phone: customerDetails.phone,
                        address: customerDetails.address,
                        type: 'customer', // Convert visitor to customer
                        lastActive: new Date().toISOString(),
                        ordersCount: currentOrdersCount + 1,
                        totalSpent: currentTotalSpent + finalTotal
                    }, { merge: true });
                }
            });
            
            return imageUrl;
        } catch (error: any) {
            console.error("Transaction failed: ", error);
            throw new Error("فشل إنشاء الطلب: " + error.message);
        }
    },
    
    updateOrderStatus: async (orderId, status, shippingDetails?: { shippingCompany?: string, trackingNumber?: string, shippingNotes?: string }) => {
        const state = get();
        const { appData } = state;
        if (!appData) throw new Error("App data not loaded!");
    
        const orderToUpdate = appData.orders.find(o => o.id === orderId);
        if (!orderToUpdate) throw new Error("Order not found!");
        
        const batch = writeBatch(db);
        
        const updateData: any = { status };
        if (shippingDetails) {
            if (shippingDetails.shippingCompany !== undefined) updateData.shippingCompany = shippingDetails.shippingCompany;
            if (shippingDetails.trackingNumber !== undefined) updateData.trackingNumber = shippingDetails.trackingNumber;
            if (shippingDetails.shippingNotes !== undefined) updateData.shippingNotes = shippingDetails.shippingNotes;
        }
        
        batch.update(doc(db, "orders", String(orderId)), updateData);

        // Add notification for customer/system
        const statusText = status === 'confirmed' ? 'تم التأكيد' : status === 'shipped' ? 'تم الشحن' : status === 'cancelled' ? 'ملغي' : status === 'collected' ? 'تم التحصيل' : status === 'returned' ? 'مرتجع' : 'قيد الانتظار';
        const notificationRef = doc(collection(db, "notifications"));
        batch.set(notificationRef, {
            id: notificationRef.id,
            date: new Date().toISOString().split('T')[0],
            createdAt: Timestamp.now(),
            message: `تم تغيير حالة الطلب #${orderId} إلى ${statusText}`,
            read: false,
            orderId: String(orderId),
            type: 'status_change',
            targetGroup: 'customer'
        });
    
        // Check if sale already exists
        const salesQuery = query(collection(db, "dailySales"), where("invoiceNumber", "==", `ONLINE-${orderId}`));
        const salesSnapshot = await getDocs(salesQuery);
        const wasAlreadyProcessed = !salesSnapshot.empty;
        const existingSaleDoc = wasAlreadyProcessed ? salesSnapshot.docs[0] : null;
        const existingSale = existingSaleDoc ? existingSaleDoc.data() as DailySale : null;

        const isElectronic = orderToUpdate.paymentMethod === 'electronic';
        const isNowBeingProcessed = ['shipped', 'collected'].includes(status);
        const isBeingReverted = ['pending', 'confirmed', 'cancelled', 'returned'].includes(status);

        if (isNowBeingProcessed && !wasAlreadyProcessed) {
            // Logic to create transactions when shipping/collecting an order for the first time
            const seller = appData.users.find(u => u.role === Role.Admin) || appData.users[0];
            if (!seller) throw new Error("No admin seller found.");
            
            const maxSaleId = Math.max(0, ...appData.dailySales.map(s => Number(s.id) || 0));
            const saleItems: SaleItem[] = orderToUpdate.items.map(item => {
                const product = appData.products.find(p => p.id === item.productId);
                if (!product) return null;
                return { productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, itemType: product?.mainCategory || 'أخرى' };
            }).filter((item): item is SaleItem => item !== null);
    
            const isCollected = status === 'collected';
            const paymentMethodStr = isElectronic ? 'إلكترونى' : (isCollected ? 'نقدى' : 'آجل');

            const newSale: DailySale = {
                id: maxSaleId + 1, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(), invoiceNumber: `ONLINE-${orderToUpdate.id}`,
                sellerId: seller.id, sellerName: seller.name, source: 'أونلاين', branchSoldFrom: 'main', 
                direction: 'بيع', items: saleItems, totalAmount: orderToUpdate.totalAmount,
                paymentMethod: paymentMethodStr,
                cashAmount: (!isElectronic && isCollected) ? orderToUpdate.totalAmount : 0,
                electronicAmount: isElectronic ? orderToUpdate.totalAmount : 0,
                remainingDebt: (!isElectronic && !isCollected) ? orderToUpdate.totalAmount : 0,
            };
            batch.set(doc(db, "dailySales", String(newSale.id)), newSale);
            
            if (isElectronic || isCollected) {
                const maxTreasuryId = Math.max(0, ...appData.treasury.map(t => Number(t.id) || 0));
                const newTransaction: TreasuryTransaction = {
                    id: maxTreasuryId + 1, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(), type: 'إيراد مبيعات',
                    description: `طلب أونلاين #${orderToUpdate.id}`, amountIn: orderToUpdate.totalAmount, amountOut: 0, relatedId: orderToUpdate.id,
                    paymentMethod: isElectronic ? 'electronic' : 'cash'
                };
                batch.set(doc(db, "treasury", String(newTransaction.id)), newTransaction);
            }
    
            for (const item of orderToUpdate.items) {
                const product = appData.products.find(p => p.id === item.productId);
                if (product) {
                    batch.update(doc(db, "products", String(item.productId)), { "stock.main": increment(-item.quantity) });
                }
            }
        } else if (isNowBeingProcessed && wasAlreadyProcessed && status === 'collected' && existingSale && existingSale.paymentMethod === 'آجل') {
            // Order was shipped (آجل), now collected (نقدى)
            batch.update(existingSaleDoc!.ref, {
                paymentMethod: 'نقدى',
                cashAmount: orderToUpdate.totalAmount,
                remainingDebt: 0
            });

            // Add to treasury
            const maxTreasuryId = Math.max(0, ...appData.treasury.map(t => Number(t.id) || 0));
            const newTransaction: TreasuryTransaction = {
                id: maxTreasuryId + 1, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(), type: 'إيراد مبيعات',
                description: `تحصيل طلب أونلاين #${orderToUpdate.id}`, amountIn: orderToUpdate.totalAmount, amountOut: 0, relatedId: orderToUpdate.id,
                paymentMethod: 'cash'
            };
            batch.set(doc(db, "treasury", String(newTransaction.id)), newTransaction);

        } else if (isBeingReverted && wasAlreadyProcessed) {
            // Logic to reverse transactions
            if (existingSaleDoc) {
                batch.delete(existingSaleDoc.ref);
            }
    
            const treasuryQuery = query(collection(db, "treasury"), where("relatedId", "==", orderId), where("type", "==", "إيراد مبيعات"));
            const treasurySnapshot = await getDocs(treasuryQuery);
            if (!treasurySnapshot.empty) {
                treasurySnapshot.forEach(doc => batch.delete(doc.ref));
            }
    
            for (const item of orderToUpdate.items) {
                const product = appData.products.find(p => p.id === item.productId);
                if (product) {
                    batch.update(doc(db, "products", String(item.productId)), { "stock.main": increment(item.quantity) });
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
            const state = get();
            const orderToDelete = state.appData?.orders.find(o => String(o.id) === String(orderId));
            if (!orderToDelete) throw new Error(`Order with ID ${orderId} not found!`);
        
            const batch = writeBatch(db);
            const orderDocRef = doc(db, "orders", String(orderId));
            batch.delete(orderDocRef);
        
            const notifications = state.appData?.notifications.filter(n => String(n.orderId) === String(orderId)) || [];
            notifications.forEach(n => {
                const nRef = doc(db, "notifications", String(n.id));
                batch.delete(nRef);
            });
        
            if (['shipped', 'collected'].includes(orderToDelete.status)) {
                const sales = state.appData?.dailySales.filter(s => s.invoiceNumber === `ONLINE-${orderId}`) || [];
                sales.forEach(s => {
                    const sRef = doc(db, "dailySales", String(s.id));
                    batch.delete(sRef);
                });
        
                const treasuryTransactions = state.appData?.treasury.filter(t => String(t.relatedId) === String(orderId) && t.type === "إيراد مبيعات") || [];
                treasuryTransactions.forEach(t => {
                    const tRef = doc(db, "treasury", String(t.id));
                    batch.delete(tRef);
                });
        
                for (const item of orderToDelete.items) {
                    const product = state.appData?.products.find(p => String(p.id) === String(item.productId));
                    if (product) {
                        const productRef = doc(db, "products", String(item.productId));
                        batch.update(productRef, { "stock.main": increment(item.quantity) });
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
    createUser: async (email, pass, role, branch, name, permissions = []) => {
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
                permissions: permissions
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
    updateUser: async (userId, updates) => {
        try {
            await updateDoc(doc(db, "users", userId), updates);
            get().addToast("تم تحديث بيانات المستخدم بنجاح", "success");
        } catch (error: any) {
            console.error("Error updating user:", error);
            throw new Error(error.message || "Failed to update user");
        }
    },
    deleteUser: async (userId) => {
        try {
            await deleteDoc(doc(db, "users", userId));
            get().addToast("تم حذف المستخدم بنجاح", "success");
        } catch (error: any) {
            console.error("Error deleting user:", error);
            throw new Error(error.message || "Failed to delete user");
        }
    },
    updateSettings: async (settings) => {
        await setDoc(doc(db, "settings", "general"), settings, { merge: true });
    },
    saveDeviceToken: async (token: string) => {
        try {
            const userId = get().currentUser?.id || 'anonymous';
            const tokenDocRef = doc(db, "device_tokens", token);
            await setDoc(tokenDocRef, {
                token,
                userId,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving device token:", error);
        }
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

        // Send Push Notification via API
        try {
            const response = await fetch('/api/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'إشعار من الإدارة',
                    body: message
                })
            });
            
            const result = await response.json();
            if (!response.ok) {
                console.warn('Push notification API returned an error:', result.error);
            } else {
                console.log('Push notifications sent successfully:', result);
            }
        } catch (error) {
            console.error('Failed to call push notification API:', error);
        }
    },
    resetTreasury: async (initialBalance) => {
        const currentBalance = get().appData?.treasury.reduce((acc, t) => acc + (t.amountIn || 0) - (t.amountOut || 0), 0) || 0;
        const diff = initialBalance - currentBalance;
        
        if (diff === 0) return;
        
        const transaction: Omit<TreasuryTransaction, 'id'> = {
            date: new Date().toISOString().split('T')[0],
            type: diff > 0 ? 'إيراد آخر' : 'مصروف آخر',
            description: 'تصفية / ضبط رصيد افتتاحي',
            amountIn: diff > 0 ? diff : 0,
            amountOut: diff < 0 ? -diff : 0,
            relatedId: 'ADJUSTMENT-' + Date.now()
        };
        
        await get().addTreasuryTransaction(transaction);
        get().addToast('تم ضبط رصيد الخزينة بنجاح', 'success');
    },
    clearTreasury: async () => {
        const batch = writeBatch(db);
        const state = get();
        const treasuryDocs = state.appData?.treasury || [];
        treasuryDocs.forEach(t => {
            const tRef = doc(db, "treasury", String(t.id));
            batch.delete(tRef);
        });
        await batch.commit();
        get().addToast('تم مسح جميع معاملات الخزينة بنجاح', 'success');
    },
}));

export default useStore;