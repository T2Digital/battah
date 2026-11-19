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
import { initStorePixels, trackStoreEvent } from '../../utils/pixels';
import { StoreFilters, DEFAULT_STORE_FILTERS, getStoreBranding } from '../../lib/appConfig';
import { PlacedOrderResult } from './CheckoutModal';

interface StorefrontProps {
    setViewMode: (mode: 'admin' | 'store') => void;
}

const Storefront: React.FC<StorefrontProps> = ({ setViewMode }) => {
    const { storefrontSettings, createOrder, broadcasts, fetchProducts, searchProducts, fetchProductsByIds, pendingScan, setPendingScan } = useStore(state => ({
        storefrontSettings: state.appData?.storefrontSettings,
        createOrder: state.createOrder,
        broadcasts: state.appData?.broadcasts || [],
        fetchProducts: state.fetchProducts,
        searchProducts: state.searchProducts,
        fetchProductsByIds: state.fetchProductsByIds,
        pendingScan: state.pendingScan,
        setPendingScan: state.setPendingScan
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
    const [filters, setFilters] = useState<StoreFilters>(DEFAULT_STORE_FILTERS);

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

    // Initialize Multi-Platform Tracking Pixels (Meta / TikTok / Google / Snapchat)
    useEffect(() => {
        const s: any = storefrontSettings || {};
        const brand: any = (typeof window !== 'undefined' && (window as any).__TENANT_BRAND__) || {};
        initStorePixels({
            metaPixelId: s.metaPixelId || brand.metaPixelId,
            tiktokPixelId: s.tiktokPixelId || brand.tiktokPixelId,
            googleTagId: s.googleTagId || brand.googleTagId,
            snapPixelId: s.snapPixelId || brand.snapPixelId,
        });
    }, [storefrontSettings]);

    useEffect(() => {
        if (selectedProduct) {
            trackStoreEvent('ViewContent', {
                content_name: selectedProduct.name,
                content_ids: [selectedProduct.id],
                value: Number(selectedProduct.sellingPrice || 0),
                currency: 'EGP',
            });
        }
    }, [selectedProduct]);

    const storeProducts = useStore(state => state.appData?.products || []);

    // Fetch products based on filters or live storeProducts updates
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
    }, [filters.category, filters.search, storeProducts]);

    // Handle Smart Scanning from Hash or pendingScan
    const globalLoading = useStore(state => state.isLoading);
    useEffect(() => {
        const handleScan = async (sku: string) => {
            let finalSku = sku.trim();
            if (finalSku.includes('#scan/')) {
                finalSku = decodeURIComponent(finalSku.split('#scan/')[1]);
            }
            if (!finalSku) return;
            setLoading(true);
            try {
                // Try to find in local products first to speed up
                let exactMatch = useStore.getState().appData?.products?.find(p => String(p.sku || '').toLowerCase() === finalSku.toLowerCase() || String(p.id) === finalSku);
                
                if (!exactMatch) {
                    const results = await searchProducts(finalSku);
                    exactMatch = results.find(p => String(p.sku || '').toLowerCase() === finalSku.toLowerCase() || String(p.id) === finalSku);
                }
                
                if (exactMatch) {
                    setSelectedProduct(exactMatch);
                } else {
                    alert(`لم يتم العثور على المنتج بالباركود: ${finalSku}`);
                }
            } catch (error) {
                console.error("Error finding scanned product:", error);
            } finally {
                setLoading(false);
            }
        };

        const scanEventObj = (e: CustomEvent<string>) => handleScan(e.detail);
        
        window.addEventListener('scan-store-product', scanEventObj as EventListener);
        
        if (!globalLoading && pendingScan) {
            handleScan(pendingScan);
            setPendingScan(null); // clear it
        }

        return () => window.removeEventListener('scan-store-product', scanEventObj as EventListener);
    }, [searchProducts, globalLoading, pendingScan, setPendingScan]);

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

    const handleSelectProduct = (product: Product | null) => {
        setSelectedProduct(product);
        if (typeof window !== 'undefined') {
            try {
                const url = new URL(window.location.href);
                if (product) {
                    url.searchParams.set('product', String(product.id || product.sku));
                } else {
                    url.searchParams.delete('product');
                }
                window.history.replaceState({}, '', url.pathname + url.search + url.hash);
            } catch {}
        }
    };

    // Auto-open product modal when visiting direct product permalink (?product=101)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const param = new URLSearchParams(window.location.search).get('product');
        if (!param || selectedProduct) return;
        const pool = storeProducts.length > 0 ? storeProducts : products;
        const match = pool.find(
            (p) => String(p.id) === param || String(p.sku || '').toLowerCase() === param.toLowerCase()
        );
        if (match) {
            setSelectedProduct(match);
        }
    }, [storeProducts, products, selectedProduct]);

    const branding = useMemo(
        () => getStoreBranding(storefrontSettings, 'المتجر الإلكتروني'),
        [storefrontSettings]
    );

    // SEO Structured Data (JSON-LD)
    const structuredData = useMemo(() => {
        const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return {
            "@context": "https://schema.org",
            "@type": "Store",
            "name": branding.companyName,
            "image": branding.logoUrl || 'https://i.ibb.co/3yL3ZXm5/aa2f6315c6fc.jpg',
            "description": branding.slogan || `${branding.companyName} - تسوق أونلاين بمنتجات أصلية وأفضل الأسعار.`,
            "address": {
                "@type": "PostalAddress",
                "streetAddress": branding.address || 'جمهورية مصر العربية',
                "addressLocality": "القاهرة",
                "addressCountry": "EG"
            },
            ...(branding.contactPhone ? { "telephone": branding.contactPhone } : {}),
            "priceRange": "$$",
            "url": originUrl ? `${originUrl}/` : ''
        };
    }, [branding]);

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
        trackStoreEvent('AddToCart', {
            content_name: product.name,
            content_ids: [product.id],
            value: Number(product.sellingPrice || 0) * quantity,
            currency: 'EGP',
            num_items: quantity,
        });
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
        const totalVal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
        trackStoreEvent('InitiateCheckout', {
            content_ids: cartItems.map((i) => i.product.id),
            value: totalVal,
            currency: 'EGP',
            num_items: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        });
    };

    const handlePlaceOrder = async (
        customerDetails: { name: string; phone: string; address: string },
        paymentMethod: Order['paymentMethod'],
        paymentProof?: File,
        discountCode?: string,
        locationLink?: string,
        shippingInfo?: { shippingZone?: string; deliveryFee?: number }
    ): Promise<PlacedOrderResult | undefined> => {
        const orderItems: OrderItem[] = cartItems.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.sellingPrice,
        }));
        const subtotal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
        
        try {
            const result = await createOrder(
                customerDetails,
                orderItems,
                subtotal,
                paymentMethod,
                paymentProof,
                discountCode,
                locationLink,
                shippingInfo
            );
            trackStoreEvent('Purchase', {
                content_ids: orderItems.map((i) => i.productId),
                value: result?.totalAmount ?? subtotal,
                currency: 'EGP',
                num_items: orderItems.reduce((sum, i) => sum + i.quantity, 0),
            });
            setCartItems([]);
            setNotification('تم إرسال طلبك بنجاح! سيتم التواصل معك للتأكيد.');
            return result;
        } catch (error) {
            console.error("Failed to create order:", error);
            alert("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
            throw error;
        }
    };

    return (
        <div className="font-cairo bg-slate-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-x-clip">
            <Helmet>
                <title>{branding.companyName} | {branding.slogan || 'تسوق أونلاين'}</title>
                <meta name="description" content={branding.slogan || `تسوق أفضل المنتجات من ${branding.companyName} بجودة عالية وتوصيل سريع.`} />
                <meta property="og:title" content={branding.companyName} />
                <meta property="og:description" content={branding.slogan || `تسوق من ${branding.companyName}`} />
                <meta property="og:image" content={branding.logoUrl || 'https://i.ibb.co/3yL3ZXm5/aa2f6315c6fc.jpg'} />
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
                <FeaturedProductsSection products={featuredProducts} onProductClick={handleSelectProduct} addToCart={addToCart} />
                <NewArrivalsSection products={newArrivals} onProductClick={handleSelectProduct} addToCart={addToCart} />
                <StoreProducts 
                    products={products} 
                    onProductClick={handleSelectProduct} 
                    addToCart={addToCart}
                    filters={filters}
                    setFilters={setFilters}
                    loading={loading}
                />
            </main>

            {selectedProduct && (
                <StoreProductModal
                    isOpen={!!selectedProduct}
                    onClose={() => handleSelectProduct(null)}
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
            />
            <InstallPrompt />
            <FloatingCheckoutButton 
                itemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                totalAmount={cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0)}
                onCheckout={handleCheckout}
            />
            <StoreFooter setViewMode={setViewMode} />
        </div>
    );
};

export default Storefront;