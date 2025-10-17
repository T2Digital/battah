import React, { useState } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface StoreProductCardProps {
    product: Product;
    onProductClick: (product: Product) => void;
    onAddToCart: (product: Product, quantity: number) => void;
}

const StoreProductCard: React.FC<StoreProductCardProps> = ({ product, onProductClick, onAddToCart }) => {
    const [quantity, setQuantity] = useState<number | ''>(1);

    const handleQuantityChange = (e: React.MouseEvent, amount: number) => {
        e.stopPropagation();
        setQuantity(prev => Math.max(1, Number(prev) + amount));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const val = e.target.value;
        if (val === '') {
            setQuantity('');
        } else {
            const num = parseInt(val, 10);
            // FIX: Only allow positive numbers to be set in state
            if (!isNaN(num) && num > 0) {
                setQuantity(num);
            }
        }
    }

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (quantity === '' || Number(quantity) < 1) {
            setQuantity(1);
        }
    }

    const handleAddToCartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const finalQuantity = Number(quantity);
        if (finalQuantity > 0) {
            onAddToCart(product, finalQuantity);
            setQuantity(1); // Reset after adding
        }
    };

    return (
        <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 cursor-pointer flex flex-col h-full"
            onClick={() => onProductClick(product)}
        >
            <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                <img src={product.images[0] || 'https://via.placeholder.com/150'} alt={product.name} className="h-full w-full object-cover"/>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-md truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{product.brand}</p>
                <div className="mt-auto pt-4">
                    <p className="text-lg font-bold text-primary-dark dark:text-primary-light">{formatCurrency(product.sellingPrice)}</p>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border rounded-md dark:border-gray-600">
                            <button onClick={(e) => handleQuantityChange(e, -1)} className="px-2 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">-</button>
                            <input
                                type="text" // Use text to allow empty string
                                inputMode="numeric" // for mobile numeric keyboard
                                value={quantity}
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                                onClick={(e) => e.stopPropagation()}
                                className="w-12 text-center border-x dark:border-gray-600 dark:bg-gray-800 p-0"
                            />
                            <button onClick={(e) => handleQuantityChange(e, 1)} className="px-2 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">+</button>
                        </div>
                        <button 
                            onClick={handleAddToCartClick}
                            disabled={Number(quantity) < 1}
                            className="py-2 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                        >
                            إضافة
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreProductCard;