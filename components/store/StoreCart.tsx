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
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>
            
            {/* Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <i className="fas fa-shopping-cart text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white leading-none">سلة التسوق</h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{cartItems.length} منتجات</span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 flex justify-center items-center rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-slate-50 dark:bg-gray-900/50 custom-scrollbar">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                                <i className="fas fa-shopping-basket text-4xl text-gray-300 dark:text-gray-600"></i>
                            </div>
                            <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-2">سلتك فارغة</h4>
                            <p className="text-gray-500 dark:text-gray-400 max-w-[250px]">تصفح منتجاتنا وأضف ما تحتاجه لسيارتك هنا!</p>
                            <button 
                                onClick={onClose}
                                className="mt-8 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors"
                            >
                                تصفح المنتجات
                            </button>
                        </div>
                    ) : (
                        cartItems.map(item => (
                            <div key={item.product.id} className="flex gap-4 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 p-2 border border-gray-100 dark:border-gray-600">
                                    <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                </div>
                                
                                <div className="flex-grow flex flex-col justify-between py-1">
                                    <div className="pr-8"> {/* Add padding right to avoid overlap with delete button */}
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">{item.product.brand}</p>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2">{item.product.name}</h4>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg h-8 border border-gray-200 dark:border-gray-600">
                                            <button 
                                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)} 
                                                className="w-8 h-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                            >
                                                <i className="fas fa-minus text-xs"></i>
                                            </button>
                                            <span className="w-8 text-center font-bold text-sm text-gray-900 dark:text-white">{item.quantity}</span>
                                            <button 
                                                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)} 
                                                className="w-8 h-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                            >
                                                <i className="fas fa-plus text-xs"></i>
                                            </button>
                                        </div>
                                        <span className="font-black text-primary dark:text-primary-light">
                                            {formatCurrency(item.product.sellingPrice * item.quantity)}
                                        </span>
                                    </div>
                                </div>

                                {/* Delete Button */}
                                <button 
                                    onClick={() => onUpdateQuantity(item.product.id, 0)} 
                                    className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-900/20 dark:hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100 shadow-sm"
                                    aria-label="حذف المنتج"
                                >
                                    <i className="fas fa-trash-alt text-sm"></i>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {cartItems.length > 0 && (
                    <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.2)] z-10">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">الإجمالي (شامل الضريبة)</span>
                            <span className="font-black text-2xl text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
                        </div>
                        <button 
                            onClick={onCheckout}
                            className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-3 text-lg active:scale-[0.98]"
                        >
                            <span>إتمام الطلب</span>
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                            <i className="fas fa-shield-alt"></i>
                            <span>دفع آمن وموثوق 100%</span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default StoreCart;