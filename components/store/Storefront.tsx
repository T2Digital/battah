import React, { useState, useMemo, useEffect } from 'react';
import useStore from '../../lib/store';
import { Product, CartItem, OrderItem, Order } from '../../types';

import StoreHeader from './StoreHeader';
import StoreHero from './StoreHero';
import StoreProducts from './StoreProducts';
import StoreProductModal from './StoreProductModal';
import StoreCart from './StoreCart';
import CheckoutModal from './CheckoutModal';
import FeaturedProductsSection from './FeaturedProductsSection';
import NewArrivalsSection from './NewArrivalsSection';
import PromotionBanner from './PromotionBanner';
import CustomerNotifications from './CustomerNotifications';
import CategoryHighlights from './CategoryHighlights';

interface StorefrontProps {
    setViewMode: (mode: 'admin' | 'store') => void;
}

const Storefront: React.FC<StorefrontProps> = ({ setViewMode }) => {
    const { products, storefrontSettings, createOrder } = useStore(state => ({
        products: state.appData?.products || [],
        storefrontSettings: state.appData?.storefrontSettings,
        createOrder: state.createOrder,
    }));

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isCartOpen, setCartOpen] = useState(false);
    const [isCheckoutOpen, setCheckoutOpen] = useState(false);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [notification, setNotification] = useState('');
    const [filters, setFilters] = useState({ category: 'all', brand: 'all', search: '' });


    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const addToCart = (product: Product, quantity: number) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.product.id === product.id);
            if (existingItem) {
                return prevItems.map(item =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prevItems, { product, quantity }];
        });
        setNotification(`تم إضافة "${product.name}" إلى السلة`);
    };

    const updateCartQuantity = (productId: number, quantity: number) => {
        if (quantity <= 0) {
            setCartItems(prev => prev.filter(item => item.product.id !== productId));
        } else {
            setCartItems(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
        }
    };

    const handleCheckout = () => {
        setCartOpen(false);
        setCheckoutOpen(true);
    };

    const handlePlaceOrder = async (customerDetails: { name: string; phone: string; address: string }, paymentMethod: Order['paymentMethod'], paymentProof?: File) => {
        const orderItems: OrderItem[] = cartItems.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.sellingPrice,
        }));
        const totalAmount = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);

        try {
            await createOrder(customerDetails, orderItems, totalAmount, paymentMethod, paymentProof);
            setCartItems([]);
            setCheckoutOpen(false);
            setNotification('تم إرسال طلبك بنجاح! سنتواصل معك قريباً.');
        } catch (error) {
            console.error("Failed to create order:", error);
            alert("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
        }
    };
    
    const featuredProducts = useMemo(() => {
        if (!storefrontSettings) return [];
        return storefrontSettings.featuredProductIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
    }, [products, storefrontSettings]);

    const newArrivals = useMemo(() => {
        if (!storefrontSettings) return [];
        return storefrontSettings.newArrivalProductIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
    }, [products, storefrontSettings]);


    return (
        <div className="font-cairo bg-slate-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <PromotionBanner />
            <StoreHeader
                onCartClick={() => setCartOpen(true)}
                cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                setViewMode={setViewMode}
            />
            <main>
                <StoreHero />
                <CategoryHighlights setFilters={setFilters} />
                <FeaturedProductsSection products={featuredProducts} onProductClick={setSelectedProduct} addToCart={addToCart} />
                <NewArrivalsSection products={newArrivals} onProductClick={setSelectedProduct} addToCart={addToCart} />
                <StoreProducts 
                    products={products} 
                    onProductClick={setSelectedProduct} 
                    addToCart={addToCart}
                    filters={filters}
                    setFilters={setFilters} 
                />
            </main>

            {selectedProduct && (
                <StoreProductModal
                    isOpen={!!selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    product={selectedProduct}
                    onAddToCart={addToCart}
                />
            )}
            
            <StoreCart
                isOpen={isCartOpen}
                onClose={() => setCartOpen(false)}
                cartItems={cartItems}
                onUpdateQuantity={updateCartQuantity}
                onCheckout={handleCheckout}
            />
            
            {isCheckoutOpen && (
                 <CheckoutModal
                    isOpen={isCheckoutOpen}
                    onClose={() => setCheckoutOpen(false)}
                    cartItems={cartItems}
                    onPlaceOrder={handlePlaceOrder}
                />
            )}
            <CustomerNotifications message={notification} />
        </div>
    );
};

export default Storefront;