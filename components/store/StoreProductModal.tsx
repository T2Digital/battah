import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import Modal from '../shared/Modal';
import useStore from '../../lib/store';
import {
    getActiveBranches,
    getProductTotalStock,
    getShippingConfig,
    getStoreBranding,
    getPaymentGatewaysConfig,
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

    useEffect(() => {
        setQuantity(1);
        setActiveImage(0);
        setCopiedLink(false);
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
            ? `${window.location.origin}/?product=${encodeURIComponent(String(product.id || product.sku))}`
            : '';

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
                                    <span>شراء سريع الآن ⚡</span>
                                </button>
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
