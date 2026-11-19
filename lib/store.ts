/// <reference types="vite/client" />
import { create } from 'zustand';
import { tenantCollection as collection, tenantDoc as doc, resolveTenantBrandId, applyDynamicPwaAndTheme } from './tenantBootstrap';
import {
    fetchTenantErpState,
    queueTenantErpSync,
    pushTenantErpState,
    getTenantSessionToken,
    loginTenantAdmin,
    saveLocalErpCache,
    loadLocalErpCache,
    hasPendingErpSync,
    createTenantPublicOrder,
} from './tenantErpSync';
import { initializeApp } from 'firebase/app';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    getAuth,
} from 'firebase/auth';
import {
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
    AppCustomization,
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
import { getActiveBranches, createEmptyStockForBranches, getShippingConfig, calculateShippingFee } from './appConfig';

let publicUnsubscribers: Unsubscribe[] = [];
let adminUnsubscribers: Unsubscribe[] = [];
let userProfileUnsubscribe: Unsubscribe | null = null;

function isTenantMode(): boolean {
    return Boolean(resolveTenantBrandId());
}

function nextNumericId(list: Array<{ id?: any }> | undefined): number {
    return Math.max(0, ...(list || []).map((item) => Number(item?.id) || 0)) + 1;
}

function adjustProductsStockMap(
    products: Product[],
    items: Array<{ productId: number | string; quantity: number }>,
    branch: Branch,
    sign: 1 | -1
): Product[] {
    const deltas = new Map<string, number>();
    for (const item of items) {
        const key = String(item.productId);
        deltas.set(key, (deltas.get(key) || 0) + sign * Number(item.quantity || 0));
    }
    return products.map((p) => {
        const delta = deltas.get(String(p.id));
        if (!delta) return p;
        return {
            ...p,
            stock: {
                ...p.stock,
                [branch]: (p.stock?.[branch] || 0) + delta,
            },
        };
    });
}

function buildSaleTreasuryTxs(mergedSale: DailySale, startId: number): TreasuryTransaction[] {
    if (mergedSale.direction === 'هدية') return [];
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

    let nextTreasuryId = startId;
    const out: TreasuryTransaction[] = [];
    const nowIso = new Date().toISOString();

    if (mergedSale.paymentMethod === 'مختلط' && mergedSale.cashAmount && mergedSale.electronicAmount) {
        const cashIn = amountIn > 0 ? Math.abs(mergedSale.cashAmount) : 0;
        const cashOut = amountOut > 0 ? Math.abs(mergedSale.cashAmount) : 0;
        const elecIn = amountIn > 0 ? Math.abs(mergedSale.electronicAmount) : 0;
        const elecOut = amountOut > 0 ? Math.abs(mergedSale.electronicAmount) : 0;

        if (cashIn > 0 || cashOut > 0) {
            out.push({
                id: nextTreasuryId++,
                date: mergedSale.date,
                type: transactionType,
                description: `${mergedSale.direction} فاتورة #${mergedSale.invoiceNumber} (نقدي)`,
                amountIn: cashIn,
                amountOut: cashOut,
                relatedId: mergedSale.id,
                paymentMethod: 'cash',
                timestamp: nowIso,
            } as TreasuryTransaction);
        }
        if (elecIn > 0 || elecOut > 0) {
            out.push({
                id: nextTreasuryId++,
                date: mergedSale.date,
                type: transactionType,
                description: `${mergedSale.direction} فاتورة #${mergedSale.invoiceNumber} (إلكتروني)`,
                amountIn: elecIn,
                amountOut: elecOut,
                relatedId: mergedSale.id,
                paymentMethod: 'electronic',
                timestamp: nowIso,
            } as TreasuryTransaction);
        }
    } else if (mergedSale.paymentMethod !== 'آجل' && (amountIn > 0 || amountOut > 0)) {
        const method = mergedSale.paymentMethod === 'إلكترونى' ? 'electronic' : 'cash';
        out.push({
            id: nextTreasuryId++,
            date: mergedSale.date,
            type: transactionType,
            description: `${mergedSale.direction} فاتورة #${mergedSale.invoiceNumber}`,
            amountIn,
            amountOut,
            relatedId: mergedSale.id,
            paymentMethod: method,
            timestamp: nowIso,
        } as TreasuryTransaction);
    }
    return out;
}

function mapCatalogToProducts(tenantBrand: any, appCustomization?: AppCustomization | null): Product[] {
    const catalog = Array.isArray(tenantBrand?.productsCatalog) ? tenantBrand.productsCatalog : [];
    const fallbackLogo = String(tenantBrand?.logoUrl || '');
    const activeBranches = getActiveBranches(appCustomization || tenantBrand?.appCustomization || null);
    const defaultStock = createEmptyStockForBranches(activeBranches, 25);
    return catalog.map((item: any, idx: number) => {
        const price = Number(item.numericPrice || String(item.price || '').replace(/[^\d.]/g, '')) || 500;
        const images = Array.isArray(item.images) && item.images.length > 0
            ? item.images
            : item.imageUrl
                ? [item.imageUrl]
                : fallbackLogo
                    ? [fallbackLogo]
                    : [];
        const cat = item.category || tenantBrand?.businessType || 'قطع غيار';
        return {
            id: idx + 1,
            name: item.name || `منتج ${idx + 1}`,
            brand: String(item.brand || tenantBrand?.name || ''),
            sku: item.sku || `SKU-${idx + 101}`,
            category: cat,
            subCategory: item.subCategory || cat,
            mainCategory: (item.mainCategory || cat) as MainCategory,
            description: item.description || '',
            purchasePrice: Math.round(price * 0.7),
            sellingPrice: price,
            stock: item.stock || { ...defaultStock },
            imageUrl: item.imageUrl || images[0] || fallbackLogo,
            images,
        } as Product;
    });
}

type AppState = {
    currentUser: User | null;
    isInitialized: boolean; // For admin data
    isPublicInitialized: boolean; // For public data
    isLoading: boolean;
    appData: AppData | null;
    pendingOrderIdToOpen: string | null;
    pendingScan: string | null;
};

type AppActions = {
    setPendingScan: (sku: string | null) => void;
    setPendingOrderIdToOpen: (id: string | null) => void;
    initPublicListeners: () => Promise<void>;
    initAdminListeners: () => Promise<void>;
    clearAdminListeners: () => void;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    setCurrentUser: (user: User) => void;
    setCurrentUserByEmail: (email: string) => Promise<void>;
    clearCurrentUser: () => void;
    switchActiveBranch: (branch: Branch) => void;
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
    createOrder: (customerDetails: { name: string; phone: string; address: string }, items: OrderItem[], totalAmount: number, paymentMethod: Order['paymentMethod'], paymentProof?: File, discountCode?: string, locationLink?: string, shippingInfo?: { shippingZone?: string; deliveryFee?: number }) => Promise<{ orderId?: string | number; totalAmount?: number; deliveryFee?: number; proofUrl?: string }>;
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
    createUser: (email: string, pass: string, role: Role, branch: Branch, name: string, permissions?: Section[], allowedBranches?: Branch[]) => Promise<void>;
    updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    updateSettings: (settings: Partial<Settings>) => Promise<void>;
    updateAppCustomization: (customization: Partial<AppCustomization>) => Promise<void>;
    sendBroadcast: (message: string) => Promise<void>;
    saveDeviceToken: (token: string) => Promise<void>;
    resetTreasury: (initialBalance: number) => Promise<void>;
    clearTreasury: () => Promise<void>;
    resetDatabase: () => Promise<void>;
};

const useStore = create<AppState & AppActions>((set, get) => ({
    currentUser: null,
    isInitialized: false,
    isPublicInitialized: false,
    isLoading: false,
    pendingScan: null,
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
    setPendingScan: (sku: string | null) => {
        set({ pendingScan: sku });
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
        const activeSlug = resolveTenantBrandId();
        if (activeSlug) {
            publicUnsubscribers.forEach(unsub => unsub());
            publicUnsubscribers = [];
            set({ isLoading: true });
            const hasAdminToken = Boolean(getTenantSessionToken(activeSlug));

            const localCache = loadLocalErpCache(activeSlug);
            const brandCustom = (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__?.appCustomization) || undefined;
            if (localCache || brandCustom) {
                isHydratingFromCloud = true;
                set(state => ({
                    appData: {
                        ...(state.appData as AppData),
                        ...(Array.isArray(localCache?.products) && localCache.products.length > 0 ? { products: localCache.products } : {}),
                        ...(Array.isArray(localCache?.broadcasts) ? { broadcasts: localCache.broadcasts } : {}),
                        ...(Array.isArray(localCache?.discountCodes) ? { discountCodes: localCache.discountCodes } : {}),
                        ...(localCache?.storefrontSettings ? { storefrontSettings: localCache.storefrontSettings } : {}),
                        ...(localCache?.settings ? { settings: localCache.settings } : {}),
                        ...((localCache?.appCustomization || brandCustom) ? { appCustomization: localCache?.appCustomization || brandCustom } : {}),
                        ...(hasAdminToken && localCache ? localCache : {}),
                    }
                }));
                isHydratingFromCloud = false;
            }

            try {
                const cloudState = await fetchTenantErpState(activeSlug, getTenantSessionToken(activeSlug));
                if (cloudState && typeof cloudState === 'object') {
                    isHydratingFromCloud = true;
                    set(state => ({
                        appData: {
                            ...(state.appData as AppData),
                            ...(Array.isArray(cloudState.products) && cloudState.products.length > 0 ? { products: cloudState.products } : {}),
                            ...(Array.isArray(cloudState.broadcasts) ? { broadcasts: cloudState.broadcasts } : {}),
                            ...(Array.isArray(cloudState.discountCodes) ? { discountCodes: cloudState.discountCodes } : {}),
                            ...(cloudState.storefrontSettings ? { storefrontSettings: cloudState.storefrontSettings } : {}),
                            ...(cloudState.settings ? { settings: cloudState.settings } : {}),
                            ...(cloudState.appCustomization ? { appCustomization: cloudState.appCustomization } : {}),
                            ...(hasAdminToken ? cloudState : {}),
                        }
                    }));
                    isHydratingFromCloud = false;
                    saveLocalErpCache(activeSlug, get().appData as any);
                }

                const curProducts = get().appData?.products || [];
                if (curProducts.length === 0) {
                    const seeded = mapCatalogToProducts(
                        (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || null,
                        get().appData?.appCustomization || null
                    );
                    if (seeded.length > 0) {
                        isHydratingFromCloud = true;
                        set(state => ({ appData: { ...(state.appData as AppData), products: seeded } }));
                        isHydratingFromCloud = false;
                    }
                }
            } finally {
                set({ isPublicInitialized: true, isLoading: false });
            }
            return;
        }

        set({ isLoading: true });
    
        try {
            publicUnsubscribers.forEach(unsub => unsub());
            publicUnsubscribers = [];
        
            const publicCollections: (keyof AppData)[] = ['broadcasts', 'products'];

            publicCollections.forEach(name => {
                const unsub = onSnapshot(collection(db, name as string), (snapshot) => {
                    let data = snapshot.docs.map(d => ({ ...d.data(), id: d.data().id ?? (isNaN(parseInt(d.id, 10)) ? d.id : parseInt(d.id, 10)) }));

                    // For a newly created tenant brand whose Firestore products collection is still empty,
                    // immediately hydrate storefront products from Ez-Zel's AI-generated productsCatalog.
                    if (name === 'products' && data.length === 0 && resolveTenantBrandId()) {
                        const tenantBrand = (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || null;
                        const catalog = Array.isArray(tenantBrand?.productsCatalog) ? tenantBrand.productsCatalog : [];
                        if (catalog.length > 0) {
                            data = catalog.map((item: any, idx: number) => {
                                const price = Number(item.numericPrice || String(item.price || '').replace(/[^\d.]/g, '')) || 500;
                                return {
                                    id: idx + 1,
                                    name: item.name || `منتج ${idx + 1}`,
                                    sku: `SKU-${idx + 101}`,
                                    category: item.category || tenantBrand?.businessType || 'عام',
                                    description: item.description || '',
                                    purchasePrice: Math.round(price * 0.7),
                                    sellingPrice: price,
                                    stock: { main: 25, branch1: 10, branch2: 10, branch3: 10 },
                                    imageUrl: tenantBrand?.logoUrl || ''
                                };
                            });
                        }
                    }
                    
                    if (name === 'broadcasts') {
                        // Sort broadcasts by date descending
                        (data as any[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    }

                    set(state => ({
                        appData: { ...(state.appData as AppData), [name]: data }
                    }));
                }, (error) => {
                    if (resolveTenantBrandId() && name === 'products') {
                        const tenantBrand = (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || null;
                        const catalog = Array.isArray(tenantBrand?.productsCatalog) ? tenantBrand.productsCatalog : [];
                        const fallbackProducts = catalog.map((item: any, idx: number) => {
                            const price = Number(item.numericPrice || String(item.price || '').replace(/[^\d.]/g, '')) || 500;
                            return {
                                id: idx + 1,
                                name: item.name || `منتج ${idx + 1}`,
                                sku: item.sku || `SKU-${idx + 101}`,
                                category: item.category || 'قطع غيار',
                                description: item.description || '',
                                purchasePrice: Math.round(price * 0.7),
                                sellingPrice: price,
                                stock: { main: 25, branch1: 10, branch2: 10, branch3: 10 },
                                imageUrl: item.imageUrl || tenantBrand?.logoUrl || ''
                            };
                        });
                        set(state => ({
                            isLoading: false,
                            appData: { ...(state.appData as AppData), ...(fallbackProducts.length > 0 ? { products: fallbackProducts } : {}) }
                        }));
                        return;
                    }
                    if (!resolveTenantBrandId() && error.message.includes('Missing or insufficient permissions')) {
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
        const activeSlug = resolveTenantBrandId();
        if (activeSlug) {
            set({ isLoading: true });
            const tenantToken = getTenantSessionToken(activeSlug);
            const localCache = loadLocalErpCache(activeSlug);
            const cloudState = await fetchTenantErpState(activeSlug, tenantToken);

            const curState = get();
            const curAppData = (curState.appData || {}) as AppData;
            const resolvedCustomization =
                cloudState?.appCustomization ||
                localCache?.appCustomization ||
                curAppData.appCustomization ||
                (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__?.appCustomization) ||
                undefined;
            const seededProducts = mapCatalogToProducts(
                (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || null,
                resolvedCustomization
            );
            const resolvedUsers =
                (Array.isArray(cloudState?.users) && cloudState.users.length > 0 && cloudState.users) ||
                (Array.isArray(localCache?.users) && localCache.users.length > 0 && localCache.users) ||
                (curState.currentUser ? [curState.currentUser] : []);

            isHydratingFromCloud = true;
            set({
                isLoading: false,
                isInitialized: true,
                appData: {
                    ...curAppData,
                    ...(localCache || {}),
                    ...(cloudState && typeof cloudState === 'object' ? cloudState : {}),
                    ...(resolvedCustomization ? { appCustomization: resolvedCustomization } : {}),
                    users: resolvedUsers,
                    ...(((cloudState?.products?.length || localCache?.products?.length || curAppData.products?.length || 0) === 0 && seededProducts.length > 0)
                        ? { products: seededProducts }
                        : {}),
                } as AppData,
            });
            isHydratingFromCloud = false;
            saveLocalErpCache(activeSlug, get().appData as any);
            return;
        }
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

            // Auto-seed AI-generated products into tenants/{brandId}/products when an admin logs in and collection is empty
            if (resolveTenantBrandId() && auth.currentUser) {
                const tenantBrand = (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || null;
                const catalog = Array.isArray(tenantBrand?.productsCatalog) ? tenantBrand.productsCatalog : [];
                if (catalog.length > 0) {
                    getDocs(collection(db, 'products')).then(async (snap) => {
                        if (snap.empty) {
                            for (let idx = 0; idx < catalog.length; idx++) {
                                const item = catalog[idx];
                                const price = Number(item.numericPrice || String(item.price || '').replace(/[^\d.]/g, '')) || 500;
                                const prodId = idx + 1;
                                await setDoc(doc(db, 'products', String(prodId)), {
                                    id: prodId,
                                    name: item.name || `منتج ${prodId}`,
                                    sku: `SKU-${idx + 101}`,
                                    category: item.category || tenantBrand?.businessType || 'عام',
                                    description: item.description || '',
                                    purchasePrice: Math.round(price * 0.7),
                                    sellingPrice: price,
                                    stock: { main: 25, branch1: 10, branch2: 10, branch3: 10 },
                                    imageUrl: tenantBrand?.logoUrl || ''
                                });
                            }
                        }
                    }).catch(() => {});
                }
            }

            const collectionsToListen: (keyof AppData)[] = [
                'users', 'dailySales', 'employees', 'advances', 'attendance', 'payroll', 'suppliers', 
                'purchaseOrders', 'payments', 'expenses', 'treasury', 'dailyReview', 
                'notifications', 'stockTransfers', 'orders', 'broadcasts', 'products'
            ];
            
            const largeCollections = ['dailySales', 'expenses', 'treasury', 'purchaseOrders', 'payments', 'attendance', 'payroll', 'stockTransfers', 'dailyReview', 'orders'];
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    
            collectionsToListen.forEach(name => {
                let collectionQuery = query(collection(db, name as string));
                
                if (largeCollections.includes(name)) {
                    const dateField = name === 'purchaseOrders' ? 'orderDate' : 'date';
                    collectionQuery = query(collection(db, name as string), where(dateField, ">=", startOfMonthStr));
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
        set((state) => {
            if (!state.appData) return { isInitialized: false };
            return {
                isInitialized: false,
                appData: {
                    ...state.appData,
                    users: [], dailySales: [], employees: [], advances: [],
                    attendance: [], payroll: [], suppliers: [], purchaseOrders: [],
                    payments: [], expenses: [], treasury: [], dailyReview: [],
                    notifications: [], stockTransfers: [], orders: [], broadcasts: []
                }
            };
        });
    },

    login: async (email, pass) => {
        const brandSlug = resolveTenantBrandId();
        if (brandSlug) {
            const data = await loginTenantAdmin(brandSlug, email, pass);
            if (!data.ok || !data.user || !data.token) {
                const err: any = new Error(data.error || 'بيانات الدخول غير صحيحة');
                err.code = 'auth/invalid-credential';
                throw err;
            }
            try {
                localStorage.setItem(`t2_tenant_session_${brandSlug}`, JSON.stringify({ token: data.token, user: data.user }));
            } catch {}
            set({ currentUser: data.user as any });
            const cloudState = await fetchTenantErpState(brandSlug, data.token);
            const resolvedCustom =
                cloudState?.appCustomization ||
                get().appData?.appCustomization ||
                (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__?.appCustomization) ||
                undefined;
            const seededProducts = mapCatalogToProducts(
                (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || null,
                resolvedCustom
            );
            isHydratingFromCloud = true;
            set(state => {
                const prev = state.appData as AppData;
                const merged = {
                    ...prev,
                    ...(cloudState && typeof cloudState === 'object' ? cloudState : {}),
                    ...(resolvedCustom ? { appCustomization: resolvedCustom } : {}),
                } as AppData;
                if (!Array.isArray(merged.users) || merged.users.length === 0) {
                    merged.users = [data.user as User];
                }
                if ((!Array.isArray(merged.products) || merged.products.length === 0) && seededProducts.length > 0) {
                    merged.products = seededProducts;
                }
                return { isInitialized: true, isLoading: false, appData: merged };
            });
            isHydratingFromCloud = false;
            saveLocalErpCache(brandSlug, get().appData as any);
            return;
        }
        await signInWithEmailAndPassword(auth, email, pass);
    },
    logout: async () => {
        const brandSlug = resolveTenantBrandId();
        if (brandSlug) {
            try { localStorage.removeItem(`t2_tenant_session_${brandSlug}`); } catch {}
            set({ currentUser: null });
        }
        await signOut(auth).catch(() => {});
        window.location.hash = '';
    },
    setCurrentUser: (user) => set({ currentUser: user }),
    switchActiveBranch: (branch) => set((state) => {
        if (state.currentUser) {
            return { currentUser: { ...state.currentUser, branch } };
        }
        return state;
    }),
    setCurrentUserByEmail: async (email) => {
        if (userProfileUnsubscribe) {
            userProfileUnsubscribe();
            userProfileUnsubscribe = null;
        }
        try {
            const q = query(collection(db, "users"), where("username", "==", email.toLowerCase()));
            userProfileUnsubscribe = onSnapshot(q, (querySnapshot) => {
                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    const remoteUser = { ...userDoc.data(), id: userDoc.id } as User;
                    const prevUser = get().currentUser;
                    
                    // Only update state if something actually changed to avoid unnecessary renders
                    if (!prevUser || JSON.stringify(prevUser) !== JSON.stringify(remoteUser)) {
                        set({ currentUser: remoteUser });
                    }
                } else {
                    const tenantBrand = (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || null;
                    if (resolveTenantBrandId() && auth.currentUser && (!tenantBrand?.adminEmail || email.toLowerCase() === tenantBrand.adminEmail.toLowerCase())) {
                        const adminUser: User = {
                            id: auth.currentUser.uid,
                            username: email.toLowerCase(),
                            name: tenantBrand?.name ? `مدير ${tenantBrand.name}` : 'مدير النظام',
                            role: 'admin',
                            branch: 'main',
                            permissions: ['daily-sales', 'store-management', 'treasury', 'expenses', 'employees', 'payroll', 'advances', 'attendance', 'suppliers', 'purchasing', 'daily-review', 'orders']
                        } as any;
                        setDoc(doc(db, 'users', auth.currentUser.uid), adminUser).catch(() => {});
                        set({ currentUser: adminUser });
                        return;
                    }
                    console.warn(`User profile not found in DB for email: ${email}. Logging out.`);
                    get().logout();
                }
            }, (error) => {
                console.error("Error listening to user profile:", error);
            });
        } catch (error) {
            console.error("Error setting up user profile snapshot:", error);
            await get().logout();
        }
    },
    clearCurrentUser: () => {
        if (userProfileUnsubscribe) {
            userProfileUnsubscribe();
            userProfileUnsubscribe = null;
        }
        set({ currentUser: null });
    },
    
    setProducts: async (products) => {
        if (isTenantMode()) {
            set(state => ({
                appData: { ...(state.appData as AppData), products }
            }));
            return;
        }
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
        if (!isTenantMode()) {
            await setDoc(doc(db, "products", String(newId)), newProduct);
        }
        
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
        if (!isTenantMode()) {
            await updateDoc(doc(db, "products", String(productId)), updates);
        }
        
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
        if (!isTenantMode()) {
            const docRef = doc(db, "products", String(productId));
            await updateDoc(docRef, {
                [`stock.${branch}`]: increment(change)
            });
        }
        
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
            if (!isTenantMode()) {
                await deleteDoc(doc(db, "products", String(productId)));
            }
            
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
            if (!isTenantMode()) {
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
        const newSale = { ...sale, id: nextNumericId(get().appData?.dailySales), timestamp: new Date().toISOString() } as DailySale;
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    dailySales: [...(state.appData?.dailySales || []), newSale],
                }
            }));
            get().addToast('تم حفظ الفاتورة بنجاح', 'success');
            return newSale;
        }
        await setDoc(doc(db, "dailySales", String(newSale.id)), newSale);
        get().addToast('تم حفظ الفاتورة بنجاح', 'success');
        return newSale;
    },
    updateDailySale: async (saleId, updates) => {
        const state = get();
        const existingSale = state.appData?.dailySales.find(s => String(s.id) === String(saleId));
        if (isTenantMode()) {
            if (existingSale) {
                const mergedSale = { ...existingSale, ...updates } as DailySale;
                const remainingTreasury = (state.appData?.treasury || []).filter(
                    t => !(String(t.relatedId) === String(saleId) && ["إيراد مبيعات", "مرتجع مبيعات"].includes(t.type))
                );
                const generatedTxs = buildSaleTreasuryTxs(mergedSale, nextNumericId(remainingTreasury));
                set(s => ({
                    appData: {
                        ...(s.appData as AppData),
                        dailySales: (s.appData?.dailySales || []).map(x => String(x.id) === String(saleId) ? mergedSale : x),
                        treasury: [...remainingTreasury, ...generatedTxs],
                    }
                }));
            }
            get().addToast('تم تحديث الفاتورة بنجاح', 'success');
            return;
        }

        const batch = writeBatch(db);
        batch.update(doc(db, "dailySales", String(saleId)), updates);

        if (existingSale) {
            const mergedSale = { ...existingSale, ...updates } as DailySale;
            const relatedTxs = state.appData?.treasury.filter(t => String(t.relatedId) === String(saleId) && ["إيراد مبيعات", "مرتجع مبيعات"].includes(t.type)) || [];
            
            relatedTxs.forEach(t => {
                batch.delete(doc(db, "treasury", String(t.id)));
            });

            const generatedTxs = buildSaleTreasuryTxs(mergedSale, nextNumericId(state.appData?.treasury));
            generatedTxs.forEach(newTx => {
                batch.set(doc(db, "treasury", String(newTx.id)), newTx);
            });
        }

        await batch.commit();
        get().addToast('تم تحديث الفاتورة بنجاح', 'success');
    },
    deleteDailySale: async (saleId: number | string) => {
        try {
            const state = get();
            const saleToDelete = state.appData?.dailySales.find(s => String(s.id) === String(saleId));
            if (!saleToDelete) throw new Error("Sale not found!");

            if (isTenantMode()) {
                const items = normalizeSaleItems(saleToDelete);
                const stockDeltaByProduct = new Map<string, number>();
                for (const item of items) {
                    const delta = saleToDelete.direction === 'بيع' ? item.quantity : -item.quantity;
                    stockDeltaByProduct.set(String(item.productId), (stockDeltaByProduct.get(String(item.productId)) || 0) + delta);
                }
                set(s => {
                    const cur = s.appData as AppData;
                    return {
                        appData: {
                            ...cur,
                            dailySales: (cur.dailySales || []).filter(x => String(x.id) !== String(saleId)),
                            treasury: (cur.treasury || []).filter(t => !(String(t.relatedId) === String(saleId) && ["إيراد مبيعات", "مرتجع مبيعات"].includes(t.type))),
                            products: (cur.products || []).map(p => {
                                const delta = stockDeltaByProduct.get(String(p.id));
                                if (!delta) return p;
                                return {
                                    ...p,
                                    stock: {
                                        ...p.stock,
                                        [saleToDelete.branchSoldFrom]: (p.stock?.[saleToDelete.branchSoldFrom] || 0) + delta,
                                    },
                                };
                            }),
                        },
                    };
                });
                get().addToast('تم حذف الفاتورة بنجاح', 'success');
                return;
            }

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
        if (isTenantMode()) {
            return;
        }
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
        const activeSlug = resolveTenantBrandId();
        if (activeSlug) {
            let list: Product[] = get().appData?.products || [];
            if (list.length === 0) {
                const cloud = await fetchTenantErpState(activeSlug, getTenantSessionToken(activeSlug));
                if (Array.isArray(cloud?.products) && cloud.products.length > 0) {
                    list = cloud.products;
                    isHydratingFromCloud = true;
                    set(state => ({ isLoading: false, appData: { ...(state.appData as AppData), products: list } }));
                    isHydratingFromCloud = false;
                } else {
                    list = mapCatalogToProducts((typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || null);
                    if (list.length > 0) {
                        set(state => ({ isLoading: false, appData: { ...(state.appData as AppData), products: list } }));
                    }
                }
            }
            const cat = filter?.category;
            const filtered = (cat && cat !== 'all')
                ? list.filter((p: any) => p.mainCategory === cat || p.category === cat)
                : list;
            return { products: filtered.slice(0, limitCount), lastDoc: null };
        }
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
        if (isTenantMode()) {
            const existingProducts = get().appData?.products || [];
            return ids.map(id => existingProducts.find(p => Number(p.id) === Number(id))).filter(Boolean) as Product[];
        }
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
        const activeSlug = resolveTenantBrandId();
        if (activeSlug) {
            const qLower = searchQuery.trim().toLowerCase();
            const list: Product[] = get().appData?.products || [];
            return list.filter((p: any) =>
                String(p.name || '').toLowerCase().includes(qLower) ||
                String(p.sku || '').toLowerCase().includes(qLower) ||
                String(p.category || '').toLowerCase().includes(qLower)
            );
        }
        try {
            // Search by name
            const nameQuery = query(
                collection(db, 'products'), 
                where('name', '>=', searchQuery), 
                where('name', '<=', searchQuery + '\uf8ff'),
                limit(50)
            );
            
            // Search by SKU
            const skuQuery = query(
                collection(db, 'products'),
                where('sku', '==', searchQuery),
                limit(5)
            );

            const [nameSnapshot, skuSnapshot] = await Promise.all([getDocs(nameQuery), getDocs(skuQuery)]);
            
            const fetchedProductsMap = new Map<string, Product>();
            
            [...nameSnapshot.docs, ...skuSnapshot.docs].forEach(d => {
                fetchedProductsMap.set(d.id, { ...(d.data() as Product), id: d.data().id ?? d.id });
            });

            // If empty, maybe the query is the actual document ID?
            if (fetchedProductsMap.size === 0 && searchQuery.length < 30) {
                 try {
                     const docRef = doc(db, 'products', searchQuery);
                     const docSnap = await getDoc(docRef);
                     if (docSnap.exists()) {
                         fetchedProductsMap.set(docSnap.id, { ...(docSnap.data() as Product), id: docSnap.data().id ?? docSnap.id });
                     }
                 } catch (e) {
                     // ignore if ID format is invalid
                 }
            }
            
            const fetchedProducts = Array.from(fetchedProductsMap.values());
            
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
        const newEmployee = { ...employee, id: nextNumericId(get().appData?.employees) } as Employee;
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    employees: [...(state.appData?.employees || []), newEmployee],
                }
            }));
            return;
        }
        await setDoc(doc(db, "employees", String(newEmployee.id)), newEmployee);
    },
    updateEmployee: async (employeeId, updates) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    employees: (state.appData?.employees || []).map(e => String(e.id) === String(employeeId) ? { ...e, ...updates } : e),
                }
            }));
            return;
        }
        await updateDoc(doc(db, "employees", String(employeeId)), updates);
    },
    deleteEmployee: async (employeeId) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    employees: (state.appData?.employees || []).filter(e => String(e.id) !== String(employeeId)),
                }
            }));
            return;
        }
        try {
             await deleteDoc(doc(db, "employees", String(employeeId)));
        } catch(error) {
            console.error("Error deleting employee:", error);
            throw error;
        }
    },
    addAdvance: async (advance) => {
        const newAdvance = { ...advance, id: nextNumericId(get().appData?.advances), timestamp: new Date().toISOString() } as Advance;
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    advances: [...(state.appData?.advances || []), newAdvance],
                }
            }));
        } else {
            await setDoc(doc(db, "advances", String(newAdvance.id)), newAdvance);
        }
        if (newAdvance.amount > 0 || newAdvance.payment > 0) {
            const employeeName = get().appData?.employees.find(e => e.id === newAdvance.employeeId)?.name || 'موظف';
            const isRepayment = newAdvance.amount === 0 && newAdvance.payment > 0;
            
            await get().addTreasuryTransaction({
                date: newAdvance.date, 
                type: isRepayment ? 'سداد سلفة' : 'سلفة', 
                description: isRepayment ? `سداد سلفة من ${employeeName}` : `سلفة لـ ${employeeName}`,
                amountIn: isRepayment ? newAdvance.payment : 0, 
                amountOut: isRepayment ? 0 : newAdvance.amount, 
                relatedId: newAdvance.id,
                paymentMethod: 'cash'
            });
        }
    },
    updateAdvance: async (advanceId, updates) => {
        if (isTenantMode()) {
            const state = get();
            const existing = state.appData?.advances.find(a => String(a.id) === String(advanceId));
            let nextTreasury = [...(state.appData?.treasury || [])];
            if (updates.amount !== undefined || updates.payment !== undefined || updates.date !== undefined) {
                const relatedIdx = nextTreasury.findIndex(t => String(t.relatedId) === String(advanceId) && (t.type === 'سلفة' || t.type === 'سداد سلفة'));
                if (relatedIdx >= 0) {
                    const txUpdates: any = {};
                    if (updates.amount !== undefined) txUpdates.amountOut = updates.amount;
                    if (updates.payment !== undefined) txUpdates.amountIn = updates.payment;
                    if (updates.date !== undefined) txUpdates.date = updates.date;
                    nextTreasury[relatedIdx] = { ...nextTreasury[relatedIdx], ...txUpdates };
                } else if (existing) {
                    const finalAmount = updates.amount !== undefined ? updates.amount : existing.amount;
                    const finalPayment = updates.payment !== undefined ? updates.payment : (existing.payment || 0);
                    const finalDate = updates.date !== undefined ? updates.date : existing.date;
                    if (finalAmount > 0 || finalPayment > 0) {
                        const employeeName = state.appData?.employees.find(e => e.id === existing.employeeId)?.name || 'موظف';
                        const isRepayment = finalAmount === 0 && finalPayment > 0;
                        nextTreasury.push({
                            id: nextNumericId(nextTreasury),
                            date: finalDate,
                            type: isRepayment ? 'سداد سلفة' : 'سلفة',
                            description: isRepayment ? `سداد سلفة من ${employeeName}` : `سلفة لـ ${employeeName}`,
                            amountIn: isRepayment ? finalPayment : 0,
                            amountOut: isRepayment ? 0 : finalAmount,
                            relatedId: existing.id,
                            paymentMethod: 'cash',
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
            }
            set(s => ({
                appData: {
                    ...(s.appData as AppData),
                    advances: (s.appData?.advances || []).map(a => String(a.id) === String(advanceId) ? { ...a, ...updates } : a),
                    treasury: nextTreasury,
                }
            }));
            get().addToast('تم تحديث السلفة بنجاح', 'success');
            return;
        }
        const batch = writeBatch(db);
        batch.update(doc(db, "advances", String(advanceId)), updates);
        
        if (updates.amount !== undefined || updates.payment !== undefined || updates.date !== undefined) {
            const state = get();
            const relatedTx = state.appData?.treasury.find(t => String(t.relatedId) === String(advanceId) && (t.type === 'سلفة' || t.type === 'سداد سلفة'));
            if (relatedTx) {
                const txUpdates: any = {};
                // Repayments update amountIn, Advances update amountOut
                if (updates.amount !== undefined) txUpdates.amountOut = updates.amount;
                if (updates.payment !== undefined) txUpdates.amountIn = updates.payment;
                if (updates.date !== undefined) txUpdates.date = updates.date;
                batch.update(doc(db, "treasury", String(relatedTx.id)), txUpdates);
            } else {
                const advance = state.appData?.advances.find(a => String(a.id) === String(advanceId));
                if (advance) {
                    const finalAmount = updates.amount !== undefined ? updates.amount : advance.amount;
                    const finalPayment = updates.payment !== undefined ? updates.payment : (advance.payment || 0);
                    const finalDate = updates.date !== undefined ? updates.date : advance.date;
                    
                    if (finalAmount > 0 || finalPayment > 0) {
                        const employeeName = state.appData?.employees.find(e => e.id === advance.employeeId)?.name || 'موظف';
                        const isRepayment = finalAmount === 0 && finalPayment > 0;
                        
                        await get().addTreasuryTransaction({
                            date: finalDate, 
                            type: isRepayment ? 'سداد سلفة' : 'سلفة', 
                            description: isRepayment ? `سداد سلفة من ${employeeName}` : `سلفة لـ ${employeeName}`,
                            amountIn: isRepayment ? finalPayment : 0, 
                            amountOut: isRepayment ? 0 : finalAmount, 
                            relatedId: advance.id,
                            paymentMethod: 'cash'
                        });
                    }
                }
            }
        }
        await batch.commit();
        get().addToast('تم تحديث السلفة بنجاح', 'success');
    },
    deleteAdvance: async (advanceId) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    advances: (state.appData?.advances || []).filter(a => String(a.id) !== String(advanceId)),
                    treasury: (state.appData?.treasury || []).filter(t => !(String(t.relatedId) === String(advanceId) && (t.type === 'سلفة' || t.type === 'سداد سلفة'))),
                }
            }));
            return;
        }
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, "advances", String(advanceId)));
            const state = get();
            const relatedTx = state.appData?.treasury.find(t => String(t.relatedId) === String(advanceId) && (t.type === 'سلفة' || t.type === 'سداد سلفة'));
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
        if (isTenantMode()) {
            set(state => ({
                appData: { ...(state.appData as AppData), attendance }
            }));
            return;
        }
        const batch = writeBatch(db);
        attendance.forEach(a => batch.set(doc(db, "attendance", String(a.id)), a));
        await batch.commit();
    },
    addPayroll: async (payroll) => {
        const newPayroll = { ...payroll, id: nextNumericId(get().appData?.payroll), timestamp: new Date().toISOString() } as Payroll;
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    payroll: [...(state.appData?.payroll || []), newPayroll],
                }
            }));
        } else {
            await setDoc(doc(db, "payroll", String(newPayroll.id)), newPayroll);
        }
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
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    payroll: (state.appData?.payroll || []).map(p => String(p.id) === String(payrollId) ? { ...p, ...updates } : p),
                    treasury: (state.appData?.treasury || []).map(t => {
                        if (String(t.relatedId) === String(payrollId) && t.type === 'راتب') {
                            return {
                                ...t,
                                ...(updates.disbursed !== undefined ? { amountOut: updates.disbursed } : {}),
                                ...(updates.date !== undefined ? { date: updates.date } : {}),
                            };
                        }
                        return t;
                    }),
                }
            }));
            get().addToast('تم تحديث الراتب بنجاح', 'success');
            return;
        }
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
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    payroll: (state.appData?.payroll || []).filter(p => String(p.id) !== String(payrollId)),
                    treasury: (state.appData?.treasury || []).filter(t => !(String(t.relatedId) === String(payrollId) && t.type === 'راتب')),
                }
            }));
            return;
        }
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
        const newSupplier = { ...supplier, id: nextNumericId(get().appData?.suppliers) } as Supplier;
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    suppliers: [...(state.appData?.suppliers || []), newSupplier],
                }
            }));
            get().addToast('تم إضافة المورد بنجاح', 'success');
            return;
        }
        await setDoc(doc(db, "suppliers", String(newSupplier.id)), newSupplier);
        get().addToast('تم إضافة المورد بنجاح', 'success');
    },
    updateSupplier: async (supplierId, updates) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    suppliers: (state.appData?.suppliers || []).map(s => String(s.id) === String(supplierId) ? { ...s, ...updates } : s),
                }
            }));
            get().addToast('تم تحديث المورد بنجاح', 'success');
            return;
        }
        await updateDoc(doc(db, "suppliers", String(supplierId)), updates);
        get().addToast('تم تحديث المورد بنجاح', 'success');
    },
    deleteSupplier: async (supplierId) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    suppliers: (state.appData?.suppliers || []).filter(s => String(s.id) !== String(supplierId)),
                    payments: (state.appData?.payments || []).filter(p => String(p.supplierId) !== String(supplierId)),
                }
            }));
            return;
        }
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
            const newOrder = { ...order, id: nextNumericId(state.appData?.purchaseOrders), timestamp: new Date().toISOString() } as PurchaseOrder;
            if (isTenantMode()) {
                set(s => {
                    const cur = s.appData as AppData;
                    let nextProducts = cur.products || [];
                    if (newOrder.status === 'مكتمل' && newOrder.branch) {
                        nextProducts = adjustProductsStockMap(nextProducts, newOrder.items, newOrder.branch, newOrder.type === 'مرتجع' ? -1 : 1);
                    }
                    return {
                        appData: {
                            ...cur,
                            purchaseOrders: [...(cur.purchaseOrders || []), newOrder],
                            products: nextProducts,
                        },
                    };
                });
                get().addToast('تم إضافة طلب الشراء بنجاح', 'success');
                return;
            }
            
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

            if (isTenantMode()) {
                set(s => {
                    const cur = s.appData as AppData;
                    let nextProducts = cur.products || [];
                    if (oldOrder.status === 'مكتمل' && oldOrder.branch) {
                        nextProducts = adjustProductsStockMap(nextProducts, oldOrder.items, oldOrder.branch, oldOrder.type === 'مرتجع' ? 1 : -1);
                    }
                    const mergedOrder = { ...oldOrder, ...updates } as PurchaseOrder;
                    if (mergedOrder.status === 'مكتمل' && mergedOrder.branch) {
                        nextProducts = adjustProductsStockMap(nextProducts, mergedOrder.items, mergedOrder.branch, mergedOrder.type === 'مرتجع' ? -1 : 1);
                    }
                    return {
                        appData: {
                            ...cur,
                            purchaseOrders: (cur.purchaseOrders || []).map(o => String(o.id) === String(orderId) ? mergedOrder : o),
                            products: nextProducts,
                        },
                    };
                });
                get().addToast('تم تحديث طلب الشراء بنجاح', 'success');
                return;
            }

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

            if (isTenantMode()) {
                set(s => {
                    const cur = s.appData as AppData;
                    let nextProducts = cur.products || [];
                    if (order.status === 'مكتمل' && order.branch) {
                        nextProducts = adjustProductsStockMap(nextProducts, order.items, order.branch, order.type === 'مرتجع' ? 1 : -1);
                    }
                    return {
                        appData: {
                            ...cur,
                            purchaseOrders: (cur.purchaseOrders || []).filter(o => String(o.id) !== String(orderId)),
                            products: nextProducts,
                        },
                    };
                });
                get().addToast('تم حذف طلب الشراء بنجاح', 'success');
                return;
            }

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
            const newPayment = { ...payment, id: nextNumericId(get().appData?.payments), timestamp: new Date().toISOString() } as Payment;
            if (isTenantMode()) {
                set(state => ({
                    appData: {
                        ...(state.appData as AppData),
                        payments: [...(state.appData?.payments || []), newPayment],
                    }
                }));
            } else {
                await setDoc(doc(db, "payments", String(newPayment.id)), newPayment);
            }
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
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    payments: (state.appData?.payments || []).map(p => String(p.id) === String(paymentId) ? { ...p, ...updates } : p),
                    treasury: (state.appData?.treasury || []).map(t => {
                        if (String(t.relatedId) === String(paymentId) && t.type === 'دفعة لمورد') {
                            return {
                                ...t,
                                ...(updates.payment !== undefined ? { amountOut: updates.payment } : {}),
                                ...(updates.date !== undefined ? { date: updates.date } : {}),
                            };
                        }
                        return t;
                    }),
                }
            }));
            get().addToast('تم تحديث الدفعة بنجاح', 'success');
            return;
        }
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
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    payments: (state.appData?.payments || []).filter(p => String(p.id) !== String(paymentId)),
                    treasury: (state.appData?.treasury || []).filter(t => !(String(t.relatedId) === String(paymentId) && t.type === 'دفعة لمورد')),
                }
            }));
            return;
        }
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
        const newExpense = { ...expense, id: nextNumericId(get().appData?.expenses), timestamp: new Date().toISOString() } as Expense;
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    expenses: [...(state.appData?.expenses || []), newExpense],
                }
            }));
        } else {
            await setDoc(doc(db, "expenses", String(newExpense.id)), newExpense);
        }
        if (newExpense.amount > 0 && !skipTreasury) {
            await get().addTreasuryTransaction({
                date: newExpense.date, type: 'مصروف', description: newExpense.name,
                amountIn: 0, amountOut: newExpense.amount, relatedId: newExpense.id
            });
        }
        get().addToast('تم إضافة المصروف بنجاح', 'success');
    },
    updateExpense: async (expenseId, updates) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    expenses: (state.appData?.expenses || []).map(e => String(e.id) === String(expenseId) ? { ...e, ...updates } : e),
                    treasury: (state.appData?.treasury || []).map(t => {
                        if (String(t.relatedId) === String(expenseId) && t.type === 'مصروف') {
                            return {
                                ...t,
                                ...(updates.amount !== undefined ? { amountOut: updates.amount } : {}),
                                ...(updates.date !== undefined ? { date: updates.date } : {}),
                                ...(updates.name !== undefined ? { description: updates.name } : {}),
                            };
                        }
                        return t;
                    }),
                }
            }));
            get().addToast('تم تحديث المصروف بنجاح', 'success');
            return;
        }
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
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    expenses: (state.appData?.expenses || []).filter(e => String(e.id) !== String(expenseId)),
                    treasury: (state.appData?.treasury || []).filter(t => !(String(t.relatedId) === String(expenseId) && t.type === 'مصروف')),
                }
            }));
            return;
        }
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
        if (isTenantMode()) {
            set(state => ({
                appData: { ...(state.appData as AppData), dailyReview: reviews }
            }));
            return;
        }
        const batch = writeBatch(db);
        reviews.forEach(r => batch.set(doc(db, "dailyReview", String(r.id)), r));
        await batch.commit();
    },
    deleteDailyReview: async (reviewId: number) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    dailyReview: (state.appData?.dailyReview || []).filter(r => String(r.id) !== String(reviewId)),
                }
            }));
            return;
        }
        try {
            await deleteDoc(doc(db, "dailyReview", String(reviewId)));
        } catch (error) {
            console.error("Error deleting daily review:", error);
            throw error;
        }
    },
    updateStorefrontSettings: async (settings) => {
        const merged = { ...(get().appData?.storefrontSettings || {}), ...settings };
        set(state => ({
            appData: { ...(state.appData as AppData), storefrontSettings: merged }
        }));
        if (typeof window !== 'undefined') {
            (window as any).__TENANT_STOREFRONT_SETTINGS__ = merged;
            if ((merged as any).primaryColor) {
                applyDynamicPwaAndTheme({
                    name: ((window as any).__TENANT_BRAND__?.name) || 'المتجر',
                    primaryColor: (merged as any).primaryColor,
                    logoUrl: ((window as any).__TENANT_BRAND__?.logoUrl) || '',
                });
            }
        }
        if (resolveTenantBrandId()) return;
        await setDoc(doc(db, "settings", "storefront"), merged, { merge: true });
    },
    addTreasuryTransaction: async (transaction) => {
        const newTransaction = { ...transaction, id: nextNumericId(get().appData?.treasury), timestamp: new Date().toISOString() } as TreasuryTransaction;
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    treasury: [...(state.appData?.treasury || []), newTransaction],
                }
            }));
            return;
        }
        try {
            await setDoc(doc(db, "treasury", String(newTransaction.id)), newTransaction);
        } catch (error) {
            console.error("Error adding treasury transaction:", error);
            throw error;
        }
    },
    deleteTreasuryTransaction: async (transactionId) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    treasury: (state.appData?.treasury || []).filter(t => String(t.id) !== String(transactionId)),
                }
            }));
            return;
        }
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

        const newTransfer: StockTransfer = { 
            ...transfer, 
            id: nextNumericId(appData?.stockTransfers),
            timestamp: new Date().toISOString(),
            productName: product.name,
        };

        if (isTenantMode()) {
            set(s => {
                const cur = s.appData as AppData;
                return {
                    appData: {
                        ...cur,
                        products: (cur.products || []).map(p => {
                            if (p.id !== transfer.productId) return p;
                            return {
                                ...p,
                                stock: {
                                    ...p.stock,
                                    [transfer.fromBranch]: (p.stock[transfer.fromBranch] || 0) - transfer.quantity,
                                    [transfer.toBranch]: (p.stock[transfer.toBranch] || 0) + transfer.quantity,
                                },
                            };
                        }),
                        stockTransfers: [...(cur.stockTransfers || []), newTransfer],
                    },
                };
            });
            return;
        }

        const batch = writeBatch(db);
        
        const productRef = doc(db, "products", String(transfer.productId));
        batch.update(productRef, { 
            [`stock.${transfer.fromBranch}`]: increment(-transfer.quantity),
            [`stock.${transfer.toBranch}`]: increment(transfer.quantity)
        });

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

            // Try same-origin Vercel upload endpoint first if configured
            try {
                const srvRes = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64Image }),
                });
                if (srvRes.ok) {
                    const srvData = await srvRes.json().catch(() => null);
                    if (srvData?.success && srvData?.data?.url) {
                        return srvData.data.url;
                    }
                }
            } catch {}
            
            // List of API keys to try in order
            const apiKeys = [
                import.meta.env.VITE_IMGBB_API_KEY, // Primary env key
                "bde613bd4475de5e00274a795091ba04",
                "6c8b6631cb1eb13c3f7690a6182c4b8b",
                "0266e741a340a2007f90111c12c5b9f7",
                "37cc221b666a0d426463941459a72138",
                "742879542589e4726eb2a31742461946",
                "6d207e02198a847aa98d0a2a901485a5",
                "c87eb4683dc6553a29d54d9304027959",
                "f59b6629158302506353901404390509",
            ].filter(key => key && key !== 'undefined');

            let lastError;

            for (const apiKey of apiKeys) {
                try {
                    const uploadData = new FormData();
                    uploadData.append('image', base64Image);

                    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                        method: 'POST',
                        body: uploadData,
                    });

                    const data = await response.json();

                    if (data.success) {
                        return data.data.url;
                    } else {
                        lastError = new Error(data.error?.message || 'ImgBB upload failed');
                    }
                } catch (err) {
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
    createOrder: async (customerDetails, items, subtotal, paymentMethod, paymentProof, discountCode, locationLink, shippingInfo) => {
        let imageUrl: string | undefined = undefined;
        const shippingConfig = getShippingConfig(get().appData?.appCustomization);
        const deliveryFee =
            typeof shippingInfo?.deliveryFee === 'number'
                ? shippingInfo.deliveryFee
                : calculateShippingFee(subtotal, shippingConfig, shippingInfo?.shippingZone);
        let discountAmount = 0;
        let validDiscountInfo: Partial<Pick<Order, 'discountCode' | 'discountAmount'>> = {};

        // Upload payment proof if exists
        if (paymentMethod === 'electronic' && paymentProof) {
            try {
                imageUrl = await get().uploadImage(paymentProof, `payment_proofs/${Date.now()}_${paymentProof.name}`);
            } catch (error) {
                console.error("Failed to upload payment proof:", error);
                throw new Error("فشل رفع إيصال الدفع. يرجى المحاولة مرة أخرى.");
            }
        }

        const activeSlug = resolveTenantBrandId();
        if (activeSlug) {
            const res = await createTenantPublicOrder(activeSlug, {
                customerDetails,
                items,
                subtotal,
                paymentMethod,
                paymentProofUrl: imageUrl,
                discountCode,
                locationLink,
                shippingZone: shippingInfo?.shippingZone,
            });
            if (!res.ok) {
                throw new Error("فشل إنشاء الطلب: " + (res.error || 'خطأ في الخادم'));
            }
            isHydratingFromCloud = true;
            set(s => {
                const cur = s.appData as AppData;
                return {
                    appData: {
                        ...cur,
                        orders: res.order ? [res.order, ...(cur.orders || [])] : (cur.orders || []),
                        notifications: res.notification ? [res.notification, ...(cur.notifications || [])] : (cur.notifications || []),
                    },
                };
            });
            isHydratingFromCloud = false;
            saveLocalErpCache(activeSlug, get().appData as any);
            return {
                orderId: res.order?.id,
                totalAmount: res.order?.totalAmount ?? (Math.max(0, subtotal) + deliveryFee),
                deliveryFee: res.order?.deliveryFee ?? deliveryFee,
                proofUrl: imageUrl,
            };
        }
        
        // 1. Validate discount code and calculate discount
        if (discountCode) {
            const codeDocRef = doc(db, "discountCodes", discountCode);
            const codeSnapshot = await getDoc(codeDocRef);
            if (codeSnapshot.exists()) {
                const codeData = codeSnapshot.data() as DiscountCode;
                const now = new Date().toISOString().split('T')[0];
                if (codeData.isActive && now <= codeData.expiresAt && subtotal >= codeData.minPurchase) {
                    if (codeData.type === 'fixed') {
                        discountAmount = codeData.value;
                    } else { // percentage
                        discountAmount = (subtotal * codeData.value) / 100;
                    }
                    
                    validDiscountInfo = {
                        discountCode: discountCode,
                        discountAmount,
                    };
                }
            }
        }
        const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;

        // 3. Create order document with sequential ID using transaction
        let createdOrderId = '001';
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
                createdOrderId = orderId;
                
                transaction.set(counterRef, { orderCount: newCount }, { merge: true });
                
                const newOrderRef = doc(db, "orders", orderId);
                const newOrderData: Omit<Order, 'id'> = {
                    date: new Date().toISOString().split('T')[0],
                    timestamp: new Date().toISOString(),
                    createdAt: Timestamp.now(),
                    customerName: customerDetails.name, customerPhone: customerDetails.phone, customerAddress: customerDetails.address,
                    items, 
                    deliveryFee,
                    shippingZone: shippingInfo?.shippingZone || undefined,
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

            try {
                const activeBrandId = resolveTenantBrandId() || 'battah';
                fetch('https://ez-zel.onrender.com/api/webhooks/tenant-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        source: 'battah',
                        eventType: 'order_created',
                        brandId: activeBrandId,
                        customerName: customerDetails.name,
                        customerPhone: customerDetails.phone,
                        amountEgp: finalTotal,
                        summary: `طلب شراء جديد من ${customerDetails.name} بقيمة ${finalTotal} ج.م`
                    })
                }).catch(() => {});
            } catch {}

            return {
                orderId: createdOrderId,
                totalAmount: finalTotal,
                deliveryFee,
                proofUrl: imageUrl,
            };
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

        const updateData: any = { status };
        if (shippingDetails) {
            if (shippingDetails.shippingCompany !== undefined) updateData.shippingCompany = shippingDetails.shippingCompany;
            if (shippingDetails.trackingNumber !== undefined) updateData.trackingNumber = shippingDetails.trackingNumber;
            if (shippingDetails.shippingNotes !== undefined) updateData.shippingNotes = shippingDetails.shippingNotes;
        }
        const statusText = status === 'confirmed' ? 'تم التأكيد' : status === 'shipped' ? 'تم الشحن' : status === 'cancelled' ? 'ملغي' : status === 'collected' ? 'تم التحصيل' : status === 'returned' ? 'مرتجع' : 'قيد الانتظار';

        if (isTenantMode()) {
            const invoiceNum = `ONLINE-${orderId}`;
            const existingSale = appData.dailySales.find(s => s.invoiceNumber === invoiceNum) || null;
            const wasAlreadyProcessed = Boolean(existingSale);
            const isElectronic = orderToUpdate.paymentMethod === 'electronic';
            const isNowBeingProcessed = ['shipped', 'collected'].includes(status);
            const isBeingReverted = ['pending', 'confirmed', 'cancelled', 'returned'].includes(status);

            let nextDailySales = [...(appData.dailySales || [])];
            let nextTreasury = [...(appData.treasury || [])];
            let nextProducts = [...(appData.products || [])];
            const nowIso = new Date().toISOString();
            const todayDate = nowIso.split('T')[0];

            const statusNotif: Notification = {
                id: `notif_${Date.now()}_${orderId}`,
                date: todayDate,
                createdAt: Date.now() as any,
                message: `تم تغيير حالة الطلب #${orderId} إلى ${statusText}`,
                read: false,
                orderId: String(orderId),
                type: 'status_change',
                targetGroup: 'customer',
            };

            if (isNowBeingProcessed && !wasAlreadyProcessed) {
                const seller = appData.users.find(u => u.role === Role.Admin) || appData.users[0] || state.currentUser || { id: 'admin', name: 'الإدارة' };
                const saleItems: SaleItem[] = orderToUpdate.items.map(item => {
                    const product = appData.products.find(p => p.id === item.productId);
                    if (!product) return null;
                    return { productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, itemType: product?.mainCategory || 'أخرى' };
                }).filter((item): item is SaleItem => item !== null);
                const isCollected = status === 'collected';
                const newSale: DailySale = {
                    id: nextNumericId(nextDailySales),
                    date: todayDate,
                    timestamp: nowIso,
                    invoiceNumber: invoiceNum,
                    sellerId: seller.id,
                    sellerName: seller.name,
                    source: 'أونلاين',
                    branchSoldFrom: 'main',
                    direction: 'بيع',
                    items: saleItems,
                    totalAmount: orderToUpdate.totalAmount,
                    paymentMethod: isElectronic ? 'إلكترونى' : (isCollected ? 'نقدى' : 'آجل'),
                    cashAmount: (!isElectronic && isCollected) ? orderToUpdate.totalAmount : 0,
                    electronicAmount: isElectronic ? orderToUpdate.totalAmount : 0,
                    remainingDebt: (!isElectronic && !isCollected) ? orderToUpdate.totalAmount : 0,
                };
                nextDailySales.push(newSale);

                if (isElectronic || isCollected) {
                    nextTreasury.push({
                        id: nextNumericId(nextTreasury),
                        date: todayDate,
                        timestamp: nowIso,
                        type: 'إيراد مبيعات',
                        description: `طلب أونلاين #${orderToUpdate.id}`,
                        amountIn: orderToUpdate.totalAmount,
                        amountOut: 0,
                        relatedId: orderToUpdate.id,
                        paymentMethod: isElectronic ? 'electronic' : 'cash',
                    });
                }

                nextProducts = adjustProductsStockMap(nextProducts, orderToUpdate.items, 'main', -1);
            } else if (isNowBeingProcessed && wasAlreadyProcessed && status === 'collected' && existingSale && existingSale.paymentMethod === 'آجل') {
                nextDailySales = nextDailySales.map(s =>
                    s.id === existingSale.id ? { ...s, paymentMethod: 'نقدى', cashAmount: orderToUpdate.totalAmount, remainingDebt: 0 } : s
                );
                nextTreasury.push({
                    id: nextNumericId(nextTreasury),
                    date: todayDate,
                    timestamp: nowIso,
                    type: 'إيراد مبيعات',
                    description: `تحصيل طلب أونلاين #${orderToUpdate.id}`,
                    amountIn: orderToUpdate.totalAmount,
                    amountOut: 0,
                    relatedId: orderToUpdate.id,
                    paymentMethod: 'cash',
                });
            } else if (isBeingReverted && wasAlreadyProcessed) {
                nextDailySales = nextDailySales.filter(s => s.invoiceNumber !== invoiceNum);
                nextTreasury = nextTreasury.filter(t => !(String(t.relatedId) === String(orderId) && t.type === 'إيراد مبيعات'));
                nextProducts = adjustProductsStockMap(nextProducts, orderToUpdate.items, 'main', 1);
            }

            set(s => ({
                appData: {
                    ...(s.appData as AppData),
                    orders: (s.appData?.orders || []).map(o => o.id === orderId ? { ...o, ...updateData } : o),
                    notifications: [statusNotif, ...(s.appData?.notifications || [])],
                    dailySales: nextDailySales,
                    treasury: nextTreasury,
                    products: nextProducts,
                }
            }));

            if (isBeingReverted && wasAlreadyProcessed) {
                get().addToast('تم عكس المعاملات المرتبطة بالطلب بنجاح.', 'success');
            }
            return;
        }
        
        const batch = writeBatch(db);
        
        batch.update(doc(db, "orders", String(orderId)), updateData);

        // Add notification for customer/system
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

            if (isTenantMode()) {
                set(s => {
                    const cur = s.appData as AppData;
                    const wasProcessed = ['shipped', 'collected'].includes(orderToDelete.status);
                    return {
                        appData: {
                            ...cur,
                            orders: (cur.orders || []).filter(o => String(o.id) !== String(orderId)),
                            notifications: (cur.notifications || []).filter(n => String(n.orderId) !== String(orderId)),
                            dailySales: wasProcessed
                                ? (cur.dailySales || []).filter(sale => sale.invoiceNumber !== `ONLINE-${orderId}`)
                                : (cur.dailySales || []),
                            treasury: wasProcessed
                                ? (cur.treasury || []).filter(t => !(String(t.relatedId) === String(orderId) && t.type === "إيراد مبيعات"))
                                : (cur.treasury || []),
                            products: wasProcessed
                                ? adjustProductsStockMap(cur.products || [], orderToDelete.items, 'main', 1)
                                : (cur.products || []),
                        },
                    };
                });
                return;
            }
        
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
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    notifications: (state.appData?.notifications || []).map(n => String(n.id) === String(notificationId) ? { ...n, read: true } : n),
                }
            }));
            return;
        }
        await updateDoc(doc(db, "notifications", String(notificationId)), { read: true });
    },
    addDiscountCode: async (code) => {
        const newCode = { ...code, id: code.code } as DiscountCode;
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    discountCodes: [...(state.appData?.discountCodes || []), newCode],
                }
            }));
            return;
        }
        await setDoc(doc(db, "discountCodes", code.code), newCode);
    },
    updateDiscountCode: async (codeId, updates) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    discountCodes: (state.appData?.discountCodes || []).map(c => String(c.id) === String(codeId) ? { ...c, ...updates } : c),
                }
            }));
            return;
        }
        await updateDoc(doc(db, "discountCodes", String(codeId)), updates);
    },
    deleteDiscountCode: async (codeId) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    discountCodes: (state.appData?.discountCodes || []).filter(c => String(c.id) !== String(codeId)),
                }
            }));
            return;
        }
        await deleteDoc(doc(db, "discountCodes", String(codeId)));
    },
    addAttendanceRecord: async (record) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    attendance: [...(state.appData?.attendance || []), record],
                }
            }));
            return;
        }
        await setDoc(doc(db, "attendance", String(record.id)), record);
    },
    updateAttendanceRecord: async (id, updates) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    attendance: (state.appData?.attendance || []).map(a => String(a.id) === String(id) ? { ...a, ...updates } : a),
                }
            }));
            return;
        }
        await updateDoc(doc(db, "attendance", String(id)), updates);
    },
    createUser: async (email, pass, role, branch, name, permissions = [], allowedBranches = []) => {
        if (isTenantMode()) {
            const normalizedEmail = email.trim().toLowerCase();
            const existing = (get().appData?.users || []).find(
                u => String(u.username || '').trim().toLowerCase() === normalizedEmail
            );
            if (existing) {
                get().addToast('هذا البريد الإلكتروني مسجل بالفعل', 'error');
                throw new Error('هذا البريد الإلكتروني مسجل بالفعل');
            }
            const newUser: User = {
                id: `staff_${Date.now()}`,
                name,
                username: normalizedEmail,
                role,
                branch,
                allowedBranches: Array.from(new Set([...allowedBranches, branch])),
                permissions,
                password: pass,
            };
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    users: [...(state.appData?.users || []), newUser],
                }
            }));
            get().addToast(`تم إنشاء حساب المستخدم ${name} بنجاح`, 'success');
            return;
        }
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
                allowedBranches: Array.from(new Set([...allowedBranches, branch])),
                permissions: permissions,
                password: pass
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
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    users: (state.appData?.users || []).map(u => String(u.id) === String(userId) ? { ...u, ...updates } : u),
                }
            }));
            get().addToast("تم تحديث بيانات المستخدم بنجاح", "success");
            return;
        }
        try {
            await updateDoc(doc(db, "users", userId), updates);
            get().addToast("تم تحديث بيانات المستخدم بنجاح", "success");
        } catch (error: any) {
            console.error("Error updating user:", error);
            throw new Error(error.message || "Failed to update user");
        }
    },
    deleteUser: async (userId) => {
        if (isTenantMode()) {
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    users: (state.appData?.users || []).filter(u => String(u.id) !== String(userId)),
                }
            }));
            get().addToast("تم حذف المستخدم بنجاح", "success");
            return;
        }
        try {
            await deleteDoc(doc(db, "users", userId));
            get().addToast("تم حذف المستخدم بنجاح", "success");
        } catch (error: any) {
            console.error("Error deleting user:", error);
            throw new Error(error.message || "Failed to delete user");
        }
    },
    updateSettings: async (settings) => {
        const merged = { ...(get().appData?.settings || {}), ...settings } as Settings;
        set(state => ({
            appData: { ...(state.appData as AppData), settings: merged }
        }));
        if (resolveTenantBrandId()) return;
        await setDoc(doc(db, "settings", "general"), merged, { merge: true });
    },
    updateAppCustomization: async (customization) => {
        const curCustom = get().appData?.appCustomization || {};
        const merged: AppCustomization = {
            ...curCustom,
            ...customization,
            ...(customization.storefrontFilters
                ? {
                    storefrontFilters: {
                        ...(curCustom.storefrontFilters || {}),
                        ...customization.storefrontFilters,
                    },
                }
                : {}),
        };

        set(state => ({
            appData: { ...(state.appData as AppData), appCustomization: merged }
        }));

        if (typeof window !== 'undefined') {
            if ((window as any).__TENANT_BRAND__) {
                (window as any).__TENANT_BRAND__.appCustomization = merged;
            }
        }

        const curUser = get().currentUser;
        if (curUser && curUser.role === Role.Admin && Array.isArray(merged.activeBranches) && merged.activeBranches.length > 0) {
            const allowedKeys = merged.activeBranches.map(b => b.key).filter(Boolean);
            const nextBranch = allowedKeys.includes(curUser.branch) ? curUser.branch : allowedKeys[0];
            const updatedUser: User = {
                ...curUser,
                branch: nextBranch,
                allowedBranches: allowedKeys,
            };
            set({ currentUser: updatedUser });
            const slug = resolveTenantBrandId();
            if (slug && typeof localStorage !== 'undefined') {
                try {
                    const raw = localStorage.getItem(`t2_tenant_session_${slug}`);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        parsed.user = { ...(parsed.user || {}), ...updatedUser };
                        localStorage.setItem(`t2_tenant_session_${slug}`, JSON.stringify(parsed));
                    }
                } catch {}
            }
        }

        if (resolveTenantBrandId()) return;
        await setDoc(doc(db, "settings", "customization"), merged, { merge: true });
    },
    saveDeviceToken: async (token: string) => {
        if (isTenantMode()) return;
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
        if (isTenantMode()) {
            const sysNotif: Notification = {
                id: `notif_${Date.now()}_broadcast`,
                date: newBroadcast.date,
                createdAt: Date.now() as any,
                message: `تم إرسال إشعار عام: ${message}`,
                read: true,
                type: 'system',
                targetGroup: 'all',
            };
            set(state => ({
                appData: {
                    ...(state.appData as AppData),
                    broadcasts: [newBroadcast, ...(state.appData?.broadcasts || [])],
                    notifications: [sysNotif, ...(state.appData?.notifications || [])],
                }
            }));
            fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'إشعار من الإدارة', body: message })
            }).catch(() => {});
            return;
        }
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
        if (isTenantMode()) {
            set(state => ({
                appData: { ...(state.appData as AppData), treasury: [] }
            }));
            get().addToast('تم مسح جميع معاملات الخزينة بنجاح', 'success');
            return;
        }
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
    resetDatabase: async () => {
        const state = get();
        if (!state.appData) return;

        const activeSlug = resolveTenantBrandId();
        if (activeSlug) {
            const clearedState = {
                products: [],
                dailySales: [],
                employees: [],
                advances: [],
                attendance: [],
                payroll: [],
                suppliers: [],
                purchaseOrders: [],
                payments: [],
                expenses: [],
                treasury: [],
                dailyReview: [],
                notifications: [],
                stockTransfers: [],
                orders: [],
                broadcasts: [],
                discountCodes: [],
                storefrontSettings: {
                    ...(state.appData.storefrontSettings || {}),
                    featuredProductIds: [],
                    newArrivalProductIds: [],
                },
            };
            isHydratingFromCloud = true;
            set(s => ({
                appData: {
                    ...(s.appData as AppData),
                    ...clearedState,
                },
            }));
            isHydratingFromCloud = false;
            saveLocalErpCache(activeSlug, get().appData as any);
            await pushTenantErpState(activeSlug, clearedState);
            get().addToast('تم مسح جميع البيانات بنجاح', 'success');
            return;
        }

        const collectionsToClear: (keyof AppData)[] = [
            'products', 'dailySales', 'employees', 'advances', 'attendance', 'payroll', 'suppliers', 
            'purchaseOrders', 'payments', 'expenses', 'treasury', 'dailyReview', 
            'notifications', 'stockTransfers', 'orders', 'broadcasts', 'discountCodes'
        ];

        try {
            for (const collectionName of collectionsToClear) {
                const items = state.appData[collectionName] as any[];
                if (!items || items.length === 0) continue;

                for (let i = 0; i < items.length; i += 500) {
                    const chunk = items.slice(i, i + 500);
                    const batch = writeBatch(db);
                    for (const item of chunk) {
                        batch.delete(doc(db, collectionName as string, String(item.id)));
                    }
                    await batch.commit();
                }
            }
            
            // Also reset storefront settings
            await state.updateStorefrontSettings({
                featuredProductIds: [],
                newArrivalProductIds: [],
                adminPassword: state.appData.storefrontSettings?.adminPassword // keep password
            });

            get().addToast('تم مسح جميع البيانات بنجاح', 'success');
        } catch (error) {
            console.error("Error resetting database:", error);
            get().addToast('حدث خطأ أثناء مسح البيانات', 'error');
            throw error;
        }
    },
}));

let isHydratingFromCloud = false;
useStore.subscribe((state, prevState) => {
    if (isHydratingFromCloud) return;
    const slug = resolveTenantBrandId();
    if (!slug || !state.appData) return;
    if (state.appData !== prevState.appData) {
        const dirtyKeys = Object.keys(state.appData).filter(
            (k) => k !== 'toasts' && (state.appData as any)[k] !== (prevState.appData as any)?.[k]
        );
        if (dirtyKeys.length > 0 && state.currentUser && getTenantSessionToken(slug)) {
            queueTenantErpSync(slug, state.appData as any, dirtyKeys);
        }
    }
});

if (typeof window !== 'undefined') {
    setInterval(async () => {
        if (document.visibilityState !== 'visible' || hasPendingErpSync()) return;
        const slug = resolveTenantBrandId();
        if (!slug) return;
        const token = getTenantSessionToken(slug);
        const cloudState = await fetchTenantErpState(slug, token);
        if (!cloudState || typeof cloudState !== 'object' || hasPendingErpSync()) return;
        const curData = (useStore.getState().appData || {}) as Record<string, any>;
        const nextMerged: Record<string, any> = {
            ...curData,
            ...(Array.isArray(cloudState.products) && cloudState.products.length > 0 ? { products: cloudState.products } : {}),
            ...(Array.isArray(cloudState.broadcasts) ? { broadcasts: cloudState.broadcasts } : {}),
            ...(Array.isArray(cloudState.discountCodes) ? { discountCodes: cloudState.discountCodes } : {}),
            ...(cloudState.storefrontSettings ? { storefrontSettings: cloudState.storefrontSettings } : {}),
            ...(cloudState.settings ? { settings: cloudState.settings } : {}),
            ...(cloudState.appCustomization ? { appCustomization: cloudState.appCustomization } : {}),
            ...(token ? cloudState : {}),
        };
        if (JSON.stringify(nextMerged) !== JSON.stringify(curData)) {
            isHydratingFromCloud = true;
            useStore.setState({ isLoading: false, appData: nextMerged as AppData });
            isHydratingFromCloud = false;
            saveLocalErpCache(slug, nextMerged);
            if (nextMerged.storefrontSettings) {
                (window as any).__TENANT_STOREFRONT_SETTINGS__ = nextMerged.storefrontSettings;
                if ((nextMerged.storefrontSettings as any).primaryColor) {
                    applyDynamicPwaAndTheme({
                        name: ((window as any).__TENANT_BRAND__?.name) || 'المتجر',
                        primaryColor: (nextMerged.storefrontSettings as any).primaryColor,
                        logoUrl: ((window as any).__TENANT_BRAND__?.logoUrl) || '',
                    });
                }
            }
        }
    }, 12000);
}

export default useStore;