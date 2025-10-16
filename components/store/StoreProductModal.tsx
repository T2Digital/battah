import React, { useState } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import Modal from '../shared/Modal';

interface StoreProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    onAddToCart: (product: Product, quantity: number) => void;
}

const StoreProductModal: React.FC<StoreProductModalProps> = ({ isOpen, onClose, product, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);

    const handleAddToCart = () => {
        onAddToCart(product, quantity);
        onClose();
    };

    if (!isOpen) return null;

    // Fix: Explicitly type accumulator and value in reduce to prevent type inference issue.
    const totalStock = Object.values(product.stock).reduce((a: number, b: number) => a + b, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product.name}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <img src={product.images[0] || 'https://via.placeholder.com/300'} alt={product.name} className="w-full h-auto object-cover rounded-lg" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">{product.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{product.brand}</p>
                    <p className="text-3xl font-bold text-primary-dark dark:text-primary-light my-4">{formatCurrency(product.sellingPrice)}</p>
                    <p className="text-sm leading-relaxed">{product.description}</p>
                    
                    <div className="mt-6">
                        {totalStock > 0 ? (
                            <>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center border rounded-md dark:border-gray-600">
                                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-1">-</button>
                                        <span className="px-4">{quantity}</span>
                                        <button onClick={() => setQuantity(q => q + 1)} className="px-3 py-1">+</button>
                                    </div>
                                    <button onClick={handleAddToCart} className="flex-grow py-2 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                                        أضف للسلة
                                    </button>
                                </div>
                                <p className="text-green-600 dark:text-green-400 text-sm mt-2">متوفر في المخزون</p>
                            </>
                        ) : (
                            <p className="text-red-500 font-bold">نفذت الكمية</p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default StoreProductModal;