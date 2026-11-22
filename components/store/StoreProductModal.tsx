import React, { useState, useEffect, useMemo } from 'react';
import { ExpressCodTier, Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import Modal from '../shared/Modal';
import useStore from '../../lib/store';
import { resolveTenantBrandId } from '../../lib/tenantBootstrap';
import {
    getActiveBranches,
    getProductTotalStock,
    getShippingConfig,
    getStoreBranding,
    getPaymentGatewaysConfig,
    calculateShippingFee,
} from '../../lib/appConfig';

interface StoreProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    onAddToCart: (product: Product, quantity: number) => void;
    onBuyNow?: (product: Product, quantity: number) => void;
    allProducts?: Product[];
    onSelectRelated?: (product: Product) => void;
    isWishlisted?: boolean;
    onToggleWishlist?: (product: Product) => void;
}

const StoreProductModal: React.FC<StoreProductModalProps> = ({
    isOpen,
    onClose,
    product,
    onAddToCart,
    onBuyNow,
    allProducts = [],
    onSelectRelated,
    isWishlisted = false,
    onToggleWishlist,
}) => {
    const { appCustomization, storefrontSettings } = useStore(state => ({
        appCustomization: state.appData?.appCustomization,
        storefrontSettings: state.appData?.storefrontSettings,
    }));
    const activeBranches = getActiveBranches(appCustomization);
    const shippingConfig = getShippingConfig(appCustomization);
    const paymentGateways = getPaymentGatewaysConfig(appCustomization);
    const branding = getStoreBranding(storefrontSettings, 'المتجر الإلكتروني');
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);
    const [copiedLink, setCopiedLink] = useState(false);
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
    const [selectedTierQty, setSelectedTierQty] = useState<number>(2);
    const [showExpressForm, setShowExpressForm] = useState(false);
    const [expressForm, setExpressForm] = useState({
        name: '',
        phone: '',
        governorate: shippingConfig.zones[0]?.name || 'القاهرة والجيزة',
        address: '',
    });
    const [expressSubmitting, setExpressSubmitting] = useState(false);
    const [expressResult, setExpressResult] = useState<{ refCode: string; totalCodEgp: number; waUrl: string } | null>(null);

    const expressTiers: ExpressCodTier[] = useMemo(() => {
        if (Array.isArray(product?.expressCodTiers) && product.expressCodTiers.length > 0) {
            return product.expressCodTiers;
        }
        const unit = Math.max(100, Number(product?.sellingPrice || 500));
        return [
            { qty: 1, label: 'قطعة واحدة', sellingPriceEgp: unit, freeShipping: false },
            {
                qty: 2,
                label: 'عرض القطعتين + شحن مجاني',
                badge: 'الأكثر مبيعاً',
                sellingPriceEgp: Math.round(unit * 1.78),
                freeShipping: true,
            },
            {
                qty: 3,
                label: 'باقة التوفير (3 قطع + شحن مجاني)',
                badge: 'أعلى توفير',
                sellingPriceEgp: Math.round(unit * 2.45),
                freeShipping: true,
            },
        ];
    }, [product?.id, product?.sellingPrice, product?.expressCodTiers]);

    const activeTier = useMemo(
        () => expressTiers.find(t => t.qty === selectedTierQty) || expressTiers[0],
        [expressTiers, selectedTierQty]
    );

    useEffect(() => {
        setQuantity(1);
        setActiveImage(0);
        setCopiedLink(false);
        setSelectedTierQty(expressTiers[1]?.qty || 1);
        setShowExpressForm(false);
        setExpressResult(null);
        const initVars: Record<string, string> = {};
        if (Array.isArray(product?.variants)) {
            product.variants.forEach(v => {
                if (v?.name && Array.isArray(v.options) && v.options[0]) {
                    initVars[v.name] = v.options[0];
                }
            });
        }
        setSelectedVariants(initVars);
    }, [product?.id, isOpen]);

    const relatedProducts = useMemo(() => {
        if (!Array.isArray(allProducts) || allProducts.length === 0 || !product) return [];
        const pool = allProducts.filter(
            p => p.id !== product.id && getProductTotalStock(p, activeBranches) > 0
        );
        const sameCategory = pool.filter(p => p.mainCategory === product.mainCategory);
        const others = pool.filter(p => p.mainCategory !== product.mainCategory);
        return [...sameCategory, ...others].slice(0, 4);
    }, [allProducts, product, activeBranches]);

    if (!isOpen) return null;

    const totalStock = getProductTotalStock(product, activeBranches);
    const hasDiscount = Number(product.discount || 0) > 0;
    const originalPrice = hasDiscount
        ? product.sellingPrice / (1 - Number(product.discount) / 100)
        : product.sellingPrice;
    const savingsAmount = hasDiscount ? Math.max(0, Math.round(originalPrice - product.sellingPrice)) : 0;
    const images =
        Array.isArray(product.images) && product.images.length > 0
            ? product.images
            : (product as any).imageUrl
                ? [(product as any).imageUrl]
                : ['https://via.placeholder.com/400'];

    const productUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}${window.location.pathname}?product=${encodeURIComponent(String(product.id || product.sku))}`
            : '';

    const handleExpressCodSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expressForm.name.trim() || !expressForm.phone.trim() || !expressForm.address.trim()) return;
        setExpressSubmitting(true);
        try {
            const slug = resolveTenantBrandId() || 'captaincar-eg';
            const tierShipping = activeTier?.freeShipping
                ? 0
                : calculateShippingFee(activeTier?.sellingPriceEgp || product.sellingPrice, shippingConfig, expressForm.governorate);

            const isDropStore = Boolean((window as any).__DROPSHIPPING_STORE__) || product.fulfillmentType === 'dropshipping';
            if (isDropStore) {
                const res = await fetch(`/api/dropshipping/public/${encodeURIComponent(slug)}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: product.id,
                        qty: activeTier?.qty || selectedTierQty,
                        customerName: expressForm.name.trim(),
                        customerPhone: expressForm.phone.trim(),
                        governorate: expressForm.governorate,
                        address: expressForm.address.trim(),
                        shippingFeeOverride: tierShipping,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data?.ok && data?.order) {
                    setExpressResult({
                        refCode: data.order.refCode,
                        totalCodEgp: data.order.totalCodEgp,
                        waUrl: data.whatsappConfirmUrl || '',
                    });
                    return;
                }
            }

            const unitTierPrice = Math.round((activeTier?.sellingPriceEgp || product.sellingPrice) / (activeTier?.qty || 1));
            const fallback = await useStore.getState().createOrder(
                { name: expressForm.name.trim(), phone: expressForm.phone.trim(), address: expressForm.address.trim() },
                [{ productId: product.id, productName: buildConfiguredProduct().name, quantity: activeTier?.qty || 1, unitPrice: unitTierPrice }],
                activeTier?.sellingPriceEgp || product.sellingPrice,
                'cod',
                undefined,
                undefined,
                undefined,
                { shippingZone: expressForm.governorate, deliveryFee: tierShipping }
            );
            setExpressResult({
                refCode: String(fallback?.orderId || `ORD-${Date.now().toString().slice(-5)}`),
                totalCodEgp: fallback?.totalAmount ?? ((activeTier?.sellingPriceEgp || product.sellingPrice) + tierShipping),
                waUrl: whatsappHref,
            });
        } finally {
            setExpressSubmitting(false);
        }
    };

    const variantSummary = Object.entries(selectedVariants)
        .filter(([, val]) => val)
        .map(([k, v]) => `${k}: ${v}`)
        .join('، ');

    const buildConfiguredProduct = () =>
        variantSummary ? { ...product, name: `${product.name} (${variantSummary})` } : product;

    const handleAddToCart = () => {
        const clampedQty = Math.min(Math.max(1, quantity), Math.max(1, totalStock));
        onAddToCart(buildConfiguredProduct(), clampedQty);
        onClose();
    };

    const handleQuickBuy = () => {
        const clampedQty = Math.min(Math.max(1, quantity), Math.max(1, totalStock));
        const configured = buildConfiguredProduct();
        if (onBuyNow) {
            onBuyNow(configured, clampedQty);
        } else {
            onAddToCart(configured, clampedQty);
            onClose();
        }
    };

    const handleShareLink = async () => {
        if (!productUrl) return;
        try {
            if (navigator.share) {
                await navigator.share({ title: product.name, url: productUrl });
                return;
            }
        } catch {}
        try {
            await navigator.clipboard.writeText(productUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2500);
        } catch {}
    };

    const whatsappHref = branding.whatsappFormatted
        ? `https://wa.me/${branding.whatsappFormatted}?text=${encodeURIComponent(
              `مرحباً ${branding.companyName}، أريد الاستفسار أو طلب هذا المنتج:\n*${product.name}*\nالكود: ${product.sku}\nالسعر: ${formatCurrency(product.sellingPrice)}${variantSummary ? `\nالاختيار: ${variantSummary}` : ''}\n${productUrl}`
          )}`
        : '';

    const lineSubtotal = Number(product.sellingPrice || 0) * quantity;
    const freeThreshold = shippingConfig.freeShippingThreshold || 0;
    const remainingForFree = freeThreshold > 0 ? Math.max(0, freeThreshold - lineSubtotal) : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product.name} maxWidth="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                {/* Image Gallery */}
                <div className="flex flex-col gap-3">
                    <div className="relative h-56 sm:h-auto sm:aspect-square bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-800/70 dark:to-slate-900 rounded-2xl overflow-hidden flex items-center justify-center p-4 border border-slate-200/75 dark:border-white/10">
                        {hasDiscount && (
                            <div className="absolute top-3 right-3 bg-rose-500 text-white px-2.5 py-1 rounded-full text-xs sm:text-sm font-black z-10 shadow-sm tabular-nums">
                                خصم {product.discount}%
                            </div>
                        )}
                        {images.length > 1 && (
                            <div className="absolute bottom-3 left-3 bg-slate-900/75 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full z-10 tabular-nums">
                                {activeImage + 1} / {images.length}
                            </div>
                        )}
                        <img
                            src={images[activeImage] || images[0]}
                            alt={product.name}
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {images.length > 1 && (
                        <div className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveImage(idx)}
                                    className={`w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl border-2 overflow-hidden bg-slate-50 dark:bg-slate-800 p-1.5 transition-all ${
                                        activeImage === idx
                                            ? 'border-primary shadow-md'
                                            : 'border-slate-200/60 dark:border-white/10 hover:border-slate-300'
                                    }`}
                                >
                                    <img
                                        src={img}
                                        alt={`${product.name} ${idx + 1}`}
                                        className="w-full h-full object-contain"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Details */}
                <div className="flex flex-col min-w-0">
                    <div className="mb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2">
                                {product.brand && (
                                    <span className="px-2.5 py-1 brand-soft-bg text-primary text-xs font-extrabold rounded-full">
                                        {product.brand}
                                    </span>
                                )}
                                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-300 text-xs sm:text-sm bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 rounded-full font-bold">
                                    <i className="fas fa-star text-amber-400 text-xs" />
                                    <span>{product.rating || '4.8'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {onToggleWishlist && (
                                    <button
                                        type="button"
                                        onClick={() => onToggleWishlist(product)}
                                        aria-label={isWishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                                            isWishlisted
                                                ? 'bg-rose-500 text-white border-rose-500'
                                                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:text-rose-500'
                                        }`}
                                    >
                                        <i className={`${isWishlisted ? 'fas' : 'far'} fa-heart text-xs`} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleShareLink}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                    <i className={`fas ${copiedLink ? 'fa-check text-emerald-500' : 'fa-share-alt'}`} />
                                    <span>{copiedLink ? 'تم نسخ الرابط' : 'مشاركة'}</span>
                                </button>
                            </div>
                        </div>

                        <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-snug mb-3">
                            {product.name}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2.5 mb-3">
                            <span className="text-2xl sm:text-3xl font-black text-primary tabular-nums leading-none">
                                {formatCurrency(product.sellingPrice)}
                            </span>
                            {hasDiscount && (
                                <span className="text-sm sm:text-base text-slate-400 line-through tabular-nums">
                                    {formatCurrency(originalPrice)}
                                </span>
                            )}
                            {savingsAmount > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-black tabular-nums">
                                    وفر {formatCurrency(savingsAmount)}
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {product.description || 'منتج أصلي مضمون وبأعلى معايير الجودة.'}
                        </p>
                    </div>

                    {/* Dynamic Free-Shipping Eligibility Hint */}
                    {totalStock > 0 && freeThreshold > 0 && (
                        <div
                            className={`mb-4 px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                                remainingForFree === 0
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-300'
                            }`}
                        >
                            <i className={`fas ${remainingForFree === 0 ? 'fa-check-circle' : 'fa-truck'}`} />
                            <span>
                                {remainingForFree === 0
                                    ? 'هذا الطلب مؤهل للشحن المجاني!'
                                    : `أضف بقيمة ${formatCurrency(remainingForFree)} أخرى للحصول على شحن مجاني`}
                            </span>
                        </div>
                    )}

                    {/* Optional Product Variants (Size / Color / Edition) */}
                    {Array.isArray(product.variants) && product.variants.length > 0 && (
                        <div className="space-y-3 mb-4">
                            {product.variants.map(variant => (
                                <div key={variant.name}>
                                    <span className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                                        {variant.name}:{' '}
                                        <span className="text-primary">{selectedVariants[variant.name]}</span>
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {variant.options.map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedVariants(prev => ({ ...prev, [variant.name]: opt }))
                                                }
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                                    selectedVariants[variant.name] === opt
                                                        ? 'bg-primary text-white border-primary shadow-sm'
                                                        : 'bg-white dark:bg-white/[0.05] border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:border-primary/40'
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Live Low-Stock Scarcity Bar */}
                    {totalStock > 0 && totalStock <= 8 && (
                        <div className="mb-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-2.5">
                            <div className="flex items-center justify-between text-xs font-extrabold text-amber-800 dark:text-amber-300 mb-1.5">
                                <span className="flex items-center gap-1.5">
                                    <i className="fas fa-fire text-amber-500" />
                                    سارع بالطلب! كمية محدودة
                                </span>
                                <span>متبقي {totalStock} فقط</span>
                            </div>
                            <div className="w-full h-1.5 bg-amber-200/70 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(15, (totalStock / 10) * 100))}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Specifications Grid */}
                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                        <div className="bg-slate-50 dark:bg-white/[0.04] p-2.5 rounded-xl border border-slate-200/70 dark:border-white/10">
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                                الكود (SKU)
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white break-all">
                                {product.sku}
                            </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/[0.04] p-2.5 rounded-xl border border-slate-200/70 dark:border-white/10">
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">القسم</span>
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {product.mainCategory}
                            </span>
                        </div>
                        {product.compatibility && product.compatibility.length > 0 && (
                            <div className="col-span-2 bg-slate-50 dark:bg-white/[0.04] p-2.5 rounded-xl border border-slate-200/70 dark:border-white/10">
                                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                                    التوافق / الموديلات
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {product.compatibility.map((car, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-0.5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200"
                                        >
                                            {car}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add to Cart + Quick Buy + WhatsApp Actions */}
                    <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/[0.08] space-y-2.5">
                        {totalStock > 0 ? (
                            <>
                                <div className="flex items-stretch gap-2.5">
                                    <div className="flex items-center justify-between bg-slate-100 dark:bg-white/10 rounded-xl h-12 px-1.5 w-28 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                            className="w-8 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-primary transition-all"
                                            aria-label="إنقاص الكمية"
                                        >
                                            <i className="fas fa-minus text-xs" />
                                        </button>
                                        <span className="font-black text-base w-7 text-center tabular-nums">
                                            {quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(q => Math.min(totalStock, q + 1))}
                                            className="w-8 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-primary transition-all"
                                            aria-label="زيادة الكمية"
                                        >
                                            <i className="fas fa-plus text-xs" />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddToCart}
                                        className="flex-grow h-12 bg-primary hover:bg-primary-dark text-white font-black rounded-xl transition-all brand-glow flex items-center justify-center gap-2 text-xs sm:text-sm tabular-nums"
                                    >
                                        <i className="fas fa-cart-plus" />
                                        <span>إضافة للسلة · {formatCurrency(lineSubtotal)}</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleQuickBuy}
                                    className="w-full h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                                >
                                    <span>شراء سريع عبر السلة ⚡</span>
                                </button>

                                {/* Express COD Tiers Quick Buy-Box (1 / 2 / 3) */}
                                <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-sky-50/70 dark:from-emerald-950/30 dark:to-sky-950/20 border border-emerald-200 dark:border-emerald-700/40 space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                            <i className="fas fa-bolt text-amber-500" />
                                            عروض التوفير والشراء الفوري (Express COD)
                                        </span>
                                        {product.warehouseRegion && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                                                {product.warehouseRegion}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-1.5">
                                        {expressTiers.map((tier) => {
                                            const active = activeTier?.qty === tier.qty;
                                            return (
                                                <button
                                                    key={tier.qty}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedTierQty(tier.qty);
                                                        setQuantity(tier.qty);
                                                        setShowExpressForm(true);
                                                    }}
                                                    className={`w-full p-2.5 rounded-xl border text-right flex items-center justify-between gap-2 transition ${
                                                        active
                                                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                                                            : 'bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-emerald-400'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${active ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {tier.qty}×
                                                        </span>
                                                        <div>
                                                            <div className="text-xs font-black">{tier.label}</div>
                                                            <div className={`text-[10px] ${active ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                {tier.freeShipping ? '✅ شحن مجاني لباب البيت' : '+ مصاريف الشحن حسب المحافظة'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-left shrink-0">
                                                        {tier.badge && (
                                                            <span className={`block text-[9px] font-black px-1.5 py-0.5 rounded-full mb-0.5 ${active ? 'bg-amber-300 text-slate-950' : 'bg-amber-100 text-amber-800'}`}>
                                                                {tier.badge}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-black tabular-nums">
                                                            {formatCurrency(tier.sellingPriceEgp)}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {expressResult ? (
                                        <div className="p-3 rounded-xl bg-emerald-600 text-white text-center space-y-2">
                                            <div className="text-sm font-black">🎉 تم تسجيل طلبك بنجاح! ({expressResult.refCode})</div>
                                            <div className="text-xs">الإجمالي عند الاستلام: {formatCurrency(expressResult.totalCodEgp)}</div>
                                            {expressResult.waUrl && (
                                                <a
                                                    href={expressResult.waUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-emerald-700 text-xs font-black"
                                                >
                                                    <i className="fab fa-whatsapp" />
                                                    <span>تأكيد سريع على واتساب</span>
                                                </a>
                                            )}
                                        </div>
                                    ) : showExpressForm && (
                                        <form onSubmit={handleExpressCodSubmit} className="space-y-2 pt-2 border-t border-emerald-200 dark:border-white/10">
                                            <input
                                                type="text"
                                                required
                                                placeholder="الاسم بالكامل *"
                                                value={expressForm.name}
                                                onChange={(e) => setExpressForm({ ...expressForm, name: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 dark:border-white/15"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="tel"
                                                    required
                                                    dir="ltr"
                                                    placeholder="010..."
                                                    value={expressForm.phone}
                                                    onChange={(e) => setExpressForm({ ...expressForm, phone: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 dark:border-white/15 text-left"
                                                />
                                                <select
                                                    value={expressForm.governorate}
                                                    onChange={(e) => setExpressForm({ ...expressForm, governorate: e.target.value })}
                                                    className="w-full px-2 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 dark:border-white/15"
                                                >
                                                    {shippingConfig.zones.map(z => (
                                                        <option key={z.name} value={z.name}>{z.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                placeholder="العنوان بالتفصيل *"
                                                value={expressForm.address}
                                                onChange={(e) => setExpressForm({ ...expressForm, address: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 dark:border-white/15"
                                            />
                                            <button
                                                type="submit"
                                                disabled={expressSubmitting}
                                                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow disabled:opacity-50"
                                            >
                                                {expressSubmitting ? 'جاري تسجيل الطلب...' : `✅ تأكيد الطلب الفوري (${activeTier?.qty || 1}× — ${formatCurrency(activeTier?.sellingPriceEgp || product.sellingPrice)})`}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-center justify-center gap-2 font-bold text-sm">
                                <i className="fas fa-times-circle text-lg" />
                                <span>نفذت الكمية حالياً</span>
                            </div>
                        )}

                        {whatsappHref && (
                            <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full h-11 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                            >
                                <i className="fab fa-whatsapp text-lg" />
                                <span>اطلب أو استفسر سريعاً عبر واتساب</span>
                            </a>
                        )}

                        {/* Trust Strip */}
                        <div className="grid grid-cols-3 gap-2 pt-1.5 text-center text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                            <div className="bg-slate-50 dark:bg-white/[0.04] rounded-lg py-1.5 px-1">
                                <i className="fas fa-truck text-primary block mb-0.5" />
                                شحن سريع
                            </div>
                            <div className="bg-slate-50 dark:bg-white/[0.04] rounded-lg py-1.5 px-1">
                                <i className={`fas ${paymentGateways.enableCod !== false ? 'fa-hand-holding-usd' : 'fa-credit-card'} text-emerald-500 block mb-0.5`} />
                                {paymentGateways.enableCod !== false ? 'دفع عند الاستلام' : 'دفع إلكتروني آمن'}
                            </div>
                            <div className="bg-slate-50 dark:bg-white/[0.04] rounded-lg py-1.5 px-1">
                                <i className="fas fa-shield-alt text-amber-500 block mb-0.5" />
                                ضمان الجودة
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Products Mini-Strip */}
            {relatedProducts.length > 0 && onSelectRelated && (
                <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/[0.08]">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <i className="fas fa-sparkles text-primary text-xs" />
                        منتجات مشابهة قد تعجبك
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {relatedProducts.map(rel => (
                            <button
                                key={rel.id}
                                type="button"
                                onClick={() => onSelectRelated(rel)}
                                className="text-right bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/70 dark:border-white/[0.08] rounded-xl p-2.5 transition-all flex items-center gap-2.5"
                            >
                                <img
                                    src={rel.images?.[0] || (rel as any).imageUrl || 'https://via.placeholder.com/80'}
                                    alt={rel.name}
                                    className="w-11 h-11 rounded-lg object-contain bg-white dark:bg-slate-800 p-1 shrink-0"
                                />
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                                        {rel.name}
                                    </p>
                                    <span className="text-xs font-black text-primary tabular-nums block mt-0.5">
                                        {formatCurrency(rel.sellingPrice)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default StoreProductModal;
