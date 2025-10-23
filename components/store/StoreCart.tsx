import React from 'react';
import { CartItem } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface StoreCartProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onUpdateQuantity: (productId: number, quantity: number) => void;
    onCheckout: () => void;
}

const StoreCart: React.FC<StoreCartProps> = ({ isOpen, onClose, cartItems, onUpdateQuantity, onCheckout }) => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                        <h3 className="text-xl font-bold">سلة التسوق</h3>
                        <button onClick={onClose} className="w-8 h-8 flex justify-center items-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    {cartItems.length === 0 ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                            <i className="fas fa-shopping-cart text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
                            <h4 className="font-bold text-lg">سلتك فارغة</h4>
                            <p className="text-gray-500 dark:text-gray-400">ابدأ بإضافة بعض المنتجات الرائعة!</p>
                        </div>
                    ) : (
                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            {cartItems.map(item => (
                                <div key={item.product.id} className="flex gap-4">
                                    <img src={item.product.images[0]} alt={item.product.name} className="w-20 h-20 object-cover rounded-md" />
                                    <div className="flex-grow">
                                        <p className="font-semibold truncate">{item.product.name}</p>
                                        <p className="text-sm text-gray-500">{formatCurrency(item.product.sellingPrice)}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)} className="w-6 h-6 border rounded">-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)} className="w-6 h-6 border rounded">+</button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between items-end">
                                      <p className="font-bold text-sm">{formatCurrency(item.product.sellingPrice * item.quantity)}</p>
                                      <button onClick={() => onUpdateQuantity(item.product.id, 0)} className="text-red-500 hover:text-red-700 self-start">
                                          <i className="fas fa-trash-alt"></i>
                                      </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-semibold text-lg">الإجمالي</span>
                            <span className="font-bold text-xl text-primary-dark dark:text-primary-light">{formatCurrency(subtotal)}</span>
                        </div>
                        <button 
                            onClick={onCheckout}
                            disabled={cartItems.length === 0}
                            className="w-full py-3 bg-primary-dark text-white rounded-lg font-bold hover:bg-blue-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            إتمام الطلب
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StoreCart;