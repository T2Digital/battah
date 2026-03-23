import React, { useState, useEffect } from 'react';
import { Product, StorefrontSettings as SettingsType } from '../../types';
import Modal from '../shared/Modal';
import useStore from '../../lib/store';

interface StorefrontSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    settings: SettingsType;
    onSave: (newSettings: SettingsType) => void;
    products: Product[]; // We can keep this for initial products, but we'll fetch more if needed
}

const StorefrontSettings: React.FC<StorefrontSettingsProps> = ({ isOpen, onClose, settings, onSave, products: initialProducts }) => {
    const { fetchProductsByIds, searchProducts, globalProducts } = useStore(state => ({
        fetchProductsByIds: state.fetchProductsByIds,
        searchProducts: state.searchProducts,
        globalProducts: state.appData?.products || []
    }));

    const [featured, setFeatured] = useState<number[]>([]);
    const [newArrivals, setNewArrivals] = useState<number[]>([]);
    const [adminPassword, setAdminPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProductsData, setSelectedProductsData] = useState<Product[]>([]);

    useEffect(() => {
        if (settings) {
            setFeatured(settings.featuredProductIds || []);
            setNewArrivals(settings.newArrivalProductIds || []);
            setAdminPassword(settings.adminPassword || '');
        }
    }, [settings, isOpen]);

    // Fetch data for already selected products that might not be in the initial products list
    useEffect(() => {
        const loadSelectedProducts = async () => {
            const allSelectedIds = [...new Set([...featured, ...newArrivals])];
            const missingIds = allSelectedIds.filter(id => !globalProducts.some(p => p.id === id));
            
            if (missingIds.length > 0) {
                await fetchProductsByIds(missingIds);
            }
        };
        
        if (isOpen && (featured.length > 0 || newArrivals.length > 0)) {
            loadSelectedProducts();
        }
    }, [isOpen, featured, newArrivals, fetchProductsByIds, globalProducts]);

    useEffect(() => {
        // Combine initial products, search results, and global products to ensure we have data for selected items
        const allAvailableProducts = [...globalProducts, ...searchResults];
        const uniqueProducts = Array.from(new Map(allAvailableProducts.map(item => [item.id, item])).values());
        setSelectedProductsData(uniqueProducts);
    }, [globalProducts, searchResults]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchProducts(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleToggle = (list: 'featured' | 'newArrivals', productId: number) => {
        const setter = list === 'featured' ? setFeatured : setNewArrivals;
        setter(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({ featuredProductIds: featured, newArrivalProductIds: newArrivals, adminPassword });
            onClose();
        } catch (error) {
            console.error("Failed to save storefront settings:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const ProductList: React.FC<{ title: string; selectedIds: number[]; onToggle: (id: number) => void }> = ({ title, selectedIds, onToggle }) => {
        // Show selected products first, then search results or initial products
        const displayProducts = selectedProductsData.filter(p => 
            selectedIds.includes(p.id) || 
            (searchQuery ? searchResults.some(sr => sr.id === p.id) : initialProducts.some(ip => ip.id === p.id))
        );

        // Sort so selected items are at the top
        displayProducts.sort((a, b) => {
            const aSelected = selectedIds.includes(a.id);
            const bSelected = selectedIds.includes(b.id);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return 0;
        });

        return (
            <div className="flex flex-col h-full">
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <div className="flex-grow h-64 overflow-y-auto border rounded-md p-2 space-y-1 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                    {displayProducts.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">لا توجد منتجات لعرضها. ابحث لإضافة منتجات.</p>
                    ) : (
                        displayProducts.map(p => (
                            <div key={p.id} className={`flex items-center p-2 rounded transition-colors ${selectedIds.includes(p.id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                <input
                                    type="checkbox"
                                    id={`${title}-${p.id}`}
                                    checked={selectedIds.includes(p.id)}
                                    onChange={() => onToggle(p.id)}
                                    className="ml-3 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor={`${title}-${p.id}`} className="text-sm cursor-pointer flex-grow font-medium">{p.name}</label>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إعدادات واجهة المتجر" onSave={handleSubmit} isLoading={isSaving}>
            <div className="space-y-6">
                
                {/* Search Bar */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 shadow-sm">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">البحث عن منتجات لإضافتها</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSearch(e as any);
                                }
                            }}
                            placeholder="ابحث باسم المنتج..."
                            className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <button 
                            type="button" 
                            onClick={handleSearch as any}
                            disabled={isSearching}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                            بحث
                        </button>
                        {searchResults.length > 0 && (
                            <button 
                                type="button"
                                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                            >
                                مسح
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProductList title="المنتجات المميزة (الأكثر مبيعاً)" selectedIds={featured} onToggle={(id) => handleToggle('featured', id)} />
                    <ProductList title="المنتجات الجديدة (وصل حديثاً)" selectedIds={newArrivals} onToggle={(id) => handleToggle('newArrivals', id)} />
                </div>
                
                <div className="border-t pt-4">
                    <h3 className="font-bold text-lg mb-2 text-red-600">إعدادات الأمان</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">كلمة مرور العمليات الحساسة (للمدير)</label>
                        <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="اتركه فارغاً لتعطيل الخاصية"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">تستخدم لتأكيد الحذف والتعديل والإضافة في الأقسام الحساسة.</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default StorefrontSettings;
