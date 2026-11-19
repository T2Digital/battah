import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import useStore from '../../lib/store';
import { Product, CartItem, OrderItem, Order } from '../../types';

import StoreHeader from './StoreHeader';
import StoreHero from './StoreHero';
import TrustValueBar from './TrustValueBar';
import StoreProducts from './StoreProducts';
import StoreProductModal from './StoreProductModal';
import StoreCart from './StoreCart';
import CheckoutModal, { PlacedOrderResult } from './CheckoutModal';
import FeaturedProductsSection from './FeaturedProductsSection';
import NewArrivalsSection from './NewArrivalsSection';
import RecentlyViewedSection from './RecentlyViewedSection';
import PromotionBanner from './PromotionBanner';
import CustomerNotifications from './CustomerNotifications';
import CategoryHighlights from './CategoryHighlights';
import SocialProofBand from './SocialProofBand';
import MobileBottomNav from './MobileBottomNav';
import AIChatbot from '../shared/AIChatbot';
import MyOrdersModal from './MyOrdersModal';
import InstallPrompt from '../shared/InstallPrompt';
import FloatingCheckoutButton from './FloatingCheckoutButton';
import StoreFooter from './StoreFooter';
import { initStorePixels, trackStoreEvent } from '../../utils/pixels';
import { StoreFilters, DEFAULT_STORE_FILTERS, getStoreBranding } from '../../lib/appConfig';

interface StorefrontProps {
    setViewMode: (mode: 'admin' | 'store') => void;
}

const Storefront: React.FC<StorefrontProps> = ({ setViewMode }) => {
    const {
        storefrontSettings,
        createOrder,
        broadcasts,
        fetchProducts,
        searchProducts,
        fetchProductsByIds,
        pendingScan,
        setPendingScan,
        storeProducts,
        globalLoading,
    } = useStore(state => ({
        storefrontSettings: state.appData?.storefrontSettings,
        createOrder: state.createOrder,
        broadcasts: state.appData?.broadcasts || [],
        fetchProducts: state.fetchProducts,
        searchProducts: state.searchProducts,
        fetchProductsByIds: state.fetchProductsByIds,
        pendingScan: state.pendingScan,
        setPendingScan: state.setPendingScan,
        storeProducts: state.appData?.products || [],
        globalLoading: state.isLoading,
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
    const [onlyDiscounted, setOnlyDiscounted] = useState(false);
    const [showWishlistOnly, setShowWishlistOnly] = useState(false);

    const [wishlistIds, setWishlistIds] = useState<number[]>(() => {
        try {
            const raw = localStorage.getItem('storeWishlist');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === 'number') : [];
        } catch {
            return [];
        }
    });

    const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>(() => {
        try {
            const raw = localStorage.getItem('storeRecentlyViewed');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === 'number') : [];
        } catch {
            return [];
        }
    });

    // Clear quick deals/wishlist flags when switching main categories
    useEffect(() => {
        if (filters.category !== 'all') {
            setShowWishlistOnly(false);
        }
    }, [filters.category]);

    // Fetch pinned featured and new arrivals
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
    }, [storefrontSettings, fetchProductsByIds]);

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

        const timer = setTimeout(load, filters.search ? 350 : 0);
        return () => clearTimeout(timer);
    }, [filters.category, filters.search, storeProducts, fetchProducts, searchProducts]);

    // Handle Smart Scanning from Hash or pendingScan
    useEffect(() => {
        const handleScan = async (sku: string) => {
            let finalSku = sku.trim();
            if (finalSku.includes('#scan/')) {
                finalSku = decodeURIComponent(finalSku.split('#scan/')[1]);
            }
            if (!finalSku) return;
            setLoading(true);
            try {
                let exactMatch = useStore
                    .getState()
                    .appData?.products?.find(
                        p =>
                            String(p.sku || '').toLowerCase() === finalSku.toLowerCase() ||
                            String(p.id) === finalSku
                    );

                if (!exactMatch) {
                    const results = await searchProducts(finalSku);
                    exactMatch = results.find(
                        p =>
                            String(p.sku || '').toLowerCase() === finalSku.toLowerCase() ||
                            String(p.id) === finalSku
                    );
                }

                if (exactMatch) {
                    handleSelectProduct(exactMatch);
                } else {
                    setNotification(`لم يتم العثور على المنتج بالباركود: ${finalSku}`);
                }
            } catch (error) {
                console.error('Error finding scanned product:', error);
            } finally {
                setLoading(false);
            }
        };

        const scanEventObj = (e: CustomEvent<string>) => handleScan(e.detail);
        window.addEventListener('scan-store-product', scanEventObj as EventListener);

        if (!globalLoading && pendingScan) {
            handleScan(pendingScan);
            setPendingScan(null);
        }

        return () => window.removeEventListener('scan-store-product', scanEventObj as EventListener);
    }, [searchProducts, globalLoading, pendingScan, setPendingScan]);

    // Broadcast Logic
    useEffect(() => {
        if (broadcasts.length > 0) {
            const latestBroadcast = broadcasts[0];
            const seenBroadcasts = JSON.parse(localStorage.getItem('seenBroadcasts') || '[]');
            if (!seenBroadcasts.includes(latestBroadcast.id)) {
                setNotification(`📢 ${latestBroadcast.message}`);
                seenBroadcasts.push(latestBroadcast.id);
                localStorage.setItem('seenBroadcasts', JSON.stringify(seenBroadcasts));
            }
        }
    }, [broadcasts]);

    const handleSelectProduct = useCallback((product: Product | null) => {
        setSelectedProduct(product);
        if (product) {
            setRecentlyViewedIds(prev => {
                const updated = [product.id, ...prev.filter(id => id !== product.id)].slice(0, 8);
                try {
                    localStorage.setItem('storeRecentlyViewed', JSON.stringify(updated));
                } catch {}
                return updated;
            });
        }
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
    }, []);

    // Auto-open product modal when visiting direct product permalink (?product=101)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const param = new URLSearchParams(window.location.search).get('product');
        if (!param || selectedProduct) return;
        const pool = storeProducts.length > 0 ? storeProducts : products;
        const match = pool.find(
            p => String(p.id) === param || String(p.sku || '').toLowerCase() === param.toLowerCase()
        );
        if (match) {
            handleSelectProduct(match);
        }
    }, [storeProducts, products, selectedProduct, handleSelectProduct]);

    const allCatalogProducts = storeProducts.length > 0 ? storeProducts : products;

    const branding = useMemo(
        () => getStoreBranding(storefrontSettings, 'المتجر الإلكتروني'),
        [storefrontSettings]
    );

    const structuredData = useMemo(() => {
        const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return {
            '@context': 'https://schema.org',
            '@type': 'Store',
            name: branding.companyName,
            image: branding.logoUrl || 'https://i.ibb.co/3yL3ZXm5/aa2f6315c6fc.jpg',
            description:
                branding.slogan || `${branding.companyName} - تسوق أونلاين بمنتجات أصلية وأفضل الأسعار.`,
            address: {
                '@type': 'PostalAddress',
                streetAddress: branding.address || 'جمهورية مصر العربية',
                addressLocality: 'القاهرة',
                addressCountry: 'EG',
            },
            ...(branding.contactPhone ? { telephone: branding.contactPhone } : {}),
            priceRange: '$$',
            url: originUrl ? `${originUrl}/` : '',
        };
    }, [branding]);

    // Load cart from localStorage
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem('battahCart');
            if (savedCart) {
                const parsedCart: { productId: number; quantity: number; variantName?: string }[] =
                    JSON.parse(savedCart);
                const reconstructedCart: CartItem[] = parsedCart
                    .map(item => {
                        const baseProduct = allCatalogProducts.find(p => p.id === item.productId);
                        if (!baseProduct) return null;
                        const product =
                            item.variantName && item.variantName !== baseProduct.name
                                ? { ...baseProduct, name: item.variantName }
                                : baseProduct;
                        return { product, quantity: item.quantity };
                    })
                    .filter((item): item is CartItem => item !== null);
                setCartItems(reconstructedCart);
            }
        } catch (error) {
            console.error('Failed to parse cart from localStorage', error);
        }
    }, [allCatalogProducts]);

    useEffect(() => {
        const lightCart = cartItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            variantName: item.product.name,
        }));
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
            const existingItem = prevItems.find(
                item => item.product.id === product.id && item.product.name === product.name
            );
            if (existingItem) {
                return prevItems.map(item =>
                    item.product.id === product.id && item.product.name === product.name
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
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

    const updateCartQuantity = (productId: number, quantity: number, variantName?: string) => {
        const matchesItem = (item: CartItem) =>
            item.product.id === productId && (!variantName || item.product.name === variantName);
        if (quantity <= 0) {
            setCartItems(prev => prev.filter(item => !matchesItem(item)));
        } else {
            setCartItems(prev => prev.map(item => (matchesItem(item) ? { ...item, quantity } : item)));
        }
    };

    const handleCheckout = () => {
        setCartOpen(false);
        setCheckoutOpen(true);
        const totalVal = cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
        trackStoreEvent('InitiateCheckout', {
            content_ids: cartItems.map(i => i.product.id),
            value: totalVal,
            currency: 'EGP',
            num_items: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        });
    };

    const handleBuyNow = (product: Product, quantity: number) => {
        addToCart(product, quantity);
        handleSelectProduct(null);
        trackStoreEvent('InitiateCheckout', {
            content_ids: [product.id],
            value: Number(product.sellingPrice || 0) * quantity,
            currency: 'EGP',
            num_items: quantity,
        });
        setCheckoutOpen(true);
    };

    const toggleWishlist = (product: Product) => {
        setWishlistIds(prev => {
            const exists = prev.includes(product.id);
            const updated = exists ? prev.filter(id => id !== product.id) : [...prev, product.id];
            try {
                localStorage.setItem('storeWishlist', JSON.stringify(updated));
            } catch {}
            setNotification(
                exists ? `تم إزالة "${product.name}" من المفضلة` : `تم حفظ "${product.name}" في المفضلة ❤️`
            );
            return updated;
        });
    };

    const handleQuickShare = async (product: Product) => {
        const shareUrl = `${window.location.origin}/?product=${encodeURIComponent(String(product.id || product.sku))}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: product.name, url: shareUrl });
                return;
            }
        } catch {}
        try {
            await navigator.clipboard.writeText(shareUrl);
            setNotification('تم نسخ رابط المنتج للمشاركة ✨');
        } catch {}
    };

    const handleShareStore = async () => {
        const shareUrl = window.location.origin;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: branding.companyName,
                    text: branding.slogan || `تسوق من ${branding.companyName}`,
                    url: shareUrl,
                });
                return;
            }
        } catch {}
        try {
            await navigator.clipboard.writeText(shareUrl);
            setNotification('تم نسخ رابط المتجر لمشاركته مع أصدقائك ✨');
        } catch {}
    };

    const handleExploreDeals = () => {
        setOnlyDiscounted(true);
        setShowWishlistOnly(false);
        setFilters(prev => ({ ...prev, category: 'all' }));
        document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleWishlistFilterJump = () => {
        setShowWishlistOnly(prev => !prev);
        setOnlyDiscounted(false);
        document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
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
                content_ids: orderItems.map(i => i.productId),
                value: result?.totalAmount ?? subtotal,
                currency: 'EGP',
                num_items: orderItems.reduce((sum, i) => sum + i.quantity, 0),
            });
            setCartItems([]);
            setNotification('تم إرسال طلبك بنجاح! سيتم التواصل معك للتأكيد.');
            return result;
        } catch (error) {
            console.error('Failed to create order:', error);
            alert('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
            throw error;
        }
    };

    const cartSubtotal = useMemo(
        () => cartItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0),
        [cartItems]
    );
    const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

    const curatedDeals = useMemo(
        () => allCatalogProducts.filter(p => Number(p.discount || 0) > 0).slice(0, 8),
        [allCatalogProducts]
    );
    const showPinnedFeatured = featuredProducts.length > 0;
    const showFeaturedSection =
        showPinnedFeatured || curatedDeals.length >= 2 || allCatalogProducts.length >= 8;
    const featuredShelfProducts = showPinnedFeatured
        ? featuredProducts
        : curatedDeals.length >= 2
            ? curatedDeals
            : allCatalogProducts.slice(0, 6);

    const detectedNewArrivals = useMemo(
        () =>
            newArrivals.length > 0
                ? newArrivals
                : allCatalogProducts.filter(p => p.isNew).slice(0, 8),
        [newArrivals, allCatalogProducts]
    );

    const recentlyViewedProducts = useMemo(
        () =>
            recentlyViewedIds
                .map(id => allCatalogProducts.find(p => p.id === id))
                .filter((p): p is Product => Boolean(p)),
        [recentlyViewedIds, allCatalogProducts]
    );

    const whatsappHref = branding.whatsappFormatted
        ? `https://wa.me/${branding.whatsappFormatted}?text=${encodeURIComponent(
              `مرحباً ${branding.companyName}، أريد الاستفسار عن المنتجات`
          )}`
        : '';

    return (
        <div className="font-cairo bg-[#f8fafc] dark:bg-[#060913] text-slate-900 dark:text-slate-100 overflow-x-clip min-h-screen">
            <Helmet>
                <title>
                    {branding.companyName} | {branding.slogan || 'تسوق أونلاين'}
                </title>
                <meta
                    name="description"
                    content={
                        branding.slogan ||
                        `تسوق أفضل المنتجات من ${branding.companyName} بجودة عالية وتوصيل سريع.`
                    }
                />
                <meta property="og:title" content={branding.companyName} />
                <meta property="og:description" content={branding.slogan || `تسوق من ${branding.companyName}`} />
                <meta
                    property="og:image"
                    content={branding.logoUrl || 'https://i.ibb.co/3yL3ZXm5/aa2f6315c6fc.jpg'}
                />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
            </Helmet>

            <PromotionBanner cartSubtotal={cartSubtotal} onExploreDeals={handleExploreDeals} />

            <StoreHeader
                onCartClick={() => setCartOpen(true)}
                cartItemCount={cartCount}
                setViewMode={setViewMode}
                onMyOrdersClick={() => setMyOrdersOpen(true)}
                products={allCatalogProducts}
                onSelectProduct={handleSelectProduct}
                searchQuery={filters.search}
                onSearchChange={q => setFilters(prev => ({ ...prev, search: q }))}
                wishlistCount={wishlistIds.length}
                onWishlistClick={handleWishlistFilterJump}
                cartSubtotal={cartSubtotal}
            />

            <main>
                <StoreHero
                    setFilters={setFilters}
                    onProductClick={handleSelectProduct}
                    onAddToCart={addToCart}
                    onExploreDeals={handleExploreDeals}
                />

                <TrustValueBar />

                <CategoryHighlights setFilters={setFilters} />

                {showFeaturedSection && (
                    <FeaturedProductsSection
                        products={featuredShelfProducts}
                        onProductClick={handleSelectProduct}
                        addToCart={addToCart}
                        title={
                            showPinnedFeatured
                                ? 'الأكثر مبيعاً'
                                : curatedDeals.length >= 2
                                    ? 'أقوى العروض والتخفيضات'
                                    : 'مختارات المتجر'
                        }
                        badge={
                            showPinnedFeatured
                                ? '⭐ الأكثر طلباً'
                                : curatedDeals.length >= 2
                                    ? '🔥 وفر أكثر'
                                    : '⭐ مختاراتنا لك'
                        }
                        wishlistIds={wishlistIds}
                        onToggleWishlist={toggleWishlist}
                        onQuickShare={handleQuickShare}
                        onViewAll={curatedDeals.length >= 2 ? handleExploreDeals : undefined}
                    />
                )}

                {detectedNewArrivals.length > 0 && (
                    <NewArrivalsSection
                        products={detectedNewArrivals}
                        onProductClick={handleSelectProduct}
                        addToCart={addToCart}
                        wishlistIds={wishlistIds}
                        onToggleWishlist={toggleWishlist}
                        onQuickShare={handleQuickShare}
                    />
                )}

                <StoreProducts
                    products={products}
                    onProductClick={handleSelectProduct}
                    addToCart={addToCart}
                    filters={filters}
                    setFilters={setFilters}
                    loading={loading}
                    wishlistIds={wishlistIds}
                    onToggleWishlist={toggleWishlist}
                    showWishlistOnly={showWishlistOnly}
                    setShowWishlistOnly={setShowWishlistOnly}
                    onlyDiscounted={onlyDiscounted}
                    setOnlyDiscounted={setOnlyDiscounted}
                    onQuickShare={handleQuickShare}
                />

                <RecentlyViewedSection
                    products={recentlyViewedProducts}
                    onProductClick={handleSelectProduct}
                    addToCart={addToCart}
                    wishlistIds={wishlistIds}
                    onToggleWishlist={toggleWishlist}
                    onQuickShare={handleQuickShare}
                />

                <SocialProofBand
                    onShareStore={handleShareStore}
                    onMyOrdersClick={() => setMyOrdersOpen(true)}
                />
            </main>

            {selectedProduct && (
                <StoreProductModal
                    isOpen={!!selectedProduct}
                    onClose={() => handleSelectProduct(null)}
                    product={selectedProduct}
                    onAddToCart={addToCart}
                    onBuyNow={handleBuyNow}
                    allProducts={allCatalogProducts}
                    onSelectRelated={handleSelectProduct}
                    isWishlisted={wishlistIds.includes(selectedProduct.id)}
                    onToggleWishlist={toggleWishlist}
                />
            )}

            <StoreCart
                isOpen={isCartOpen}
                onClose={() => setCartOpen(false)}
                cartItems={cartItems}
                onUpdateQuantity={updateCartQuantity}
                onCheckout={handleCheckout}
                allProducts={allCatalogProducts}
                onQuickAdd={addToCart}
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
                <MyOrdersModal isOpen={isMyOrdersOpen} onClose={() => setMyOrdersOpen(false)} />
            )}

            <CustomerNotifications message={notification} />

            <AIChatbot
                setSelectedProduct={handleSelectProduct}
                addToCart={addToCart}
                openCart={() => setCartOpen(true)}
                hasCartItems={cartCount > 0}
            />

            <InstallPrompt />

            <FloatingCheckoutButton
                itemCount={cartCount}
                totalAmount={cartSubtotal}
                onCheckout={handleCheckout}
            />

            <MobileBottomNav
                cartItemCount={cartCount}
                wishlistCount={wishlistIds.length}
                onHomeClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                onCategoriesClick={() =>
                    document.getElementById('category-highlights')?.scrollIntoView({ behavior: 'smooth' })
                }
                onWishlistClick={handleWishlistFilterJump}
                onMyOrdersClick={() => setMyOrdersOpen(true)}
                onCartClick={() => setCartOpen(true)}
                isWishlistActive={showWishlistOnly}
            />

            {/* Subtle Desktop Floating WhatsApp Contact Pill */}
            {whatsappHref && (
                <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="تواصل واتساب"
                    title="تواصل معنا عبر واتساب"
                    className="hidden md:flex fixed bottom-6 right-6 z-40 px-4 h-12 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-extrabold text-sm items-center gap-2 shadow-xl hover:scale-105 transition-all"
                >
                    <i className="fab fa-whatsapp text-xl" />
                    <span>تواصل واتساب</span>
                </a>
            )}

            <StoreFooter setViewMode={setViewMode} />
        </div>
    );
};

export default Storefront;
