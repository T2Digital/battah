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
import AIChatbot from '../shared/AIChatbot';

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

    // Load cart from localStorage on initial render
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem('battahCart');
            if (savedCart) {
                const parsedCart: {productId: number, quantity: number}[] = JSON.parse(savedCart);
                // Reconstruct cart with full product objects
                const reconstructedCart: CartItem[] = parsedCart.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    return product ? { product, quantity: item.quantity } : null;
                }).filter((item): item is CartItem => item !== null);
                 setCartItems(reconstructedCart);
            }
        } catch (error) {
            console.error("Failed to parse cart from localStorage", error);
        }
    }, [products]); // Depend on products to reconstruct cart once they are loaded

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        // Save a lightweight version of the cart to avoid storing large product objects
        const lightCart = cartItems.map(item => ({ productId: item.product.id, quantity: item.quantity }));
        localStorage.setItem('battahCart', JSON.stringify(lightCart));
    }, [cartItems]);


    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(''), 4000);
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
            setNotification('تم إرسال طلبك بنجاح! سيتم التواصل معك للتأكيد.');
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
            <AIChatbot 
                setSelectedProduct={setSelectedProduct}
                addToCart={addToCart}
                openCart={() => setCartOpen(true)}
            />
        </div>
    );
};

export default Storefront;