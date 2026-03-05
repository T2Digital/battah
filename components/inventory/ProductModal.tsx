
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
// Fix: Corrected import paths
import { Product, MainCategory } from '../../types';
import Modal from '../shared/Modal';
import useStore from '../../lib/store';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Omit<Product, 'id'> & { id?: number }) => void;
    existingProduct: Product | null;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, existingProduct }) => {
    const { uploadImage, storefrontSettings } = useStore(state => ({
        uploadImage: state.uploadImage,
        storefrontSettings: state.appData?.storefrontSettings
    }));
    const [formData, setFormData] = useState<Omit<Product, 'id'>>({
        name: '', sku: '', mainCategory: 'قطع غيار', category: '', brand: '', countryOfOrigin: '',
        purchasePrice: 0, sellingPrice: 0, wholesalePrice: 0, retailPrice: 0,
        stock: { main: 0, branch1: 0, branch2: 0, branch3: 0 },
        reorderPoint: 5, description: '', images: [], compatibility: [],
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [securityPassword, setSecurityPassword] = useState('');
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);
    const [securityError, setSecurityError] = useState('');

    useEffect(() => {
        if (existingProduct) {
            setFormData({
                ...existingProduct,
                countryOfOrigin: existingProduct.countryOfOrigin || '',
                wholesalePrice: existingProduct.wholesalePrice || 0,
                retailPrice: existingProduct.retailPrice || existingProduct.sellingPrice || 0,
                reorderPoint: existingProduct.reorderPoint || 5,
                description: existingProduct.description || '',
                images: existingProduct.images || [],
                compatibility: existingProduct.compatibility || [],
            });
            setImagePreview(existingProduct.images[0] || null);
        } else {
            setFormData({
                name: '', sku: '', mainCategory: 'قطع غيار', category: '', brand: '', countryOfOrigin: '',
                purchasePrice: 0, sellingPrice: 0, wholesalePrice: 0, retailPrice: 0,
                stock: { main: 0, branch1: 0, branch2: 0, branch3: 0 },
                reorderPoint: 5, description: '', images: [], compatibility: [],
            });
            setImagePreview(null);
        }
        setImageFile(null); // Reset file input on open
        setShowSecurityCheck(false);
        setSecurityPassword('');
        setSecurityError('');
    }, [existingProduct, isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumericField = ['purchasePrice', 'sellingPrice', 'wholesalePrice', 'retailPrice', 'reorderPoint'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumericField ? Number(value) : value }));
    };

    const calculatePrice = (percentage: number, field: 'sellingPrice' | 'wholesalePrice' = 'sellingPrice') => {
        const purchase = Number(formData.purchasePrice) || 0;
        const newPrice = purchase + (purchase * (percentage / 100));
        setFormData(prev => ({ 
            ...prev, 
            [field]: parseFloat(newPrice.toFixed(2)),
            ...(field === 'sellingPrice' ? { retailPrice: parseFloat(newPrice.toFixed(2)) } : {})
        }));
    };

    const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, stock: { ...prev.stock, [name]: Number(value) } }));
    };

    const generateDescription = useCallback(async () => {
        if (!formData.name || !formData.brand) {
            alert("يرجى إدخال اسم المنتج والماركة أولاً."); return;
        }
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `Generate a compelling and SEO-friendly product description in Arabic for the following auto part. The tone should be professional and trustworthy, targeting car owners and mechanics in Egypt. Highlight quality and reliability. Do not use markdown.

                Product Name: ${formData.name}, Brand: ${formData.brand}, Category: ${formData.category}`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setFormData(prev => ({ ...prev, description: response.text }));
        } catch (error) {
            console.error("Gemini description generation error:", error);
            alert("حدث خطأ أثناء إنشاء الوصف.");
        } finally {
            setIsGenerating(false);
        }
    }, [formData.name, formData.brand, formData.category]);

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (storefrontSettings?.adminPassword) {
            setShowSecurityCheck(true);
        } else {
            handleSubmit();
        }
    };

    const handleSecuritySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (securityPassword === storefrontSettings?.adminPassword) {
            handleSubmit();
        } else {
            setSecurityError('كلمة المرور غير صحيحة');
        }
    };

    const handleSubmit = async () => {
        setIsUploading(true);
        let finalData = { ...formData };
        if (imageFile) {
            try {
                const imageUrl = await uploadImage(imageFile, `products/${Date.now()}_${imageFile.name}`);
                finalData.images = [imageUrl, ...finalData.images.filter(img => img !== imageUrl)];
            } catch (error) {
                console.error("Image upload failed", error);
                alert("فشل رفع الصورة. يرجى المحاولة مرة أخرى.");
                setIsUploading(false);
                return;
            }
        }
        onSave(existingProduct ? { ...finalData, id: existingProduct.id } : finalData);
        setIsUploading(false);
    };

    if (showSecurityCheck) {
        return (
            <Modal isOpen={isOpen} onClose={() => setShowSecurityCheck(false)} title="تأكيد الأمان" onSave={handleSecuritySubmit} saveLabel="تأكيد">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">يرجى إدخال كلمة مرور العمليات الحساسة للمتابعة.</p>
                    <input
                        type="password"
                        value={securityPassword}
                        onChange={(e) => { setSecurityPassword(e.target.value); setSecurityError(''); }}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        placeholder="كلمة المرور"
                        autoFocus
                    />
                    {securityError && <p className="text-red-500 text-sm">{securityError}</p>}
                    <button type="button" onClick={() => setShowSecurityCheck(false)} className="text-sm text-gray-500 underline">رجوع</button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'} onSave={handlePreSubmit}>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Image Section */}
                <div className="md:col-span-1 space-y-3">
                    <label className="block text-sm font-medium">صورة المنتج</label>
                    <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        {imagePreview ? 
                            <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-lg" /> :
                            <i className="fas fa-image text-4xl text-gray-400"></i>
                        }
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>

                {/* Form Section */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label>اسم المنتج *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 w-full input-base" />
                    </div>
                    <div>
                        <label>الكود (SKU) *</label>
                        <input type="text" name="sku" value={formData.sku} onChange={handleChange} required className="mt-1 w-full input-base" />
                    </div>
                    <div>
                        <label>الماركة *</label>
                        <input type="text" name="brand" value={formData.brand} onChange={handleChange} required className="mt-1 w-full input-base" />
                    </div>
                    <div>
                        <label>بلد المنشأ</label>
                        <input type="text" name="countryOfOrigin" value={formData.countryOfOrigin} onChange={handleChange} className="mt-1 w-full input-base" />
                    </div>
                    <div>
                        <label>سعر الشراء *</label>
                        <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} required min="0" step="0.01" className="mt-1 w-full input-base" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block mb-1">سعر البيع (قطاعي) *</label>
                        <div className="flex gap-2 items-center">
                            <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} required min="0" step="0.01" className="flex-grow input-base" />
                            <div className="flex gap-1">
                                <button type="button" onClick={() => calculatePrice(25)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">25%</button>
                                <button type="button" onClick={() => calculatePrice(30)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">30%</button>
                                <button type="button" onClick={() => calculatePrice(35)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">35%</button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label>سعر البيع (جملة)</label>
                        <div className="flex gap-2 items-center">
                            <input type="number" name="wholesalePrice" value={formData.wholesalePrice} onChange={handleChange} min="0" step="0.01" className="flex-grow input-base" />
                            <div className="flex gap-1">
                                <button type="button" onClick={() => calculatePrice(10, 'wholesalePrice')} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">10%</button>
                                <button type="button" onClick={() => calculatePrice(15, 'wholesalePrice')} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">15%</button>
                                <button type="button" onClick={() => calculatePrice(20, 'wholesalePrice')} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">20%</button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label>حد الطلب</label>
                        <input type="number" name="reorderPoint" value={formData.reorderPoint} onChange={handleChange} required min="0" className="mt-1 w-full input-base" />
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">الكميات بالمخازن</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div><label>الرئيسي</label><input type="number" name="main" value={formData.stock.main} onChange={handleStockChange} min="0" className="mt-1 w-full input-base"/></div>
                    <div><label>فرع 1</label><input type="number" name="branch1" value={formData.stock.branch1} onChange={handleStockChange} min="0" className="mt-1 w-full input-base"/></div>
                    <div><label>فرع 2</label><input type="number" name="branch2" value={formData.stock.branch2} onChange={handleStockChange} min="0" className="mt-1 w-full input-base"/></div>
                    <div><label>فرع 3</label><input type="number" name="branch3" value={formData.stock.branch3} onChange={handleStockChange} min="0" className="mt-1 w-full input-base"/></div>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex justify-between items-center">
                    <label>الوصف</label>
                    <button type="button" onClick={generateDescription} disabled={isGenerating} className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 disabled:opacity-50 flex items-center gap-2">
                        {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                        {isGenerating ? 'جاري الإنشاء...' : 'إنشاء بالذكاء الاصطناعي'}
                    </button>
                </div>
                <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} className="mt-1 block w-full input-base"></textarea>
            </div>
            {isUploading && <p className="text-center mt-2 text-blue-500">جاري رفع الصورة...</p>}
        </Modal>
    );
};

export default ProductModal;
