
import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../../types';
import Modal from '../shared/Modal';
import useStore from '../../lib/store';

interface ProductSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[]; // Keep this for backward compatibility or initial list
    onSelect: (product: Product, startDate: string, endDate: string) => void;
}

const ProductSelectorModal: React.FC<ProductSelectorModalProps> = ({ isOpen, onClose, products, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const searchProducts = useStore(state => state.searchProducts);

    useEffect(() => {
        const performSearch = async () => {
            if (searchTerm.trim().length > 0) {
                setIsSearching(true);
                try {
                    const results = await searchProducts(searchTerm);
                    setSearchResults(results);
                } catch (error) {
                    console.error("Error searching products:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        };

        const timeoutId = setTimeout(performSearch, 300); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [searchTerm, searchProducts]);

    const handleDateFilterChange = (type: 'all' | 'today' | 'week' | 'month' | 'custom') => {
        setDateFilterType(type);
        const today = new Date();
        if (type === 'today') {
            const dateStr = today.toISOString().split('T')[0];
            setStartDate(dateStr);
            setEndDate(dateStr);
        } else if (type === 'week') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            setStartDate(lastWeek.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
        } else if (type === 'month') {
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            setStartDate(lastMonth.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
        } else if (type === 'all') {
            setStartDate('');
            setEndDate('');
        }
    };

    const displayProducts = useMemo(() => {
        if (searchTerm.trim().length > 0) {
            return searchResults;
        }
        // If no search term, show the initially loaded products (or an empty list if preferred)
        return products.sort((a,b) => a.name.localeCompare(b.name)).slice(0, 50); // Limit to 50 to avoid rendering huge lists
    }, [products, searchResults, searchTerm]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="اختر صنفاً لعرض تقرير حركته">
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleDateFilterChange('all')} className={`px-3 py-1 rounded-md text-sm ${dateFilterType === 'all' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>الكل</button>
                    <button onClick={() => handleDateFilterChange('today')} className={`px-3 py-1 rounded-md text-sm ${dateFilterType === 'today' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>اليوم</button>
                    <button onClick={() => handleDateFilterChange('week')} className={`px-3 py-1 rounded-md text-sm ${dateFilterType === 'week' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>هذا الأسبوع</button>
                    <button onClick={() => handleDateFilterChange('month')} className={`px-3 py-1 rounded-md text-sm ${dateFilterType === 'month' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>هذا الشهر</button>
                    <button onClick={() => handleDateFilterChange('custom')} className={`px-3 py-1 rounded-md text-sm ${dateFilterType === 'custom' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>مخصص</button>
                </div>
                
                {dateFilterType === 'custom' && (
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    </div>
                )}

                <input
                    type="text"
                    placeholder="ابحث عن صنف بالاسم أو الكود..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
                <ul className="max-h-80 overflow-y-auto border rounded-md dark:border-gray-600">
                    {isSearching ? (
                        <li className="p-4 text-center text-gray-500">جاري البحث...</li>
                    ) : displayProducts.length > 0 ? displayProducts.map(product => (
                        <li 
                            key={product.id} 
                            onClick={() => onSelect(product, startDate, endDate)} 
                            className="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-600 last:border-b-0"
                        >
                            <div className="font-semibold">{product.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{product.sku}</div>
                        </li>
                    )) : (
                        <li className="p-4 text-center text-gray-500">لا توجد أصناف مطابقة للبحث.</li>
                    )}
                </ul>
            </div>
        </Modal>
    );
};

export default ProductSelectorModal;
