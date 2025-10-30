import React, { useState, useMemo } from 'react';
import useStore from '../../lib/store';
import { Product, MainCategory } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import ProductModal from './ProductModal';
import StorefrontSettings from './StorefrontSettings';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatCurrency } from '../../lib/utils';

const Inventory: React.FC = () => {
    const { 
        products, 
        setProducts, 
        deleteProduct,
        storefrontSettings,
        updateStorefrontSettings 
    } = useStore(state => ({
        products: state.appData?.products || [],
        setProducts: state.setProducts,
        deleteProduct: state.deleteProduct,
        storefrontSettings: state.appData?.storefrontSettings,
        updateStorefrontSettings: state.updateStorefrontSettings,
    }));

    const [isProductModalOpen, setProductModalOpen] = useState(false);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        stockStatus: 'all',
    });

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
            setProductToDelete(null);
        } catch (error) {
            console.error("Failed to delete product:", error);
            alert(`فشل حذف المنتج: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveProduct = (product: Omit<Product, 'id'> & { id?: number }) => {
        if (product.id) {
            setProducts(products.map(p => (p.id === product.id ? { ...p, ...product } as Product : p)));
        } else {
            const newId = (products.length > 0 ? Math.max(...products.map(p => p.id)) : 0) + 1;
            setProducts([...products, { ...product, id: newId } as Product]);
        }
        setProductModalOpen(false);
    };
    
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
            const matchesSearch = p.name.toLowerCase().includes(filters.search.toLowerCase()) || p.sku.toLowerCase().includes(filters.search.toLowerCase());
            const matchesCategory = filters.category ? p.mainCategory === filters.category : true;
            const matchesStock = filters.stockStatus === 'all' || (filters.stockStatus === 'low' && totalStock <= (p.reorderPoint || 0)) || (filters.stockStatus === 'out' && totalStock === 0);
            return matchesSearch && matchesCategory && matchesStock;
        });
    }, [products, filters]);

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

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 items-center">
                <input
                    type="text"
                    placeholder="ابحث بالاسم أو الكود..."
                    value={filters.search}
                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
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

            {isProductModalOpen && <ProductModal isOpen={isProductModalOpen} onClose={() => setProductModalOpen(false)} onSave={handleSaveProduct} existingProduct={productToEdit} />}
            {isSettingsModalOpen && storefrontSettings && <StorefrontSettings isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} settings={storefrontSettings} onSave={updateStorefrontSettings} products={products} />}
            
            {productToDelete && (
                <ConfirmationModal
                    isOpen={!!productToDelete}
                    onClose={() => setProductToDelete(null)}
                    onConfirm={confirmDeleteProduct}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف المنتج "${productToDelete.name}"؟`}
                    isLoading={isDeleting}
                />
            )}
        </div>
    );
};

export default Inventory;