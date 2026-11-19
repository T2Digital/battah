import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import Modal from '../shared/Modal';
import useStore from '../../lib/store';
import { getActiveBranches, getProductTotalStock, getStoreBranding } from '../../lib/appConfig';

interface StoreProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    onAddToCart: (product: Product, quantity: number) => void;
}

const StoreProductModal: React.FC<StoreProductModalProps> = ({ isOpen, onClose, product, onAddToCart }) => {
    const { appCustomization, storefrontSettings } = useStore(state => ({
        appCustomization: state.appData?.appCustomization,
        storefrontSettings: state.appData?.storefrontSettings,
    }));
    const activeBranches = getActiveBranches(appCustomization);
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
            product.variants.forEach((v) => {
                if (v?.name && Array.isArray(v.options) && v.options[0]) {
                    initVars[v.name] = v.options[0];
                }
            });
        }
        setSelectedVariants(initVars);
    }, [product?.id, isOpen]);

    if (!isOpen) return null;

    const totalStock = getProductTotalStock(product, activeBranches);
    const hasDiscount = product.discount && product.discount > 0;
    const originalPrice = hasDiscount ? product.sellingPrice / (1 - product.discount! / 100) : product.sellingPrice;
    const images = Array.isArray(product.images) && product.images.length > 0
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

    const handleAddToCart = () => {
        const clampedQty = Math.min(Math.max(1, quantity), Math.max(1, totalStock));
        const productToAdd = variantSummary
            ? { ...product, name: `${product.name} (${variantSummary})` }
            : product;
        onAddToCart(productToAdd, clampedQty);
        onClose();
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product.name} maxWidth="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                {/* Image Gallery */}
                <div className="flex flex-col gap-3">
                    <div className="relative h-52 sm:h-auto sm:aspect-square bg-gray-50 dark:bg-gray-800/70 rounded-2xl overflow-hidden flex items-center justify-center p-3 sm:p-4 border border-gray-100 dark:border-gray-700">
                        {hasDiscount && (
                            <div className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold z-10 shadow-sm">
                                خصم {product.discount}%
                            </div>
                        )}
                        <img 
                            src={images[activeImage] || images[0]} 
                            alt={product.name} 
                            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" 
                        />
                    </div>
                    
                    {images.length > 1 && (
                        <div className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar">
                            {images.map((img, idx) => (
                                <button 
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveImage(idx)}
                                    className={`w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl border-2 overflow-hidden bg-gray-50 dark:bg-gray-800 p-1.5 transition-all ${activeImage === idx ? 'border-primary shadow-md' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                                >
                                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Details */}
                <div className="flex flex-col min-w-0">
                    <div className="mb-4 sm:mb-6">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2">
                                {product.brand && (
                                    <span className="px-2.5 py-1 bg-primary/10 text-primary dark:text-primary-light text-xs font-bold rounded-full">
                                        {product.brand}
                                    </span>
                                )}
                                <div className="flex items-center text-yellow-400 text-xs sm:text-sm bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full">
                                    <i className="fas fa-star"></i>
                                    <span className="text-gray-700 dark:text-gray-300 mr-1 font-bold">{product.rating || '4.5'}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleShareLink}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
                            >
                                <i className={`fas ${copiedLink ? 'fa-check text-emerald-500' : 'fa-share-alt'}`}></i>
                                <span>{copiedLink ? 'تم نسخ الرابط' : 'مشاركة'}</span>
                            </button>
                        </div>
                        <h2 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white leading-snug mb-3">{product.name}</h2>
                        
                        <div className="flex items-end gap-3 mb-3 sm:mb-4">
                            <span className="text-2xl sm:text-4xl font-black text-primary dark:text-primary-light leading-none">
                                {formatCurrency(product.sellingPrice)}
                            </span>
                            {hasDiscount && (
                                <span className="text-sm sm:text-lg text-gray-400 line-through">{formatCurrency(originalPrice)}</span>
                            )}
                        </div>
                        
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                            {product.description || 'منتج أصلي مضمون وبأعلى معايير الجودة.'}
                        </p>
                    </div>

                    {/* Optional Product Variants (Size / Color / Edition) */}
                    {Array.isArray(product.variants) && product.variants.length > 0 && (
                        <div className="space-y-3 mb-4 sm:mb-5">
                            {product.variants.map((variant) => (
                                <div key={variant.name}>
                                    <span className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">{variant.name}</span>
                                    <div className="flex flex-wrap gap-2">
                                        {variant.options.map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => setSelectedVariants(prev => ({ ...prev, [variant.name]: opt }))}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                                    selectedVariants[variant.name] === opt
                                                        ? 'bg-primary text-white border-primary shadow-sm'
                                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200'
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

                    {/* Specifications Grid */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-6">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <span className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">الكود (SKU)</span>
                            <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 dark:text-white break-all">{product.sku}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <span className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">القسم</span>
                            <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">{product.mainCategory}</span>
                        </div>
                        {product.compatibility && product.compatibility.length > 0 && (
                            <div className="col-span-2 bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">متوافق مع</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {product.compatibility.map((car, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {car}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add to Cart + WhatsApp Actions */}
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                        {totalStock > 0 ? (
                            <div className="flex items-stretch gap-2.5 sm:gap-3">
                                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-xl h-12 px-1.5 w-28 sm:w-32 shrink-0">
                                    <button 
                                        type="button"
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                                        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-primary transition-all shadow-sm"
                                        aria-label="إنقاص الكمية"
                                    >
                                        <i className="fas fa-minus text-xs"></i>
                                    </button>
                                    <span className="font-bold text-base w-8 text-center">{quantity}</span>
                                    <button 
                                        type="button"
                                        onClick={() => setQuantity(q => Math.min(totalStock, q + 1))} 
                                        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-primary transition-all shadow-sm"
                                        aria-label="زيادة الكمية"
                                    >
                                        <i className="fas fa-plus text-xs"></i>
                                    </button>
                                </div>
                                <button 
                                    type="button"
                                    onClick={handleAddToCart} 
                                    className="flex-grow h-12 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 text-sm sm:text-base group"
                                >
                                    <i className="fas fa-cart-plus"></i>
                                    <span>إضافة للسلة</span>
                                </button>
                            </div>
                        ) : (
                            <div className="h-12 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-center gap-2 font-bold text-sm">
                                <i className="fas fa-times-circle text-lg"></i>
                                <span>نفذت الكمية حالياً</span>
                            </div>
                        )}

                        {whatsappHref && (
                            <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                            >
                                <i className="fab fa-whatsapp text-lg"></i>
                                <span>اطلب أو استفسر سريعاً عبر واتساب</span>
                            </a>
                        )}

                        {/* Trust Strip */}
                        <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[11px] text-gray-500 dark:text-gray-400">
                            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg py-1.5 px-1">
                                <i className="fas fa-truck text-primary block mb-0.5"></i>
                                شحن سريع
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg py-1.5 px-1">
                                <i className="fas fa-hand-holding-usd text-emerald-500 block mb-0.5"></i>
                                دفع عند الاستلام
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg py-1.5 px-1">
                                <i className="fas fa-shield-alt text-amber-500 block mb-0.5"></i>
                                ضمان الجودة
                            </div>
                        </div>
                        
                        {totalStock > 0 && totalStock < 5 && (
                            <p className="text-orange-500 text-xs sm:text-sm flex items-center gap-2 font-medium">
                                <i className="fas fa-exclamation-triangle"></i>
                                سارع بالطلب! متبقي {totalStock} قطع فقط
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default StoreProductModal;