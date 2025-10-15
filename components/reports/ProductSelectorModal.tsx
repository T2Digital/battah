import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import Modal from '../shared/Modal';

interface ProductSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onSelect: (product: Product) => void;
}

const ProductSelectorModal: React.FC<ProductSelectorModalProps> = ({ isOpen, onClose, products, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [products, searchTerm]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="اختر صنفاً لعرض تقرير حركته">
            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="ابحث عن صنف بالاسم أو الكود..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
                <ul className="max-h-80 overflow-y-auto border rounded-md dark:border-gray-600">
                    {filteredProducts.length > 0 ? filteredProducts.map(product => (
                        <li 
                            key={product.id} 
                            onClick={() => onSelect(product)} 
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