
import React, { useState, useMemo, useRef } from 'react';
import useStore from '../../lib/store';
import { Product, MainCategory, StockTransfer, Branch } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import ProductModal from './ProductModal';
import StorefrontSettings from './StorefrontSettings';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import StockTransferModal from './StockTransferModal';
import PriceIncreaseModal from './PriceIncreaseModal';
import * as XLSX from 'xlsx';

const StockTransfersList: React.FC<{ transfers: StockTransfer[] }> = ({ transfers }) => {
    const branchNames: Record<Branch, string> = {
        main: 'المخزن',
        branch1: 'الرئيسي',
        branch2: 'فرع 1',
        branch3: 'فرع 2',
    };

    const sortedTransfers = useMemo(() => 
        [...transfers].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transfers]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
             <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                 <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                    <tr>
                        <th className="px-6 py-3">التاريخ والوقت</th>
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
                            <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(t.date, t.timestamp)}</td>
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
        addProduct,
        updateProduct,
        deleteProduct,
        storefrontSettings,
        updateStorefrontSettings,
        fetchProducts,
        searchProducts,
        globalProducts, // Get global products from store
        currentUser
    } = useStore(state => ({
        stockTransfers: state.appData?.stockTransfers || [],
        setProducts: state.setProducts,
        addProduct: state.addProduct,
        updateProduct: state.updateProduct,
        deleteProduct: state.deleteProduct,
        storefrontSettings: state.appData?.storefrontSettings,
        updateStorefrontSettings: state.updateStorefrontSettings,
        fetchProducts: state.fetchProducts,
        searchProducts: state.searchProducts,
        globalProducts: state.appData?.products || [], // Access global products
        currentUser: state.currentUser
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
    const [isPriceIncreaseModalOpen, setPriceIncreaseModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'الاسم': 'منتج تجريبي',
                'الباركود': '123456789',
                'القسم الرئيسي': 'قطع غيار',
                'القسم الفرعي': 'محرك',
                'سعر الشراء': 100,
                'سعر البيع قطاعي': 150,
                'سعر البيع جملة': 130,
                'حد الطلب': 5,
                'رصيد المخزن': 10,
                'رصيد الرئيسي': 5,
                'رصيد فرع 1': 0,
                'رصيد فرع 2': 0,
                'رابط الصورة': 'https://example.com/image.jpg',
                'الوصف': 'وصف المنتج هنا',
                'يتطلب رقم تسلسلي': 'لا'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Products Template");
        XLSX.writeFile(wb, "products_template.xlsx");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            const newProducts: Omit<Product, 'id'>[] = jsonData.map(row => ({
                name: row['الاسم'] || '',
                sku: row['الباركود'] || '',
                mainCategory: (row['القسم الرئيسي'] || 'أخرى') as MainCategory,
                subCategory: row['القسم الفرعي'] || '',
                category: row['القسم الفرعي'] || '',
                brand: '',
                purchasePrice: Number(row['سعر الشراء']) || 0,
                sellingPrice: Number(row['سعر البيع قطاعي']) || 0,
                wholesalePrice: Number(row['سعر البيع جملة']) || 0,
                reorderPoint: Number(row['حد الطلب']) || 0,
                stock: {
                    main: Number(row['رصيد المخزن']) || 0,
                    branch1: Number(row['رصيد الرئيسي']) || 0,
                    branch2: Number(row['رصيد فرع 1']) || 0,
                    branch3: Number(row['رصيد فرع 2']) || 0,
                },
                imageUrl: row['رابط الصورة'] || '',
                images: row['رابط الصورة'] ? [row['رابط الصورة']] : [],
                description: row['الوصف'] || '',
                hasSerialNumber: row['يتطلب رقم تسلسلي'] === 'نعم'
            }));

            // Add products in chunks to avoid overwhelming Firestore
            for (let i = 0; i < newProducts.length; i += 50) {
                const chunk = newProducts.slice(i, i + 50);
                await Promise.all(chunk.map(p => addProduct(p)));
            }

            alert(`تم رفع ${newProducts.length} منتج بنجاح`);
            loadProducts(true); // Reload products to show the newly uploaded ones
        } catch (error) {
            console.error("Error uploading products:", error);
            alert("حدث خطأ أثناء رفع المنتجات. تأكد من صحة ملف الإكسيل.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        stockStatus: 'all',
    });

    // Initial fetch
    React.useEffect(() => {
        loadProducts(true);
    }, []);

    const loadProducts = async (reset = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const result = await fetchProducts(reset ? null : lastDoc);
            if (reset) {
                setLocalProducts(result.products);
            } else {
                setLocalProducts(prev => {
                    // Prevent duplicates
                    const newProducts = result.products.filter(p => !prev.some(existing => existing.id === p.id));
                    return [...prev, ...newProducts];
                });
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

    const handleSaveProduct = async (product: Omit<Product, 'id'> & { id?: number }) => {
        try {
            if (product.id) {
                await updateProduct(product.id, product);
                setLocalProducts(prev => prev.map(p => (p.id === product.id ? { ...p, ...product } as Product : p)));
            } else {
                const newProduct = await addProduct(product);
                setLocalProducts(prev => [newProduct, ...prev]);
            }
            setProductModalOpen(false);
        } catch (error) {
            console.error("Failed to save product:", error);
            alert("فشل حفظ المنتج.");
            throw error;
        }
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
            <SectionHeader icon="fa-warehouse" title="إدارة المخزون والمنتجات">
                <div className="flex gap-2 flex-wrap">
                    <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-md text-sm">
                        <i className="fas fa-download"></i>
                        تحميل قالب
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700 transition shadow-md text-sm disabled:opacity-50">
                        <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                        {isUploading ? 'جاري الرفع...' : 'رفع إكسيل'}
                    </button>
                    <button onClick={() => setPriceIncreaseModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-md text-sm">
                        <i className="fas fa-percentage"></i>
                        تعديل الأسعار
                    </button>
                    <button onClick={() => setSettingsModalOpen(true)} className="px-4 py-2 bg-secondary text-white rounded-lg flex items-center gap-2 hover:bg-secondary-dark transition shadow-md text-sm">
                        <i className="fas fa-store-alt"></i>
                        إعدادات المتجر
                    </button>
                    <button onClick={handleAddProduct} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md text-sm">
                        <i className="fas fa-plus"></i>
                        إضافة منتج
                    </button>
                </div>
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
                            {(['قطع غيار', 'كماليات و إكسسوارات', 'زيوت وشحومات', 'بطاريات', 'إطارات'] as MainCategory[]).map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                                    {currentUser?.role === 'admin' && <th className="px-6 py-3">سعر الشراء</th>}
                                    <th className="px-6 py-3">سعر البيع</th>
                                    <th className="px-6 py-3">{currentUser?.role === 'admin' ? 'الرصيد الكلي' : 'رصيد الفرع'}</th>
                                    <th className="px-6 py-3">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => {
                                    const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
                                    const displayStock = currentUser?.role === 'admin' ? totalStock : (p.stock[currentUser?.branch as keyof typeof p.stock] || 0);
                                    return (
                                        <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                                <img src={p.images[0] || 'https://via.placeholder.com/40'} alt={p.name} className="w-10 h-10 rounded-md object-cover"/>
                                                {p.name}
                                            </td>
                                            <td className="px-6 py-4">{p.sku}</td>
                                            {currentUser?.role === 'admin' && <td className="px-6 py-4">{formatCurrency(p.purchasePrice)}</td>}
                                            <td className="px-6 py-4">{formatCurrency(p.sellingPrice)}</td>
                                            <td className={`px-6 py-4 font-bold ${displayStock <= (p.reorderPoint || 0) ? 'text-red-500' : ''}`}>{displayStock}</td>
                                            <td className="px-6 py-4 flex gap-3">
                                                <button onClick={() => handleEditProduct(p)} className="text-blue-500 hover:text-blue-700 text-lg"><i className="fas fa-edit"></i></button>
                                                {currentUser?.role === 'admin' && (
                                                    <button onClick={() => setProductToDelete(p)} className="text-red-500 hover:text-red-700 text-lg"><i className="fas fa-trash"></i></button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    {hasMore && !isSearching && (
                        <div className="flex justify-center mt-6">
                            <button 
                                onClick={() => loadProducts(false)} 
                                disabled={loading}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <><i className="fas fa-spinner fa-spin"></i> جاري التحميل...</>
                                ) : (
                                    <><i className="fas fa-chevron-down"></i> عرض المزيد</>
                                )}
                            </button>
                        </div>
                    )}
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
            {isPriceIncreaseModalOpen && <PriceIncreaseModal isOpen={isPriceIncreaseModalOpen} onClose={() => setPriceIncreaseModalOpen(false)} />}
            
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
