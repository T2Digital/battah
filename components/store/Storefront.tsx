import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import useStore from '../../lib/store';
import { Product, CartItem, OrderItem, Order, Broadcast } from '../../types';

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
import MyOrdersModal from './MyOrdersModal';
import InstallPrompt from '../shared/InstallPrompt';
import FloatingCheckoutButton from './FloatingCheckoutButton';

import StoreFooter from './StoreFooter';

interface StorefrontProps {
    setViewMode: (mode: 'admin' | 'store') => void;
}

const Storefront: React.FC<StorefrontProps> = ({ setViewMode }) => {
    const { storefrontSettings, createOrder, broadcasts, fetchProducts, searchProducts, fetchProductsByIds } = useStore(state => ({
        storefrontSettings: state.appData?.storefrontSettings,
        createOrder: state.createOrder,
        broadcasts: state.appData?.broadcasts || [],
        fetchProducts: state.fetchProducts,
        searchProducts: state.searchProducts,
        fetchProductsByIds: state.fetchProductsByIds
    }));

    const [products, setProducts] = useState<Product[]>([]);
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const [newArrivals, setNewArrivals] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isCartOpen, setCartOpen] = useState(false);
    const [isCheckoutOpen, setCheckoutOpen] = useState(false);
    const [isMyOrdersOpen, setMyOrdersOpen] = useState(false);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [notification, setNotification] = useState('');
    const [filters, setFilters] = useState({ category: 'all', brand: 'all', search: '' });

    // Fetch featured and new arrivals
    useEffect(() => {
        const loadFeatured = async () => {
            if (storefrontSettings?.featuredProductIds?.length) {
                const results = await fetchProductsByIds(storefrontSettings.featuredProductIds);
                setFeaturedProducts(results);
            }
            if (storefrontSettings?.newArrivalProductIds?.length) {
                const results = await fetchProductsByIds(storefrontSettings.newArrivalProductIds);
                setNewArrivals(results);
            }
        };
        loadFeatured();
    }, [storefrontSettings]);

    // Fetch products based on filters
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                if (filters.search) {
                    const results = await searchProducts(filters.search);
                    setProducts(results);
                } else {
                    const result = await fetchProducts(null, 50, { category: filters.category });
                    setProducts(result.products);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        
        // Debounce search
        const timer = setTimeout(load, filters.search ? 500 : 0);
        return () => clearTimeout(timer);
    }, [filters.category, filters.search]);

    // Broadcast Logic
    useEffect(() => {
        if (broadcasts.length > 0) {
            const latestBroadcast = broadcasts[0];
            const seenBroadcasts = JSON.parse(localStorage.getItem('seenBroadcasts') || '[]');
            
            // Check if latest broadcast is seen
            if (!seenBroadcasts.includes(latestBroadcast.id)) {
                // Show notification
                setNotification(`📢 ${latestBroadcast.message}`);
                
                // Mark as seen
                seenBroadcasts.push(latestBroadcast.id);
                localStorage.setItem('seenBroadcasts', JSON.stringify(seenBroadcasts));
            }
        }
    }, [broadcasts]);

    // SEO Structured Data (JSON-LD)
    const structuredData = useMemo(() => {
        return {
            "@context": "https://schema.org",
            "@type": "AutoPartsStore",
            "name": "بطاح الأصلي",
            "image": "https://i.ibb.co/LDdGwd87/5-1.png",
            "description": "متجر بطاح الأصلي لقطع غيار السيارات وإكسسواراتها الأصلية.",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "شارع دمشق",
                "addressLocality": "القاهرة",
                "addressCountry": "EG"
            },
            "telephone": "+201080444447",
            "priceRange": "$$",
            "openingHours": "Sa-Th 09:00-23:00",
            "url": "https://battah-system.vercel.app/"
        };
    }, []);

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

    const handlePlaceOrder = async (customerDetails: { name: string; phone: string; address: string }, paymentMethod: Order['paymentMethod'], paymentProof?: File, discountCode?: string, locationLink?: string) => {
        const orderItems: OrderItem[] = cartItems.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.sellingPrice,
        }));
        // The total amount is calculated securely in the backend (store.ts) including discounts.
        // We pass the subtotal here for the backend to use as a base.
        const subtotal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
        
        try {
            const proofUrl = await createOrder(customerDetails, orderItems, subtotal, paymentMethod, paymentProof, discountCode, locationLink);
            setCartItems([]);
            setCheckoutOpen(false);
            setNotification('تم إرسال طلبك بنجاح! سيتم التواصل معك للتأكيد.');
            return proofUrl;
        } catch (error) {
            console.error("Failed to create order:", error);
            alert("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
            throw error;
        }
    };

    return (
        <div className="font-cairo bg-slate-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Helmet>
                <title>بطاح الأصلي | قطع غيار سيارات أصلية</title>
                <meta name="description" content="تسوق أفضل قطع غيار السيارات الأصلية والإكسسوارات من بطاح الأصلي. جودة عالية وأسعار تنافسية." />
                <meta name="keywords" content="قطع غيار, سيارات, بطاح, اكسسوارات, زيوت, فلاتر, فرامل" />
                <meta property="og:title" content="بطاح الأصلي | قطع غيار سيارات أصلية" />
                <meta property="og:description" content="تسوق أفضل قطع غيار السيارات الأصلية والإكسسوارات من بطاح الأصلي." />
                <meta property="og:image" content="https://i.ibb.co/LDdGwd87/5-1.png" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>
            <PromotionBanner />
            <StoreHeader
                onCartClick={() => setCartOpen(true)}
                cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                setViewMode={setViewMode}
                onMyOrdersClick={() => setMyOrdersOpen(true)}
            />
            <main>
                <StoreHero setFilters={setFilters} />
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
            {isMyOrdersOpen && (
                <MyOrdersModal
                    isOpen={isMyOrdersOpen}
                    onClose={() => setMyOrdersOpen(false)}
                />
            )}
            <CustomerNotifications message={notification} />
            <AIChatbot 
                setSelectedProduct={setSelectedProduct}
                addToCart={addToCart}
                openCart={() => setCartOpen(true)}
                cartItems={cartItems}
                updateCartQuantity={updateCartQuantity}
                handleCheckout={handleCheckout}
            />
            <InstallPrompt />
            <FloatingCheckoutButton 
                itemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                totalAmount={cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0)}
                onCheckout={handleCheckout}
            />
            <StoreFooter />
        </div>
    );
};

export default Storefront;