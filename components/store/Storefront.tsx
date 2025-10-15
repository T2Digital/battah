import React, { useState } from 'react';
import { Product, MainCategory } from '../../types';
import useStore from '../../lib/store';
import StoreHeader from './StoreHeader';
import StoreHero from './StoreHero';
import StoreProducts from './StoreProducts';
import StoreProductModal from './StoreProductModal';
import StoreCart from './StoreCart';
import CheckoutModal from './CheckoutModal';

const StoreCategories: React.FC<{ 
    categories: { id: number; name: string; icon: string; description: string }[], 
    onCategorySelect: (category: MainCategory) => void 
}> = ({ categories, onCategorySelect }) => (
    <div className="bg-slate-100 dark:bg-gray-800/50 py-12">
        <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-center mb-8">الفئات الرئيسية</h2>
            <div className="grid grid-cols-3 md:grid-cols-3 gap-4 sm:gap-6">
                {categories.map(category => (
                    <div 
                        key={category.id} 
                        onClick={() => onCategorySelect(category.name as MainCategory)}
                        className="category-card-store bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md text-center border-2 border-transparent hover:border-primary-light cursor-pointer"
                    >
                        <div className="text-5xl mb-3">{category.icon}</div>
                        <h3 className="font-bold text-md sm:text-lg">{category.name}</h3>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const StoreFooter: React.FC = () => (
    <footer className="text-center p-6 mt-8 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <p>&copy; 2024 شركة بطاح لقطع غيار السيارات. جميع الحقوق محفوظة.</p>
    </footer>
);


interface StorefrontProps {
    setViewMode: (mode: 'admin' | 'store') => void;
}

const Storefront: React.FC<StorefrontProps> = ({ setViewMode }) => {
    const { 
        products, 
        categories, 
        cart, 
        addToCart, 
        updateCartQuantity, 
        clearCart,
        currentUser 
    } = useStore(state => ({
        products: state.appData?.products || [],
        categories: state.appData?.categories || [],
        cart: state.cart,
        addToCart: state.addToCart,
        updateCartQuantity: state.updateCartQuantity,
        clearCart: state.clearCart,
        currentUser: state.currentUser,
    }));
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isCartOpen, setCartOpen] = useState(false);
    const [isCheckoutOpen, setCheckoutOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<MainCategory | ''>('');
    
    const handleProductClick = (product: Product) => setSelectedProduct(product);
    const handleCloseModal = () => setSelectedProduct(null);

    const handleCheckout = () => {
        if (cart.length === 0) return;
        setCartOpen(false);
        setCheckoutOpen(true);
    };

    const handleCategorySelect = (category: MainCategory) => {
        setCategoryFilter(prev => prev === category ? '' : category);
        const productsElement = document.getElementById('store-products');
        if (productsElement) {
            productsElement.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const adminUser = useStore(state => state.appData?.users.find(u => u.role === 'admin'));

    return (
        <div className="bg-slate-50 dark:bg-gray-900 min-h-screen font-cairo" dir="rtl">
            <StoreHeader 
                cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
                onCartClick={() => setCartOpen(true)}
                setViewMode={setViewMode}
                isLoggedIn={!!currentUser}
            />
            <main>
                <StoreHero />
                <StoreCategories categories={categories} onCategorySelect={handleCategorySelect} />
                <StoreProducts 
                    products={products} 
                    onProductClick={handleProductClick}
                    addToCart={addToCart}
                    activeCategory={categoryFilter}
                />
            </main>
            <StoreFooter />

            {selectedProduct && (
                <StoreProductModal
                    isOpen={!!selectedProduct}
                    onClose={handleCloseModal}
                    product={selectedProduct}
                    onAddToCart={addToCart}
                />
            )}
            
            <StoreCart 
                isOpen={isCartOpen}
                onClose={() => setCartOpen(false)}
                cartItems={cart}
                onUpdateQuantity={updateCartQuantity}
                onCheckout={handleCheckout}
            />

            {isCheckoutOpen && adminUser?.phone && (
                <CheckoutModal
                    isOpen={isCheckoutOpen}
                    onClose={() => setCheckoutOpen(false)}
                    cartItems={cart}
                    clearCart={clearCart}
                    companyPhone={adminUser.phone}
                />
            )}
        </div>
    );
};

export default Storefront;