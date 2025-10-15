import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppData, User, Product, CartItem } from '../types';
import { auth, db, storage } from './firebase';
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initialData } from '../constants';


interface AppState {
    appData: AppData | null;
    currentUser: User | null;
    cart: CartItem[];
    isInitialized: boolean;
    isLoading: boolean;
    isSeeded: boolean | null;
    fetchInitialData: () => Promise<void>;
    setCurrentUser: (user: User) => void;
    clearCurrentUser: () => void;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    
    // Data modification actions
    addProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
    updateProduct: (productId: number, productData: Partial<Product>) => Promise<void>;
    deleteProduct: (productId: number) => Promise<void>;
    uploadImage: (file: File, path: string) => Promise<string>;

    // Cart actions
    addToCart: (product: Product, quantity: number) => void;
    updateCartQuantity: (productId: number, quantity: number) => void;
    clearCart: () => void;

    // Seeding
    checkIfSeeded: () => Promise<void>;
    seedDatabase: () => Promise<void>;
}

const useStore = create<AppState>()(
    devtools(
        persist(
            (set, get) => ({
                appData: null,
                currentUser: null,
                cart: [],
                isInitialized: false,
                isLoading: true,
                isSeeded: null,

                fetchInitialData: async () => {
                    set({ isLoading: true });
                    try {
                        const collections: (keyof AppData)[] = [
                            'users', 'products', 'categories', 'dailySales', 'treasury', 'employees', 
                            'advances', 'attendance', 'payroll', 'suppliers', 'payments', 
                            'expenses', 'dailyReview', 'purchaseOrders'
                        ];
                        
                        const dataPromises = collections.map(async (colName) => {
                            const querySnapshot = await getDocs(collection(db, colName));
                            const data = querySnapshot.docs.map(doc => ({ id: Number(doc.id), ...doc.data() }));
                            return { [colName]: data };
                        });

                        const fetchedDataArray = await Promise.all(dataPromises);
                        const appData = fetchedDataArray.reduce((acc, current) => ({ ...acc, ...current }), {}) as AppData;
                        
                        set({ appData, isInitialized: true, isLoading: false });
                    } catch (error) {
                        console.error("Error fetching initial data:", error);
                        set({ isLoading: false });
                    }
                },

                setCurrentUser: (user) => set({ currentUser: user }),
                clearCurrentUser: () => set({ currentUser: null }),

                login: async (email, pass) => {
                    await signInWithEmailAndPassword(auth, email, pass);
                    // onAuthStateChanged in App.tsx will handle setting the user
                },
                logout: async () => {
                    await signOut(auth);
                    set({ currentUser: null });
                },

                // --- Data Modification ---
                addProduct: async (productData) => {
                    const productsCollection = collection(db, 'products');
                    const newId = Date.now(); // Simple unique ID
                    const newProduct: Product = { ...productData, id: newId };
                    await setDoc(doc(productsCollection, newId.toString()), newProduct);
                    set(state => ({
                        appData: state.appData ? {
                            ...state.appData,
                            products: [...state.appData.products, newProduct]
                        } : state.appData
                    }));
                },
                updateProduct: async (productId, productData) => {
                    const productRef = doc(db, 'products', productId.toString());
                    await updateDoc(productRef, productData);
                     set(state => ({
                        appData: state.appData ? {
                            ...state.appData,
                            products: state.appData.products.map(p => p.id === productId ? {...p, ...productData} as Product : p)
                        } : state.appData
                    }));
                },
                deleteProduct: async (productId) => {
                    await deleteDoc(doc(db, 'products', productId.toString()));
                     set(state => ({
                        appData: state.appData ? {
                            ...state.appData,
                            products: state.appData.products.filter(p => p.id !== productId)
                        } : state.appData
                    }));
                },
                
                uploadImage: async (file, path) => {
                    const storageRef = ref(storage, path);
                    await uploadBytes(storageRef, file);
                    const downloadURL = await getDownloadURL(storageRef);
                    return downloadURL;
                },

                // --- Cart Actions ---
                addToCart: (product, quantity) => {
                    set(state => {
                        const existingItem = state.cart.find(item => item.product.id === product.id);
                        if (existingItem) {
                            return {
                                cart: state.cart.map(item =>
                                    item.product.id === product.id
                                        ? { ...item, quantity: item.quantity + quantity }
                                        : item
                                )
                            };
                        }
                        return { cart: [...state.cart, { product, quantity }] };
                    });
                },
                updateCartQuantity: (productId, quantity) => {
                     set(state => {
                        if (quantity <= 0) {
                            return { cart: state.cart.filter(item => item.product.id !== productId) };
                        }
                        return {
                            cart: state.cart.map(item =>
                                item.product.id === productId ? { ...item, quantity } : item
                            )
                        };
                    });
                },
                clearCart: () => set({ cart: [] }),
                
                // --- Seeding ---
                checkIfSeeded: async () => {
                    const seedFlagRef = doc(db, 'internal', 'seedFlag');
                    const docSnap = await getDoc(seedFlagRef);
                    if (docSnap.exists() && docSnap.data().isSeeded) {
                        set({ isSeeded: true });
                    } else {
                        set({ isSeeded: false });
                    }
                },

                seedDatabase: async () => {
                    console.log("Starting database seeding...");
                    const batch = writeBatch(db);

                    // Seed each collection
                    for (const [collectionName, dataArray] of Object.entries(initialData)) {
                        console.log(`Seeding ${collectionName}...`);
                        if (Array.isArray(dataArray)) {
                            dataArray.forEach((item: any) => {
                                const docRef = doc(db, collectionName, String(item.id));
                                batch.set(docRef, item);
                            });
                        }
                    }

                    // Set the seed flag
                    const seedFlagRef = doc(db, 'internal', 'seedFlag');
                    batch.set(seedFlagRef, { isSeeded: true, seededAt: new Date() });

                    await batch.commit();
                    set({ isSeeded: true });
                    console.log("Database seeding completed successfully.");
                },

            }),
            {
                name: 'battah-app-storage', // name of the item in the storage (must be unique)
                partialize: (state) => ({ cart: state.cart }), // Only persist the cart
            }
        )
    )
);

export default useStore;
