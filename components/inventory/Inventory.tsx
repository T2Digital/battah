
import React, { useState, useMemo } from 'react';
import useStore from '../../lib/store';
import { Product, MainCategory, StockTransfer, Branch } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import ProductModal from './ProductModal';
import StorefrontSettings from './StorefrontSettings';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatCurrency, formatDate } from '../../lib/utils';
import StockTransferModal from './StockTransferModal';

const StockTransfersList: React.FC<{ transfers: StockTransfer[] }> = ({ transfers }) => {
    const branchNames: Record<Branch, string> = {
        main: 'الرئيسي',
        branch1: 'فرع 1',
        branch2: 'فرع 2',
        branch3: 'فرع 3',
    };

    const sortedTransfers = useMemo(() => 
        [...transfers].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transfers]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
             <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                 <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                    <tr>
                        <th className="px-6 py-3">التاريخ</th>
                        <th className="px-6 py-3">المنتج</th>
                        <th className="px-6 py-3">الكمية</th>
                        <th className="px-6 py-3">من فرع</th>
                        <th className="px-6 py-3">إلى فرع</th>
                        <th className="px-6 py-3">ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTransfers.length > 0 ? sortedTransfers.map(t => (
                        <tr key={t.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-6 py-4">{formatDate(t.date)}</td>
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.productName}</td>
                            <td className="px-6 py-4 font-bold">{t.quantity}</td>
                            <td className="px-6 py-4">{branchNames[t.fromBranch]}</td>
                            <td className="px-6 py-4">{branchNames[t.toBranch]}</td>
                            <td className="px-6 py-4">{t.notes || '-'}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-500">لا توجد تحويلات مسجلة.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const Inventory: React.FC = () => {
    const { 
        stockTransfers,
        setProducts, 
        deleteProduct,
        storefrontSettings,
        updateStorefrontSettings,
        fetchProducts,
        searchProducts,
        globalProducts // Get global products from store
    } = useStore(state => ({
        stockTransfers: state.appData?.stockTransfers || [],
        setProducts: state.setProducts,
        deleteProduct: state.deleteProduct,
        storefrontSettings: state.appData?.storefrontSettings,
        updateStorefrontSettings: state.updateStorefrontSettings,
        fetchProducts: state.fetchProducts,
        searchProducts: state.searchProducts,
        globalProducts: state.appData?.products || [] // Access global products
    }));

    const [products, setLocalProducts] = useState<Product[]>([]);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    const [activeTab, setActiveTab] = useState<'products' | 'transfers'>('products');
    const [isProductModalOpen, setProductModalOpen] = useState(false);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [isTransferModalOpen, setTransferModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        stockStatus: 'all',
    });

    // Initial fetch - Sync with global products if available, otherwise fetch
    React.useEffect(() => {
        if (globalProducts.length > 0) {
            setLocalProducts(globalProducts);
            setHasMore(false); // Since we have all products
        } else {
            loadProducts();
        }
    }, [globalProducts]); // React to changes in global products

    const loadProducts = async (reset = false) => {
        if (loading || (globalProducts.length > 0 && !reset)) return; // Don't load if we have global products
        setLoading(true);
        try {
            const result = await fetchProducts(reset ? null : lastDoc);
            if (reset) {
                setLocalProducts(result.products);
            } else {
                setLocalProducts(prev => [...prev, ...result.products]);
            }
            setLastDoc(result.lastDoc);
            setHasMore(result.products.length === 20); 
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        // Search is now handled by client-side filtering on `products` state
        // which is synced with `globalProducts`.
        // We just need to ensure `products` contains everything.
        if (globalProducts.length > 0) {
             // Already have all products, filtering happens in `filteredProducts`
             return;
        }

        // Fallback to server search if global products are empty (shouldn't happen for admin)
        if (!filters.search.trim()) {
            setIsSearching(false);
            loadProducts(true);
            return;
        }
        setIsSearching(true);
        setLoading(true);
        try {
            const results = await searchProducts(filters.search);
            setLocalProducts(results);
            setHasMore(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = () => {
        setProductToEdit(null);
        setProductModalOpen(true);
    };

    const handleEditProduct = (product: Product) => {
        setProductToEdit(product);
        setProductModalOpen(true);
    };

    const confirmDeleteProduct = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        try {
            await deleteProduct(productToDelete.id);
            setLocalProducts(prev => prev.filter(p => p.id !== productToDelete.id));
            setProductToDelete(null);
        } catch (error) {
            console.error("Failed to delete product:", error);
            alert(`فشل حذف المنتج: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveProduct = (product: Omit<Product, 'id'> & { id?: number }) => {
        // Optimistic update or reload
        if (product.id) {
            setLocalProducts(prev => prev.map(p => (p.id === product.id ? { ...p, ...product } as Product : p)));
        } else {
            // For new products, we might want to reload to get the correct ID/order
            // Or just prepend it
            const newId = Date.now(); // Temporary ID until refresh
            setLocalProducts(prev => [{ ...product, id: newId } as Product, ...prev]);
        }
        setProductModalOpen(false);
    };
    
    // Client-side filtering for the currently loaded batch (mostly for category/stock status)
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
            // Search is handled server-side now, but we keep this for local filtering if needed
            const matchesSearch = filters.search 
                ? (p.name.toLowerCase().includes(filters.search.toLowerCase()) || p.sku.toLowerCase().includes(filters.search.toLowerCase()))
                : true;
            const matchesCategory = filters.category ? p.mainCategory === filters.category : true;
            const matchesStock = filters.stockStatus === 'all' || (filters.stockStatus === 'low' && totalStock <= (p.reorderPoint || 0)) || (filters.stockStatus === 'out' && totalStock === 0);
            return matchesCategory && matchesStock && matchesSearch;
        });
    }, [products, filters.category, filters.stockStatus, filters.search]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-warehouse" title="إدارة المخزن والمنتجات">
                <button onClick={() => setSettingsModalOpen(true)} className="px-4 py-2 bg-secondary text-white rounded-lg flex items-center gap-2 hover:bg-secondary-dark transition shadow-md">
                    <i className="fas fa-store-alt"></i>
                    إعدادات المتجر
                </button>
                <button onClick={handleAddProduct} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    إضافة منتج
                </button>
            </SectionHeader>

            <div className="flex border-b dark:border-gray-700">
                <button onClick={() => setActiveTab('products')} className={`px-6 py-3 font-semibold ${activeTab === 'products' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>المنتجات</button>
                <button onClick={() => setActiveTab('transfers')} className={`px-6 py-3 font-semibold ${activeTab === 'transfers' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>تحويلات المخزون</button>
            </div>
            
            {activeTab === 'products' && (
                <>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 items-center">
                        <form onSubmit={handleSearch} className="flex-grow flex gap-2 w-full">
                            <input
                                type="text"
                                placeholder="ابحث بالاسم (اضغط Enter للبحث)..."
                                value={filters.search}
                                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                                className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            />
                            <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark">
                                <i className="fas fa-search"></i>
                            </button>
                        </form>
                        <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                            <option value="">كل الفئات</option>
                            {(['قطع غيار', 'كماليات', 'زيوت وشحومات', 'بطاريات', 'إطارات'] as MainCategory[]).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <select value={filters.stockStatus} onChange={e => setFilters(f => ({ ...f, stockStatus: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                            <option value="all">كل المخزون</option>
                            <option value="low">حد الطلب</option>
                            <option value="out">نفذت الكمية</option>
                        </select>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                        <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                             <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-6 py-3">المنتج</th>
                                    <th className="px-6 py-3">الكود</th>
                                    <th className="px-6 py-3">سعر الشراء</th>
                                    <th className="px-6 py-3">سعر البيع</th>
                                    <th className="px-6 py-3">الرصيد الكلي</th>
                                    <th className="px-6 py-3">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => {
                                    const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
                                    return (
                                        <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                                <img src={p.images[0] || 'https://via.placeholder.com/40'} alt={p.name} className="w-10 h-10 rounded-md object-cover"/>
                                                {p.name}
                                            </td>
                                            <td className="px-6 py-4">{p.sku}</td>
                                            <td className="px-6 py-4">{formatCurrency(p.purchasePrice)}</td>
                                            <td className="px-6 py-4">{formatCurrency(p.sellingPrice)}</td>
                                            <td className={`px-6 py-4 font-bold ${totalStock <= (p.reorderPoint || 0) ? 'text-red-500' : ''}`}>{totalStock}</td>
                                            <td className="px-6 py-4 flex gap-3">
                                                <button onClick={() => handleEditProduct(p)} className="text-blue-500 hover:text-blue-700 text-lg"><i className="fas fa-edit"></i></button>
                                                <button onClick={() => setProductToDelete(p)} className="text-red-500 hover:text-red-700 text-lg"><i className="fas fa-trash"></i></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'transfers' && (
                <>
                    <div className="flex justify-end">
                        <button onClick={() => setTransferModalOpen(true)} className="px-4 py-2 bg-secondary text-white rounded-lg flex items-center gap-2 hover:bg-secondary-dark transition shadow-md">
                            <i className="fas fa-exchange-alt"></i>
                            تحويل جديد
                        </button>
                    </div>
                    <StockTransfersList transfers={stockTransfers} />
                </>
            )}

            {isProductModalOpen && <ProductModal isOpen={isProductModalOpen} onClose={() => setProductModalOpen(false)} onSave={handleSaveProduct} existingProduct={productToEdit} />}
            {isSettingsModalOpen && storefrontSettings && <StorefrontSettings isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} settings={storefrontSettings} onSave={updateStorefrontSettings} products={products} />}
            {isTransferModalOpen && <StockTransferModal isOpen={isTransferModalOpen} onClose={() => setTransferModalOpen(false)} />}
            
            {productToDelete && (
                <ConfirmationModal
                    isOpen={!!productToDelete}
                    onClose={() => setProductToDelete(null)}
                    onConfirm={confirmDeleteProduct}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف المنتج "${productToDelete.name}"؟`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}
        </div>
    );
};

export default Inventory;
