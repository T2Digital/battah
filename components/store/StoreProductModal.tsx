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
    const [activeImage, setActiveImage] = useState(0);

    const handleAddToCart = () => {
        onAddToCart(product, quantity);
        onClose();
    };

    if (!isOpen) return null;

    const totalStock = product.stock.main + product.stock.branch1 + product.stock.branch2 + product.stock.branch3;
    const hasDiscount = product.discount && product.discount > 0;
    const originalPrice = hasDiscount ? product.sellingPrice / (1 - product.discount! / 100) : product.sellingPrice;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product.name} maxWidth="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Image Gallery */}
                <div className="flex flex-col gap-4">
                    <div className="relative aspect-square bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center p-4 border border-gray-100 dark:border-gray-700">
                        {hasDiscount && (
                            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10 shadow-sm">
                                خصم {product.discount}%
                            </div>
                        )}
                        <img 
                            src={product.images[activeImage] || 'https://via.placeholder.com/400'} 
                            alt={product.name} 
                            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" 
                        />
                    </div>
                    
                    {product.images.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                            {product.images.map((img, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setActiveImage(idx)}
                                    className={`w-20 h-20 flex-shrink-0 rounded-xl border-2 overflow-hidden bg-gray-50 dark:bg-gray-800 p-2 transition-all ${activeImage === idx ? 'border-primary shadow-md' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                                >
                                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Details */}
                <div className="flex flex-col">
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-full uppercase tracking-wider">
                                {product.brand}
                            </span>
                            <div className="flex items-center text-yellow-400 text-sm">
                                <i className="fas fa-star"></i>
                                <span className="text-gray-600 dark:text-gray-400 ml-1 font-medium">{product.rating || '4.5'}</span>
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight mb-4">{product.name}</h2>
                        
                        <div className="flex items-end gap-3 mb-6">
                            <span className="text-4xl font-black text-primary dark:text-primary-light leading-none">
                                {formatCurrency(product.sellingPrice)}
                            </span>
                            {hasDiscount && (
                                <span className="text-lg text-gray-400 line-through mb-1">{formatCurrency(originalPrice)}</span>
                            )}
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                            {product.description || 'لا يوجد وصف متاح لهذا المنتج حالياً.'}
                        </p>
                    </div>

                    {/* Specifications Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">الكود (SKU)</span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">{product.sku}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">القسم</span>
                            <span className="font-bold text-gray-900 dark:text-white">{product.mainCategory}</span>
                        </div>
                        {product.compatibility && product.compatibility.length > 0 && (
                            <div className="col-span-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">متوافق مع</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {product.compatibility.map((car, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {car}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add to Cart Action */}
                    <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700">
                        {totalStock > 0 ? (
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-xl h-14 px-2 sm:w-32 shrink-0">
                                    <button 
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                                        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-primary transition-all shadow-sm"
                                    >
                                        <i className="fas fa-minus"></i>
                                    </button>
                                    <span className="font-bold text-lg w-8 text-center">{quantity}</span>
                                    <button 
                                        onClick={() => setQuantity(q => q + 1)} 
                                        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-primary transition-all shadow-sm"
                                    >
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </div>
                                <button 
                                    onClick={handleAddToCart} 
                                    className="flex-grow h-14 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-3 text-lg group"
                                >
                                    <i className="fas fa-cart-plus transform group-hover:scale-110 transition-transform"></i>
                                    إضافة للسلة
                                </button>
                            </div>
                        ) : (
                            <div className="h-14 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-center gap-2 font-bold">
                                <i className="fas fa-times-circle text-xl"></i>
                                نفذت الكمية حالياً
                            </div>
                        )}
                        
                        {totalStock > 0 && totalStock < 5 && (
                            <p className="text-orange-500 text-sm mt-3 flex items-center gap-2 font-medium">
                                <i className="fas fa-exclamation-triangle"></i>
                                سارع بالطلب! متبقي {totalStock} قطع فقط
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default StoreProductModal;