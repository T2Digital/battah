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

    const totalStock = Object.values(product.stock).reduce((a: number, b: number) => a + b, 0);

    const DetailItem: React.FC<{ label: string; value: string | undefined }> = ({ label, value }) => (
        value ? <div className="text-sm"><span className="font-semibold text-gray-600 dark:text-gray-400">{label}:</span> {value}</div> : null
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product.name}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                    <img src={product.images[0] || 'https://via.placeholder.com/300'} alt={product.name} className="w-full h-auto object-contain rounded-lg" />
                    <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <DetailItem label="الكود (SKU)" value={product.sku} />
                        <DetailItem label="الفئة الرئيسية" value={product.mainCategory} />
                        <DetailItem label="الفئة الفرعية" value={product.category} />
                        {product.compatibility && product.compatibility.length > 0 &&
                           <DetailItem label="متوافق مع" value={product.compatibility.join(', ')} />
                        }
                    </div>
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
                                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-1 font-bold text-lg">-</button>
                                        <span className="px-4 text-lg font-semibold">{quantity}</span>
                                        <button onClick={() => setQuantity(q => q + 1)} className="px-3 py-1 font-bold text-lg">+</button>
                                    </div>
                                    <button onClick={handleAddToCart} className="flex-grow py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors text-lg">
                                        أضف للسلة
                                    </button>
                                </div>
                                <p className="text-green-600 dark:text-green-400 text-sm mt-2 flex items-center gap-2">
                                    <i className="fas fa-check-circle"></i>
                                    متوفر في المخزون
                                </p>
                            </>
                        ) : (
                             <p className="text-red-500 font-bold flex items-center gap-2">
                                 <i className="fas fa-times-circle"></i>
                                 نفذت الكمية حالياً
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default StoreProductModal;