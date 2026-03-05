
import React, { useState, useMemo, useEffect } from 'react';
import useStore from '../../lib/store';
import { Product, Employee, Supplier } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
    const { products, employees, suppliers } = useStore(state => ({
        products: state.appData?.products || [],
        employees: state.appData?.employees || [],
        suppliers: state.appData?.suppliers || [],
    }));

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) {
            return { products: [], employees: [], suppliers: [] };
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return {
            products: products.filter(p => p.name.toLowerCase().includes(lowercasedTerm) || p.sku.toLowerCase().includes(lowercasedTerm)).slice(0, 5),
            employees: employees.filter(e => e.name.toLowerCase().includes(lowercasedTerm)).slice(0, 5),
            suppliers: suppliers.filter(s => s.name.toLowerCase().includes(lowercasedTerm)).slice(0, 5),
        };
    }, [searchTerm, products, employees, suppliers]);

    if (!isOpen) return null;

    const ResultSection: React.FC<{ title: string; children: React.ReactNode; count: number }> = ({ title, children, count }) => {
        if (count === 0) return null;
        return (
            <div>
                <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 px-4 py-2">{title}</h3>
                <ul>{children}</ul>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex justify-center pt-20" onClick={onClose}>
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-auto max-h-[70vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
                    <i className="fas fa-search text-gray-400"></i>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ابحث عن منتجات، موظفين، موردين..."
                        className="w-full bg-transparent focus:outline-none text-lg text-gray-800 dark:text-white"
                        autoFocus
                    />
                </div>
                <div className="overflow-y-auto">
                    {searchTerm.trim() ? (
                        <>
                            <ResultSection title="المنتجات" count={searchResults.products.length}>
                                {searchResults.products.map(p => (
                                    <li key={`p-${p.id}`} className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{p.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{p.sku}</p>
                                        </div>
                                        <span className="font-bold text-primary dark:text-primary-light">{formatCurrency(p.sellingPrice)}</span>
                                    </li>
                                ))}
                            </ResultSection>
                            <ResultSection title="الموظفين" count={searchResults.employees.length}>
                                {searchResults.employees.map(e => (
                                    <li key={`e-${e.id}`} className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{e.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{e.position}</p>
                                    </li>
                                ))}
                            </ResultSection>
                            <ResultSection title="الموردين" count={searchResults.suppliers.length}>
                                {searchResults.suppliers.map(s => (
                                    <li key={`s-${s.id}`} className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{s.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{s.contact}</p>
                                    </li>
                                ))}
                            </ResultSection>
                        </>
                    ) : (
                        <p className="p-8 text-center text-gray-500">ابدأ الكتابة للبحث في النظام.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
