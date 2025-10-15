import React, { useState } from 'react';
import { Product } from '../../types';
import Modal from '../shared/Modal';
import { formatCurrency } from '../../lib/utils';

interface StoreProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onAddToCart: (product: Product, quantity: number) => void;
}

const StoreProductModal: React.FC<StoreProductModalProps> = ({ isOpen, onClose, product, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [mainImage, setMainImage] = useState(product?.images[0] || '');

    React.useEffect(() => {
        if (product) {
            setMainImage(product.images[0] || 'https://via.placeholder.com/400x300');
            setQuantity(1);
        }
    }, [product]);

    if (!product) return null;

    const isAvailable = product.stock.main > 0;

    const handleAddToCart = (e: React.FormEvent) => {
        e.preventDefault();
        onAddToCart(product, quantity);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product.name} onSave={isAvailable ? handleAddToCart : undefined}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <img src={mainImage} alt={product.name} className="w-full h-64 object-cover rounded-lg mb-3 shadow-md"/>
                    <div className="flex gap-2">
                        {product.images.map((img, index) => (
                            <img 
                                key={index} 
                                src={img} 
                                alt={`${product.name} ${index+1}`} 
                                onClick={() => setMainImage(img)}
                                className={`w-16 h-16 object-cover rounded-md cursor-pointer border-2 ${mainImage === img ? 'border-primary-dark' : 'border-transparent'}`}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{product.description || 'لا يوجد وصف متاح لهذا المنتج.'}</p>
                    <div className="space-y-3 text-sm">
                        <p><strong>الماركة:</strong> {product.brand}</p>
                        <p><strong>الكود:</strong> {product.sku}</p>
                        <p><strong>القسم:</strong> {product.mainCategory} / {product.category}</p>
                    </div>

                    {product.compatibility.length > 0 && (
                        <div className="mt-4">
                            <strong className="block mb-2">متوافق مع:</strong>
                            <ul className="list-disc list-inside text-sm space-y-1 bg-slate-100 dark:bg-gray-700 p-3 rounded-md">
                                {product.compatibility.map((c, i) => (
                                    <li key={i}>{c.make} {c.model} ( {c.years.join(', ')} )</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-100 dark:bg-gray-700 p-4 rounded-lg">
                        <span className="text-3xl font-bold text-primary-dark dark:text-primary-light">{formatCurrency(product.sellingPrice)}</span>
                        {isAvailable ? (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    value={quantity}
                                    onChange={e => setQuantity(Math.max(1, Math.min(product.stock.main, Number(e.target.value))))}
                                    min="1"
                                    max={product.stock.main}
                                    className="w-20 text-center p-2 border rounded-md dark:bg-gray-600"
                                />
                                <span>من {product.stock.main} متاح</span>
                            </div>
                        ) : (
                            <span className="font-bold text-red-500">نفدت الكمية</span>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default StoreProductModal;