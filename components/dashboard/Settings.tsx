import React, { useState, useEffect } from 'react';
import useStore from '../../lib/store';
import SectionHeader from '../shared/SectionHeader';
import { requestNotificationPermission } from '../../lib/firebase';
import ConfirmationModal from '../shared/ConfirmationModal';
import {
    BranchConfig,
    CashierConfig,
    HeroSlideConfig,
    PaymentGatewaysConfig,
    ShippingCarrierProvider,
    ShippingConfig,
    StorefrontFiltersConfig,
} from '../../types';
import {
    getActiveBranches,
    getActiveCashiers,
    getMainCategories,
    getSubCategoriesMap,
    getStorefrontFiltersConfig,
    getStoreBranding,
    getShippingConfig,
    getHeroSlides,
    SHIPPING_CARRIERS,
    getPaymentGatewaysConfig,
} from '../../lib/appConfig';

type SettingsTabId =
    | 'identity'
    | 'payments'
    | 'shipping'
    | 'storefront'
    | 'catalog'
    | 'operations'
    | 'marketing';

const SETTINGS_TABS: Array<{
    id: SettingsTabId;
    label: string;
    subtitle: string;
    icon: string;
}> = [
    { id: 'identity', label: 'الهوية والبيانات القانونية', subtitle: 'الاسم، السجل التجاري والضريبي', icon: 'fa-store' },
    { id: 'payments', label: 'الدفع وبوابات التحصيل', subtitle: 'عند الاستلام، فودافون كاش وPaymob', icon: 'fa-wallet' },
    { id: 'shipping', label: 'الشحن وشركات التوصيل', subtitle: 'المحافظات، الشحن المجاني وبوسطة', icon: 'fa-shipping-fast' },
    { id: 'storefront', label: 'مظهر المتجر والعروض', subtitle: 'شريط العروض وسلايدر البانر', icon: 'fa-images' },
    { id: 'catalog', label: 'الأقسام والفلاتر', subtitle: 'التصنيفات وفلاتر البحث', icon: 'fa-layer-group' },
    { id: 'operations', label: 'الفروع والكاشير والتشغيل', subtitle: 'الفروع، الكاشير وقيود الدخول', icon: 'fa-code-branch' },
    { id: 'marketing', label: 'التسويق والأمان', subtitle: 'البكسلات، الإشعارات وضبط المصنع', icon: 'fa-bullseye' },
];

const Settings: React.FC = () => {
    const { appData, updateSettings, updateStorefrontSettings, updateAppCustomization, addToast, resetDatabase } = useStore();
    const settings = appData?.settings || {
        enableIPRestriction: false,
        enableTimeRestriction: false,
        workStartTime: '09:00',
        workEndTime: '23:00',
    };

    const initialBranding = getStoreBranding(appData?.storefrontSettings, '');
    const [activeTab, setActiveTab] = useState<SettingsTabId>('identity');

    const [localSettings, setLocalSettings] = useState(settings);
    const [adminPassword, setAdminPassword] = useState(appData?.storefrontSettings?.adminPassword || '');
    const [companyName, setCompanyName] = useState(initialBranding.companyName);
    const [slogan, setSlogan] = useState(initialBranding.slogan);
    const [logoUrl, setLogoUrl] = useState(initialBranding.logoUrl);
    const [contactPhone, setContactPhone] = useState(initialBranding.contactPhone || '01013373634');
    const [whatsappPhone, setWhatsappPhone] = useState(initialBranding.whatsappPhone || '01013373634');
    const [contactEmail, setContactEmail] = useState(initialBranding.contactEmail);
    const [address, setAddress] = useState(initialBranding.address || 'القاهرة - التوفيقية');
    const [commercialRegister, setCommercialRegister] = useState(initialBranding.commercialRegister);
    const [taxCardNumber, setTaxCardNumber] = useState(initialBranding.taxCardNumber);
    const [facebookUrl, setFacebookUrl] = useState(initialBranding.facebookUrl);
    const [instagramUrl, setInstagramUrl] = useState(initialBranding.instagramUrl);
    const [tiktokUrl, setTiktokUrl] = useState(initialBranding.tiktokUrl);
    const [primaryColor, setPrimaryColor] = useState(initialBranding.primaryColor);

    const [metaPixelId, setMetaPixelId] = useState(appData?.storefrontSettings?.metaPixelId || '');
    const [tiktokPixelId, setTiktokPixelId] = useState(appData?.storefrontSettings?.tiktokPixelId || '');
    const [googleTagId, setGoogleTagId] = useState(appData?.storefrontSettings?.googleTagId || '');
    const [snapPixelId, setSnapPixelId] = useState(appData?.storefrontSettings?.snapPixelId || '');

    const [isLoadingIP, setIsLoadingIP] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [newTickerMessage, setNewTickerMessage] = useState('');
    const [tickerMessages, setTickerMessages] = useState<string[]>([]);
    const [notificationStatus, setNotificationStatus] = useState<string>('default');
    const [broadcastMessageText, setBroadcastMessageText] = useState('');

    // Dynamic ERP & Storefront Customization state
    const [activeBranches, setActiveBranches] = useState<BranchConfig[]>(() => getActiveBranches(appData?.appCustomization));
    const [newBranchLabel, setNewBranchLabel] = useState('');

    const [cashiers, setCashiers] = useState<CashierConfig[]>(() => getActiveCashiers(appData?.appCustomization));
    const [newCashierLabel, setNewCashierLabel] = useState('');

    const [mainCategories, setMainCategories] = useState<string[]>(() => getMainCategories(appData?.appCustomization));
    const [subCategoriesMap, setSubCategoriesMap] = useState<Record<string, string[]>>(() => getSubCategoriesMap(appData?.appCustomization));
    const [newMainCat, setNewMainCat] = useState('');
    const [newSubCatDraft, setNewSubCatDraft] = useState<Record<string, string>>({});

    const [storefrontFilters, setStorefrontFilters] = useState<Required<StorefrontFiltersConfig>>(() =>
        getStorefrontFiltersConfig(appData?.appCustomization)
    );
    const [newBrandOption, setNewBrandOption] = useState('');

    const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(() =>
        getShippingConfig(appData?.appCustomization)
    );
    const [newZoneName, setNewZoneName] = useState('');
    const [newZoneFee, setNewZoneFee] = useState<number>(50);

    const [heroSlides, setHeroSlides] = useState<HeroSlideConfig[]>(() =>
        getHeroSlides(appData?.appCustomization, initialBranding.companyName, initialBranding.slogan, getMainCategories(appData?.appCustomization))
    );

    const [paymentGateways, setPaymentGateways] = useState<Required<PaymentGatewaysConfig>>(() =>
        getPaymentGatewaysConfig(appData?.appCustomization)
    );

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationStatus(Notification.permission);
        }
    }, []);

    const handleEnableNotifications = async () => {
        const token = await requestNotificationPermission();
        if (token) {
            setNotificationStatus('granted');
            await useStore.getState().saveDeviceToken(token);
            addToast('تم تفعيل الإشعارات بنجاح', 'success');
        } else {
            setNotificationStatus(Notification.permission);
            if (Notification.permission === 'denied') {
                addToast('تم رفض صلاحية الإشعارات من قبل المتصفح', 'error');
            } else {
                addToast('فشل تفعيل الإشعارات', 'error');
            }
        }
    };

    useEffect(() => {
        if (appData?.settings) {
            setLocalSettings(appData.settings);
            setTickerMessages(appData.settings.tickerMessages || []);
        }
        if (appData?.storefrontSettings) {
            const b = getStoreBranding(appData.storefrontSettings, '');
            setAdminPassword(appData.storefrontSettings.adminPassword || '');
            if (b.companyName) setCompanyName(b.companyName);
            if (b.slogan) setSlogan(b.slogan);
            if (b.logoUrl) setLogoUrl(b.logoUrl);
            if (b.contactPhone) setContactPhone(b.contactPhone);
            if (b.whatsappPhone) setWhatsappPhone(b.whatsappPhone);
            if (b.contactEmail) setContactEmail(b.contactEmail);
            if (b.address) setAddress(b.address);
            setCommercialRegister(b.commercialRegister);
            setTaxCardNumber(b.taxCardNumber);
            setFacebookUrl(b.facebookUrl);
            setInstagramUrl(b.instagramUrl);
            setTiktokUrl(b.tiktokUrl);
            setPrimaryColor(b.primaryColor);
            setMetaPixelId(appData.storefrontSettings.metaPixelId || '');
            setTiktokPixelId(appData.storefrontSettings.tiktokPixelId || '');
            setGoogleTagId(appData.storefrontSettings.googleTagId || '');
            setSnapPixelId(appData.storefrontSettings.snapPixelId || '');
        }
        if (appData?.appCustomization) {
            const b = getStoreBranding(appData?.storefrontSettings, '');
            const cats = getMainCategories(appData.appCustomization);
            setActiveBranches(getActiveBranches(appData.appCustomization));
            setCashiers(getActiveCashiers(appData.appCustomization));
            setMainCategories(cats);
            setSubCategoriesMap(getSubCategoriesMap(appData.appCustomization));
            setStorefrontFilters(getStorefrontFiltersConfig(appData.appCustomization));
            setShippingConfig(getShippingConfig(appData.appCustomization));
            setHeroSlides(getHeroSlides(appData.appCustomization, b.companyName, b.slogan, cats));
            setPaymentGateways(getPaymentGatewaysConfig(appData.appCustomization));
        }
    }, [appData?.settings, appData?.storefrontSettings, appData?.appCustomization]);

    const handleAddBranch = () => {
        const label = newBranchLabel.trim();
        if (!label) return;
        const usedKeys = new Set(activeBranches.map(b => b.key));
        let nextKey = !usedKeys.has('main') ? 'main' : '';
        if (!nextKey) {
            let idx = 1;
            while (usedKeys.has(`branch${idx}`)) idx++;
            nextKey = `branch${idx}`;
        }
        setActiveBranches(prev => [...prev, { key: nextKey, label }]);
        setNewBranchLabel('');
    };

    const handleAddCashier = () => {
        const label = newCashierLabel.trim();
        if (!label) return;
        const usedValues = new Set(cashiers.map(c => c.value));
        let nextVal = !usedValues.has('main') ? 'main' : '';
        if (!nextVal) {
            let idx = 2;
            while (usedValues.has(`cashier_${idx}`)) idx++;
            nextVal = `cashier_${idx}`;
        }
        setCashiers(prev => [...prev, { value: nextVal, label }]);
        setNewCashierLabel('');
    };

    const handleAddMainCategory = () => {
        const name = newMainCat.trim();
        if (!name || mainCategories.includes(name)) return;
        setMainCategories(prev => [...prev, name]);
        setSubCategoriesMap(prev => ({ ...prev, [name]: prev[name] || [] }));
        setNewMainCat('');
    };

    const handleRenameMainCategory = (index: number, nextNameRaw: string) => {
        const oldName = mainCategories[index];
        const nextName = nextNameRaw;
        setMainCategories(prev => prev.map((c, i) => (i === index ? nextName : c)));
        if (oldName !== nextName && subCategoriesMap[oldName]) {
            setSubCategoriesMap(prev => {
                const copy = { ...prev };
                const list = copy[oldName] || [];
                delete copy[oldName];
                copy[nextName] = list;
                return copy;
            });
        }
    };

    const handleAddSubCategory = (mainCat: string) => {
        const subName = (newSubCatDraft[mainCat] || '').trim();
        if (!subName) return;
        setSubCategoriesMap(prev => {
            const existing = prev[mainCat] || [];
            if (existing.includes(subName)) return prev;
            return { ...prev, [mainCat]: [...existing, subName] };
        });
        setNewSubCatDraft(prev => ({ ...prev, [mainCat]: '' }));
    };

    const handleAddBrandOption = () => {
        const opt = newBrandOption.trim();
        if (!opt || storefrontFilters.brandFilterOptions.includes(opt)) return;
        setStorefrontFilters(prev => ({
            ...prev,
            brandFilterOptions: [...prev.brandFilterOptions, opt],
        }));
        setNewBrandOption('');
    };

    const handleAddTickerMessage = () => {
        if (newTickerMessage.trim()) {
            const updatedMessages = [...tickerMessages, newTickerMessage.trim()];
            setTickerMessages(updatedMessages);
            setLocalSettings(prev => ({ ...prev, tickerMessages: updatedMessages }));
            setNewTickerMessage('');
        }
    };

    const handleRemoveTickerMessage = (index: number) => {
        const updatedMessages = tickerMessages.filter((_, i) => i !== index);
        setTickerMessages(updatedMessages);
        setLocalSettings(prev => ({ ...prev, tickerMessages: updatedMessages }));
    };

    const fetchCurrentIP = async () => {
        setIsLoadingIP(true);
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            setLocalSettings(prev => ({ ...prev, allowedIP: data.ip }));
        } catch (error) {
            console.error('Failed to fetch IP:', error);
            addToast('فشل في جلب عنوان IP الحالي', 'error');
        } finally {
            setIsLoadingIP(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const cleanBranches = activeBranches
                .map(b => ({ key: b.key.trim(), label: b.label.trim() }))
                .filter(b => b.key && b.label);
            const cleanCashiers = cashiers
                .map(c => ({ value: c.value.trim(), label: c.label.trim() }))
                .filter(c => c.value && c.label);
            const cleanMainCategories = Array.from(
                new Set(mainCategories.map(c => c.trim()).filter(Boolean))
            );
            const cleanSubCategories: Record<string, string[]> = {};
            for (const cat of cleanMainCategories) {
                cleanSubCategories[cat] = Array.from(
                    new Set((subCategoriesMap[cat] || []).map(s => s.trim()).filter(Boolean))
                );
            }

            const cleanZones = shippingConfig.zones
                .map(z => ({ name: z.name.trim(), fee: Math.max(0, Number(z.fee) || 0) }))
                .filter(z => z.name);
            const cleanSlides = heroSlides
                .map((s, idx) => ({
                    id: s.id || idx + 1,
                    badge: String(s.badge || '').trim(),
                    title: String(s.title || '').trim(),
                    subtitle: String(s.subtitle || '').trim(),
                    description: String(s.description || '').trim(),
                    image: String(s.image || '').trim(),
                    category: String(s.category || 'all').trim() || 'all',
                }))
                .filter(s => s.title || s.image);

            await updateSettings(localSettings);
            await updateStorefrontSettings({
                ...(appData?.storefrontSettings || {}),
                featuredProductIds: appData?.storefrontSettings?.featuredProductIds || [],
                newArrivalProductIds: appData?.storefrontSettings?.newArrivalProductIds || [],
                adminPassword,
                companyName: companyName.trim(),
                slogan: slogan.trim(),
                logoUrl: logoUrl.trim(),
                contactPhone: contactPhone.trim(),
                whatsappPhone: whatsappPhone.trim(),
                contactEmail: contactEmail.trim(),
                address: address.trim(),
                commercialRegister: commercialRegister.trim(),
                taxCardNumber: taxCardNumber.trim(),
                facebookUrl: facebookUrl.trim(),
                instagramUrl: instagramUrl.trim(),
                tiktokUrl: tiktokUrl.trim(),
                primaryColor,
                metaPixelId: metaPixelId.trim(),
                tiktokPixelId: tiktokPixelId.trim(),
                googleTagId: googleTagId.trim(),
                snapPixelId: snapPixelId.trim(),
            });
            await updateAppCustomization({
                activeBranches: cleanBranches.length > 0 ? cleanBranches : getActiveBranches(null),
                cashiers: cleanCashiers.length > 0 ? cleanCashiers : getActiveCashiers(null),
                mainCategories: cleanMainCategories.length > 0 ? cleanMainCategories : getMainCategories(null),
                subCategories: cleanSubCategories,
                storefrontFilters: {
                    ...storefrontFilters,
                    brandFilterLabel: storefrontFilters.brandFilterLabel.trim() || 'ماركة السيارة',
                    brandFilterOptions: storefrontFilters.brandFilterOptions.map(o => o.trim()).filter(Boolean),
                },
                shipping: {
                    defaultFee: Math.max(0, Number(shippingConfig.defaultFee) || 0),
                    freeShippingThreshold: Math.max(0, Number(shippingConfig.freeShippingThreshold) || 0),
                    zones: cleanZones,
                    carrierIntegration: {
                        provider: (shippingConfig.carrierIntegration?.provider || 'manual') as ShippingCarrierProvider,
                        enabled: Boolean(shippingConfig.carrierIntegration?.enabled),
                        apiKey: shippingConfig.carrierIntegration?.apiKey?.trim() || '',
                        accountNumber: shippingConfig.carrierIntegration?.accountNumber?.trim() || '',
                        senderAddress: shippingConfig.carrierIntegration?.senderAddress?.trim() || '',
                    },
                },
                heroSlides: cleanSlides,
                paymentGateways: {
                    enableCod: paymentGateways.enableCod !== false,
                    enableManualElectronic: paymentGateways.enableManualElectronic !== false,
                    paymob: {
                        enabled: Boolean(paymentGateways.paymob?.enabled),
                        configured: Boolean(
                            paymentGateways.paymob?.apiKey?.trim() &&
                                paymentGateways.paymob?.integrationId?.trim() &&
                                paymentGateways.paymob?.iframeId?.trim()
                        ),
                        apiKey: paymentGateways.paymob?.apiKey?.trim() || '',
                        integrationId: paymentGateways.paymob?.integrationId?.trim() || '',
                        iframeId: paymentGateways.paymob?.iframeId?.trim() || '',
                        hmacSecret: paymentGateways.paymob?.hmacSecret?.trim() || '',
                    },
                },
            });
            addToast('تم حفظ الإعدادات بنجاح', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            addToast('فشل في حفظ الإعدادات', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetDatabase = async () => {
        setIsResetting(true);
        try {
            await resetDatabase();
            setIsResetModalOpen(false);
        } catch (error) {
            console.error('Failed to reset database:', error);
        } finally {
            setIsResetting(false);
        }
    };

    const inputCls =
        'w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700/80 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-primary transition';
    const cardCls =
        'bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 sm:p-6 shadow-sm space-y-5';

    const activeTabMeta = SETTINGS_TABS.find(t => t.id === activeTab) || SETTINGS_TABS[0];

    return (
        <div className="animate-fade-in space-y-5">
            <SectionHeader icon="fa-cogs" title="مركز الإعدادات المتكامل" />

            {/* Sticky Top Control Bar */}
            <div className="sticky top-20 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <i className={`fas ${activeTabMeta.icon} text-lg`} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate">
                            {activeTabMeta.label}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {activeTabMeta.subtitle}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-sm rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
                    <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
                </button>
            </div>

            {/* Mobile Horizontal Scrollable Tab Strip */}
            <div className="lg:hidden flex overflow-x-auto gap-2 pb-1 hide-scrollbar">
                {SETTINGS_TABS.map(tab => {
                    const isCurrent = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition flex items-center gap-2 ${
                                isCurrent
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <i className={`fas ${tab.icon}`} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Desktop Vertical Tab Rail */}
                <aside className="hidden lg:flex flex-col gap-1.5 w-72 shrink-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-3 shadow-sm sticky top-40">
                    {SETTINGS_TABS.map(tab => {
                        const isCurrent = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-right p-3 rounded-xl transition flex items-center gap-3 ${
                                    isCurrent
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                                }`}
                            >
                                <span
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                        isCurrent
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-primary'
                                    }`}
                                >
                                    <i className={`fas ${tab.icon}`} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-extrabold leading-tight truncate">{tab.label}</div>
                                    <div
                                        className={`text-[11px] truncate mt-0.5 ${
                                            isCurrent ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                    >
                                        {tab.subtitle}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </aside>

                {/* Tab Content Panel */}
                <div className="flex-1 min-w-0 w-full space-y-6">
                    {/* TAB 1: IDENTITY & LEGAL CREDENTIALS */}
                    {activeTab === 'identity' && (
                        <>
                            <div className={cardCls}>
                                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-store text-primary" />
                                    هوية المتجر وبيانات التواصل
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                            اسم المتجر (الهيدر، الفوتر والفاتورة)
                                        </label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={e => setCompanyName(e.target.value)}
                                            className={inputCls}
                                            placeholder="اسم المتجر"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                            الوصف المختصر / الشعار (Slogan)
                                        </label>
                                        <input
                                            type="text"
                                            value={slogan}
                                            onChange={e => setSlogan(e.target.value)}
                                            className={inputCls}
                                            placeholder="منتجات أصلية بأفضل سعر وأسرع توصيل"
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-end gap-3">
                                        {logoUrl && (
                                            <img
                                                src={logoUrl}
                                                alt="Logo preview"
                                                className="w-12 h-12 rounded-xl object-contain bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 p-1 shrink-0"
                                            />
                                        )}
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                رابط الشعار (Logo URL)
                                            </label>
                                            <input
                                                type="url"
                                                dir="ltr"
                                                value={logoUrl}
                                                onChange={e => setLogoUrl(e.target.value)}
                                                className={inputCls}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                            رقم الموبايل (الفوتر والفاتورة)
                                        </label>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={contactPhone}
                                            onChange={e => setContactPhone(e.target.value)}
                                            className={inputCls}
                                            placeholder="01013373634"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                            رقم واتساب استقبال الطلبات
                                        </label>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={whatsappPhone}
                                            onChange={e => setWhatsappPhone(e.target.value)}
                                            className={inputCls}
                                            placeholder="01013373634"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                            البريد الإلكتروني للتواصل
                                        </label>
                                        <input
                                            type="email"
                                            dir="ltr"
                                            value={contactEmail}
                                            onChange={e => setContactEmail(e.target.value)}
                                            className={inputCls}
                                            placeholder="info@store.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                            العنوان (الفوتر والفاتورة)
                                        </label>
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                            className={inputCls}
                                            placeholder="العنوان التفصيلي"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        لون الثيم الرئيسي للأزرار والشعارات
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {['#0284c7', '#2563eb', '#059669', '#dc2626', '#7c3aed', '#d97706'].map(preset => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setPrimaryColor(preset)}
                                                style={{ backgroundColor: preset }}
                                                className={`w-8 h-8 rounded-full border-2 transition ${
                                                    primaryColor === preset
                                                        ? 'border-gray-900 dark:border-white scale-110 shadow-md'
                                                        : 'border-transparent'
                                                }`}
                                                title={preset}
                                            />
                                        ))}
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={e => setPrimaryColor(e.target.value)}
                                            className="w-10 h-8 rounded cursor-pointer border border-gray-300"
                                        />
                                        <span className="text-xs font-mono text-gray-500" dir="ltr">
                                            {primaryColor}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Dedicated Legal & Tax Card */}
                            <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl border-2 border-primary/20 p-5 sm:p-6 space-y-4">
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <i className="fas fa-file-contract text-primary" />
                                        السجل التجاري والبطاقة الضريبية
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        تظهر هذه البيانات الرسمية تلقائياً في ترويسة الفواتير، بوالص الشحن (A6)، وفوتر المتجر الإلكتروني لتعزيز الثقة والمصداقية القانونية.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-extrabold text-gray-800 dark:text-gray-200 mb-1.5">
                                            رقم السجل التجاري
                                        </label>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={commercialRegister}
                                            onChange={e => setCommercialRegister(e.target.value)}
                                            className={`${inputCls} font-mono font-bold`}
                                            placeholder="مثال: 147555"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-extrabold text-gray-800 dark:text-gray-200 mb-1.5">
                                            رقم البطاقة الضريبية
                                        </label>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={taxCardNumber}
                                            onChange={e => setTaxCardNumber(e.target.value)}
                                            className={`${inputCls} font-mono font-bold`}
                                            placeholder="مثال: 333-703-873"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Social Links Card */}
                            <div className={cardCls}>
                                <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-share-alt text-primary" />
                                    روابط التواصل الاجتماعي
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
                                            فيسبوك
                                        </label>
                                        <input
                                            type="url"
                                            dir="ltr"
                                            value={facebookUrl}
                                            onChange={e => setFacebookUrl(e.target.value)}
                                            className={inputCls}
                                            placeholder="https://facebook.com/..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
                                            إنستجرام
                                        </label>
                                        <input
                                            type="url"
                                            dir="ltr"
                                            value={instagramUrl}
                                            onChange={e => setInstagramUrl(e.target.value)}
                                            className={inputCls}
                                            placeholder="https://instagram.com/..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
                                            تيك توك
                                        </label>
                                        <input
                                            type="url"
                                            dir="ltr"
                                            value={tiktokUrl}
                                            onChange={e => setTiktokUrl(e.target.value)}
                                            className={inputCls}
                                            placeholder="https://tiktok.com/@..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* TAB 2: PAYMENTS & GATEWAYS */}
                    {activeTab === 'payments' && (
                        <>
                            <div className={cardCls}>
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <i className="fas fa-wallet text-primary" />
                                        طرق الدفع المتاحة للعملاء
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        أي وسيلة دفع يتم إلغاء تفعيلها ستختفي فوراً من شاشة إتمام الطلب (Checkout) ومن شارات الفوتر وأزرار الثقة.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label
                                        className={`flex items-start justify-between gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${
                                            paymentGateways.enableCod !== false
                                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                : 'border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40'
                                        }`}
                                    >
                                        <div>
                                            <div className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                                <i className="fas fa-hand-holding-usd text-emerald-500" />
                                                الدفع عند الاستلام (COD)
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                تحصيل المبلغ نقداً مع مندوب الشحن عند تسليم الطلب.
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={paymentGateways.enableCod !== false}
                                            onChange={e =>
                                                setPaymentGateways(prev => ({ ...prev, enableCod: e.target.checked }))
                                            }
                                            className="w-5 h-5 text-primary rounded mt-0.5 shrink-0"
                                        />
                                    </label>

                                    <label
                                        className={`flex items-start justify-between gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${
                                            paymentGateways.enableManualElectronic !== false
                                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                : 'border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40'
                                        }`}
                                    >
                                        <div>
                                            <div className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                                <i className="fas fa-mobile-alt text-primary" />
                                                التحويل الإلكتروني (فودافون كاش / إنستاباي)
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                عرض رقم التحويل ورفع إيصال الدفع في شاشة إتمام الطلب.
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={paymentGateways.enableManualElectronic !== false}
                                            onChange={e =>
                                                setPaymentGateways(prev => ({
                                                    ...prev,
                                                    enableManualElectronic: e.target.checked,
                                                }))
                                            }
                                            className="w-5 h-5 text-primary rounded mt-0.5 shrink-0"
                                        />
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        رقم المحفظة / إنستاباي لاستقبال التحويلات
                                    </label>
                                    <input
                                        type="text"
                                        dir="ltr"
                                        value={localSettings.electronicPaymentNumber || ''}
                                        onChange={e =>
                                            setLocalSettings({
                                                ...localSettings,
                                                electronicPaymentNumber: e.target.value,
                                            })
                                        }
                                        className={`${inputCls} max-w-md font-mono font-bold`}
                                        placeholder="مثال: 01080444447"
                                    />
                                </div>
                            </div>

                            {/* Paymob Optional Gateway */}
                            <div className={cardCls}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                            <i className="fas fa-credit-card text-indigo-500" />
                                            تجهيز الدفع بالبطاقة البنكية — Paymob (اختياري)
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                            يظهر خيار الفيزا والماستركارد للعملاء تلقائياً فور التفعيل وإكمال المفاتيح.
                                        </p>
                                    </div>
                                    <label className="inline-flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-xs font-extrabold text-indigo-700 dark:text-indigo-200">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(paymentGateways.paymob?.enabled)}
                                            onChange={e =>
                                                setPaymentGateways(prev => ({
                                                    ...prev,
                                                    paymob: { ...(prev.paymob || { enabled: false }), enabled: e.target.checked },
                                                }))
                                            }
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span>تفعيل Paymob</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        type="password"
                                        dir="ltr"
                                        value={paymentGateways.paymob?.apiKey || ''}
                                        onChange={e =>
                                            setPaymentGateways(prev => ({
                                                ...prev,
                                                paymob: { ...(prev.paymob || { enabled: false }), apiKey: e.target.value },
                                            }))
                                        }
                                        placeholder="Paymob API Key"
                                        className={`${inputCls} font-mono text-xs`}
                                    />
                                    <input
                                        type="text"
                                        dir="ltr"
                                        value={paymentGateways.paymob?.integrationId || ''}
                                        onChange={e =>
                                            setPaymentGateways(prev => ({
                                                ...prev,
                                                paymob: {
                                                    ...(prev.paymob || { enabled: false }),
                                                    integrationId: e.target.value,
                                                },
                                            }))
                                        }
                                        placeholder="Integration ID (Card)"
                                        className={`${inputCls} font-mono text-xs`}
                                    />
                                    <input
                                        type="text"
                                        dir="ltr"
                                        value={paymentGateways.paymob?.iframeId || ''}
                                        onChange={e =>
                                            setPaymentGateways(prev => ({
                                                ...prev,
                                                paymob: { ...(prev.paymob || { enabled: false }), iframeId: e.target.value },
                                            }))
                                        }
                                        placeholder="iFrame ID"
                                        className={`${inputCls} font-mono text-xs`}
                                    />
                                    <input
                                        type="password"
                                        dir="ltr"
                                        value={paymentGateways.paymob?.hmacSecret || ''}
                                        onChange={e =>
                                            setPaymentGateways(prev => ({
                                                ...prev,
                                                paymob: { ...(prev.paymob || { enabled: false }), hmacSecret: e.target.value },
                                            }))
                                        }
                                        placeholder="HMAC Secret (لأمان Webhook)"
                                        className={`${inputCls} font-mono text-xs`}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* TAB 3: SHIPPING & CARRIERS */}
                    {activeTab === 'shipping' && (
                        <>
                            <div className={cardCls}>
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <i className="fas fa-shipping-fast text-primary" />
                                        مصاريف الشحن والمحافظات والشحن المجاني
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        يظهر حساب الشحن تلقائياً للعميل في السلة وإتمام الطلب، وفي الفاتورة الضريبية وبوليصة الشحن.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                            رسوم الشحن الافتراضية (ج.م)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={shippingConfig.defaultFee}
                                            onChange={e =>
                                                setShippingConfig(prev => ({
                                                    ...prev,
                                                    defaultFee: Math.max(0, Number(e.target.value) || 0),
                                                }))
                                            }
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                            الحد الأدنى للشحن المجاني (0 = معطل)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={shippingConfig.freeShippingThreshold}
                                            onChange={e =>
                                                setShippingConfig(prev => ({
                                                    ...prev,
                                                    freeShippingThreshold: Math.max(0, Number(e.target.value) || 0),
                                                }))
                                            }
                                            className={inputCls}
                                            placeholder="مثال: 3000"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {shippingConfig.zones.map((zone, idx) => (
                                        <div
                                            key={idx}
                                            className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border dark:border-gray-600"
                                        >
                                            <input
                                                type="text"
                                                value={zone.name}
                                                onChange={e =>
                                                    setShippingConfig(prev => ({
                                                        ...prev,
                                                        zones: prev.zones.map((z, i) =>
                                                            i === idx ? { ...z, name: e.target.value } : z
                                                        ),
                                                    }))
                                                }
                                                className="flex-grow px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm font-semibold"
                                                placeholder="اسم المنطقة / المحافظة"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                value={zone.fee}
                                                onChange={e =>
                                                    setShippingConfig(prev => ({
                                                        ...prev,
                                                        zones: prev.zones.map((z, i) =>
                                                            i === idx
                                                                ? { ...z, fee: Math.max(0, Number(e.target.value) || 0) }
                                                                : z
                                                        ),
                                                    }))
                                                }
                                                className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm font-bold text-center"
                                            />
                                            <span className="text-xs text-gray-500">ج.م</span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShippingConfig(prev => ({
                                                        ...prev,
                                                        zones: prev.zones.filter((_, i) => i !== idx),
                                                    }))
                                                }
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                aria-label="حذف المنطقة"
                                            >
                                                <i className="fas fa-trash-alt" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                    <input
                                        type="text"
                                        value={newZoneName}
                                        onChange={e => setNewZoneName(e.target.value)}
                                        placeholder="منطقة / محافظة جديدة..."
                                        className={inputCls}
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        value={newZoneFee}
                                        onChange={e => setNewZoneFee(Math.max(0, Number(e.target.value) || 0))}
                                        className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 text-sm"
                                        placeholder="السعر"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const name = newZoneName.trim();
                                            if (!name) return;
                                            setShippingConfig(prev => ({
                                                ...prev,
                                                zones: [...prev.zones, { name, fee: newZoneFee }],
                                            }));
                                            setNewZoneName('');
                                        }}
                                        className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark text-sm font-bold whitespace-nowrap"
                                    >
                                        + إضافة منطقة
                                    </button>
                                </div>
                            </div>

                            <div className={cardCls}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                            <i className="fas fa-truck-loading text-primary" />
                                            الربط مع شركات الشحن (Bosta / Aramex / Mylerz / R2S / Turbo)
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            اختر شركة الشحن الافتراضية لتفعيل روابط التتبع وطباعة البوالص، أو أضف API Key لـ Bosta لإنشاء الشحنات آلياً.
                                        </p>
                                    </div>
                                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-extrabold">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(shippingConfig.carrierIntegration?.enabled)}
                                            onChange={e =>
                                                setShippingConfig(prev => ({
                                                    ...prev,
                                                    carrierIntegration: {
                                                        ...(prev.carrierIntegration || { provider: 'manual', enabled: false }),
                                                        enabled: e.target.checked,
                                                    },
                                                }))
                                            }
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span>تفعيل الربط</span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                            شركة الشحن الافتراضية
                                        </label>
                                        <select
                                            value={shippingConfig.carrierIntegration?.provider || 'manual'}
                                            onChange={e =>
                                                setShippingConfig(prev => ({
                                                    ...prev,
                                                    carrierIntegration: {
                                                        ...(prev.carrierIntegration || { enabled: false }),
                                                        provider: e.target.value as ShippingCarrierProvider,
                                                    },
                                                }))
                                            }
                                            className={inputCls}
                                        >
                                            {SHIPPING_CARRIERS.map(c => (
                                                <option key={c.provider} value={c.provider}>
                                                    {c.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                            رقم الحساب / التاجر (اختياري)
                                        </label>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={shippingConfig.carrierIntegration?.accountNumber || ''}
                                            onChange={e =>
                                                setShippingConfig(prev => ({
                                                    ...prev,
                                                    carrierIntegration: {
                                                        ...(prev.carrierIntegration || { provider: 'manual', enabled: false }),
                                                        accountNumber: e.target.value,
                                                    },
                                                }))
                                            }
                                            placeholder="Account / Business ID"
                                            className={`${inputCls} font-mono`}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                            مفتاح الربط (API Key — يدعم Bosta v2 مباشرة عند التفعيل)
                                        </label>
                                        <input
                                            type="password"
                                            dir="ltr"
                                            value={shippingConfig.carrierIntegration?.apiKey || ''}
                                            onChange={e =>
                                                setShippingConfig(prev => ({
                                                    ...prev,
                                                    carrierIntegration: {
                                                        ...(prev.carrierIntegration || { provider: 'manual', enabled: false }),
                                                        apiKey: e.target.value,
                                                    },
                                                }))
                                            }
                                            placeholder="اتركه فارغاً للتتبع وطباعة البوالص والتصدير الإكسل بدون API"
                                            className={`${inputCls} font-mono`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* TAB 4: STOREFRONT APPEARANCE & HERO */}
                    {activeTab === 'storefront' && (
                        <>
                            <div className={cardCls}>
                                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-scroll text-primary" />
                                    شريط الإعلانات والعروض (أعلى المتجر)
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTickerMessage}
                                        onChange={e => setNewTickerMessage(e.target.value)}
                                        placeholder="اكتب رسالة ترويجية جديدة..."
                                        className={inputCls}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTickerMessage())}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTickerMessage}
                                        className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-dark transition shrink-0 font-bold"
                                    >
                                        <i className="fas fa-plus" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {tickerMessages.map((msg, index) => (
                                        <div
                                            key={index}
                                            className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/60 p-3 rounded-xl border dark:border-gray-600"
                                        >
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {msg}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTickerMessage(index)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                            >
                                                <i className="fas fa-trash" />
                                            </button>
                                        </div>
                                    ))}
                                    {tickerMessages.length === 0 && (
                                        <p className="text-center text-gray-500 text-sm italic py-2">لا توجد رسائل حالياً</p>
                                    )}
                                </div>
                            </div>

                            <div className={cardCls}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                            <i className="fas fa-images text-primary" />
                                            سلايدر البانر الرئيسي (Hero Slides)
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            عدّل صور وعناوين واجهة المتجر لتناسب نشاطك وحملاتك الموسمية.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setHeroSlides(prev => [
                                                ...prev,
                                                {
                                                    id: Date.now(),
                                                    badge: 'عرض مميز',
                                                    title: 'شريحة عرض جديدة',
                                                    subtitle: 'أفضل جودة وسعر',
                                                    description: 'تصفح أحدث المنتجات المتاحة الآن.',
                                                    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&auto=format&fit=crop',
                                                    category: mainCategories[0] || 'all',
                                                },
                                            ])
                                        }
                                        className="px-3.5 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark text-xs font-bold"
                                    >
                                        + شريحة جديدة
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {heroSlides.map((slide, idx) => (
                                        <div
                                            key={slide.id ?? idx}
                                            className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-primary">شريحة #{idx + 1}</span>
                                                <button
                                                    type="button"
                                                    disabled={heroSlides.length <= 1}
                                                    onClick={() =>
                                                        setHeroSlides(prev => prev.filter((_, i) => i !== idx))
                                                    }
                                                    className="text-red-500 hover:text-red-700 text-xs font-bold disabled:opacity-40"
                                                >
                                                    حذف الشريحة
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    value={slide.title}
                                                    onChange={e =>
                                                        setHeroSlides(prev =>
                                                            prev.map((s, i) =>
                                                                i === idx ? { ...s, title: e.target.value } : s
                                                            )
                                                        )
                                                    }
                                                    placeholder="العنوان الرئيسي"
                                                    className={`${inputCls} font-bold`}
                                                />
                                                <input
                                                    type="text"
                                                    value={slide.subtitle}
                                                    onChange={e =>
                                                        setHeroSlides(prev =>
                                                            prev.map((s, i) =>
                                                                i === idx ? { ...s, subtitle: e.target.value } : s
                                                            )
                                                        )
                                                    }
                                                    placeholder="العنوان الفرعي"
                                                    className={inputCls}
                                                />
                                                <input
                                                    type="text"
                                                    value={slide.badge || ''}
                                                    onChange={e =>
                                                        setHeroSlides(prev =>
                                                            prev.map((s, i) =>
                                                                i === idx ? { ...s, badge: e.target.value } : s
                                                            )
                                                        )
                                                    }
                                                    placeholder="الشارة العلوية (Badge)"
                                                    className={inputCls}
                                                />
                                                <select
                                                    value={slide.category || 'all'}
                                                    onChange={e =>
                                                        setHeroSlides(prev =>
                                                            prev.map((s, i) =>
                                                                i === idx ? { ...s, category: e.target.value } : s
                                                            )
                                                        )
                                                    }
                                                    className={inputCls}
                                                >
                                                    <option value="all">كل الأقسام</option>
                                                    {mainCategories.map(c => (
                                                        <option key={c} value={c}>
                                                            {c}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="sm:col-span-2 flex items-center gap-3">
                                                    {slide.image && (
                                                        <img
                                                            src={slide.image}
                                                            alt={slide.title}
                                                            className="w-16 h-10 rounded-lg object-cover border border-gray-300 dark:border-gray-600 shrink-0"
                                                        />
                                                    )}
                                                    <input
                                                        type="url"
                                                        dir="ltr"
                                                        value={slide.image}
                                                        onChange={e =>
                                                            setHeroSlides(prev =>
                                                                prev.map((s, i) =>
                                                                    i === idx ? { ...s, image: e.target.value } : s
                                                                )
                                                            )
                                                        }
                                                        placeholder="رابط صورة الخلفية (https://...)"
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={slide.description}
                                                    onChange={e =>
                                                        setHeroSlides(prev =>
                                                            prev.map((s, i) =>
                                                                i === idx ? { ...s, description: e.target.value } : s
                                                            )
                                                        )
                                                    }
                                                    placeholder="وصف مختصر"
                                                    className={`sm:col-span-2 ${inputCls}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* TAB 5: CATEGORIES & FILTERS */}
                    {activeTab === 'catalog' && (
                        <>
                            <div className={cardCls}>
                                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-layer-group text-primary" />
                                    إدارة الأقسام الرئيسية والفرعية
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newMainCat}
                                        onChange={e => setNewMainCat(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddMainCategory())}
                                        placeholder="إضافة قسم رئيسي جديد..."
                                        className={inputCls}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddMainCategory}
                                        className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition text-sm font-bold whitespace-nowrap"
                                    >
                                        + إضافة قسم
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {mainCategories.map((cat, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 space-y-3"
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={cat}
                                                    onChange={e => handleRenameMainCategory(idx, e.target.value)}
                                                    className="flex-grow px-3 py-1.5 font-bold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={mainCategories.length <= 1}
                                                    onClick={() => {
                                                        setMainCategories(prev => prev.filter((_, i) => i !== idx));
                                                        setSubCategoriesMap(prev => {
                                                            const copy = { ...prev };
                                                            delete copy[cat];
                                                            return copy;
                                                        });
                                                    }}
                                                    className="px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30"
                                                    title="حذف القسم"
                                                >
                                                    <i className="fas fa-trash-alt" />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(subCategoriesMap[cat] || []).map(sub => (
                                                    <span
                                                        key={sub}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-xs font-medium"
                                                    >
                                                        <span>{sub}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSubCategoriesMap(prev => ({
                                                                    ...prev,
                                                                    [cat]: (prev[cat] || []).filter(s => s !== sub),
                                                                }))
                                                            }
                                                            className="text-red-500 hover:text-red-700 font-bold"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newSubCatDraft[cat] || ''}
                                                    onChange={e =>
                                                        setNewSubCatDraft(prev => ({ ...prev, [cat]: e.target.value }))
                                                    }
                                                    onKeyDown={e =>
                                                        e.key === 'Enter' &&
                                                        (e.preventDefault(), handleAddSubCategory(cat))
                                                    }
                                                    placeholder={`إضافة قسم فرعي تحت "${cat}"...`}
                                                    className="flex-grow px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-xs"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddSubCategory(cat)}
                                                    className="px-3 py-1.5 bg-gray-800 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs font-bold whitespace-nowrap"
                                                >
                                                    + فرعي
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={cardCls}>
                                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-sliders-h text-primary" />
                                    إدارة فلاتر المتجر الإلكتروني
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(
                                        [
                                            { key: 'showSearch', label: 'شريط البحث' },
                                            { key: 'showCategoryFilter', label: 'فلتر الأقسام الرئيسية' },
                                            { key: 'showSubCategoryFilter', label: 'فلتر الأقسام الفرعية' },
                                            { key: 'showBrandFilter', label: 'فلتر الماركة / السمة' },
                                            { key: 'showPriceFilter', label: 'فلتر السعر (من / إلى)' },
                                            { key: 'showInStockOnlyFilter', label: 'فلتر المتوفر بالمخزون فقط' },
                                        ] as const
                                    ).map(toggle => (
                                        <label
                                            key={toggle.key}
                                            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 cursor-pointer"
                                        >
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {toggle.label}
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(storefrontFilters[toggle.key])}
                                                onChange={e =>
                                                    setStorefrontFilters(prev => ({
                                                        ...prev,
                                                        [toggle.key]: e.target.checked,
                                                    }))
                                                }
                                                className="w-4 h-4 text-primary rounded focus:ring-primary"
                                            />
                                        </label>
                                    ))}
                                </div>

                                {storefrontFilters.showBrandFilter && (
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                اسم فلتر الماركة / السمة
                                            </label>
                                            <input
                                                type="text"
                                                value={storefrontFilters.brandFilterLabel}
                                                onChange={e =>
                                                    setStorefrontFilters(prev => ({
                                                        ...prev,
                                                        brandFilterLabel: e.target.value,
                                                    }))
                                                }
                                                placeholder="مثال: ماركة السيارة"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                خيارات القائمة المنسدلة
                                            </label>
                                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto mb-2.5 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                                {storefrontFilters.brandFilterOptions.map(opt => (
                                                    <span
                                                        key={opt}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs"
                                                    >
                                                        <span>{opt}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setStorefrontFilters(prev => ({
                                                                    ...prev,
                                                                    brandFilterOptions: prev.brandFilterOptions.filter(
                                                                        o => o !== opt
                                                                    ),
                                                                }))
                                                            }
                                                            className="text-red-500 hover:text-red-700 font-bold"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newBrandOption}
                                                    onChange={e => setNewBrandOption(e.target.value)}
                                                    onKeyDown={e =>
                                                        e.key === 'Enter' &&
                                                        (e.preventDefault(), handleAddBrandOption())
                                                    }
                                                    placeholder="أضف خيار جديد للفلتر..."
                                                    className={inputCls}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddBrandOption}
                                                    className="px-4 py-2 bg-gray-800 dark:bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-xs font-bold whitespace-nowrap"
                                                >
                                                    + إضافة خيار
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* TAB 6: BRANCHES, CASHIERS & RESTRICTIONS */}
                    {activeTab === 'operations' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={cardCls}>
                                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <i className="fas fa-code-branch text-primary" />
                                        الفروع والمخازن
                                    </h3>
                                    <div className="space-y-2">
                                        {activeBranches.map((branch, idx) => (
                                            <div
                                                key={branch.key}
                                                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl border border-gray-200 dark:border-gray-600"
                                            >
                                                <span
                                                    className="text-xs font-mono px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 shrink-0"
                                                    dir="ltr"
                                                >
                                                    {branch.key}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={branch.label}
                                                    onChange={e =>
                                                        setActiveBranches(prev =>
                                                            prev.map((b, i) =>
                                                                i === idx ? { ...b, label: e.target.value } : b
                                                            )
                                                        )
                                                    }
                                                    className="flex-grow px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={activeBranches.length <= 1}
                                                    onClick={() =>
                                                        setActiveBranches(prev => prev.filter((_, i) => i !== idx))
                                                    }
                                                    className="p-2 text-red-500 disabled:opacity-30"
                                                >
                                                    <i className="fas fa-trash-alt" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newBranchLabel}
                                            onChange={e => setNewBranchLabel(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddBranch())}
                                            placeholder="اسم الفرع الجديد..."
                                            className={inputCls}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddBranch}
                                            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark text-xs font-bold whitespace-nowrap"
                                        >
                                            + إضافة
                                        </button>
                                    </div>
                                </div>

                                <div className={cardCls}>
                                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <i className="fas fa-cash-register text-primary" />
                                        نقاط البيع (الكاشيرات)
                                    </h3>
                                    <div className="space-y-2">
                                        {cashiers.map((cashier, idx) => (
                                            <div
                                                key={cashier.value}
                                                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl border border-gray-200 dark:border-gray-600"
                                            >
                                                <span
                                                    className="text-xs font-mono px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 shrink-0"
                                                    dir="ltr"
                                                >
                                                    {cashier.value}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={cashier.label}
                                                    onChange={e =>
                                                        setCashiers(prev =>
                                                            prev.map((c, i) =>
                                                                i === idx ? { ...c, label: e.target.value } : c
                                                            )
                                                        )
                                                    }
                                                    className="flex-grow px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={cashiers.length <= 1}
                                                    onClick={() =>
                                                        setCashiers(prev => prev.filter((_, i) => i !== idx))
                                                    }
                                                    className="p-2 text-red-500 disabled:opacity-30"
                                                >
                                                    <i className="fas fa-trash-alt" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newCashierLabel}
                                            onChange={e => setNewCashierLabel(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCashier())}
                                            placeholder="اسم الكاشير الجديد..."
                                            className={inputCls}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCashier}
                                            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark text-xs font-bold whitespace-nowrap"
                                        >
                                            + إضافة
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={cardCls}>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                            <i className="fas fa-network-wired text-primary" />
                                            تقييد الدخول بالـ IP
                                        </h3>
                                        <input
                                            type="checkbox"
                                            checked={localSettings.enableIPRestriction}
                                            onChange={e =>
                                                setLocalSettings({
                                                    ...localSettings,
                                                    enableIPRestriction: e.target.checked,
                                                })
                                            }
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={localSettings.allowedIP || ''}
                                            onChange={e =>
                                                setLocalSettings({ ...localSettings, allowedIP: e.target.value })
                                            }
                                            className={inputCls}
                                            placeholder="مثال: 192.168.1.1"
                                        />
                                        <button
                                            type="button"
                                            onClick={fetchCurrentIP}
                                            disabled={isLoadingIP}
                                            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold whitespace-nowrap"
                                        >
                                            {isLoadingIP ? <i className="fas fa-spinner fa-spin" /> : 'IP الحالي'}
                                        </button>
                                    </div>
                                </div>

                                <div className={cardCls}>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                            <i className="fas fa-clock text-primary" />
                                            تقييد أوقات العمل
                                        </h3>
                                        <input
                                            type="checkbox"
                                            checked={localSettings.enableTimeRestriction}
                                            onChange={e =>
                                                setLocalSettings({
                                                    ...localSettings,
                                                    enableTimeRestriction: e.target.checked,
                                                })
                                            }
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                                من
                                            </label>
                                            <input
                                                type="time"
                                                value={localSettings.workStartTime}
                                                onChange={e =>
                                                    setLocalSettings({
                                                        ...localSettings,
                                                        workStartTime: e.target.value,
                                                    })
                                                }
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                                إلى
                                            </label>
                                            <input
                                                type="time"
                                                value={localSettings.workEndTime}
                                                onChange={e =>
                                                    setLocalSettings({
                                                        ...localSettings,
                                                        workEndTime: e.target.value,
                                                    })
                                                }
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* TAB 7: MARKETING PIXELS, NOTIFICATIONS & SECURITY */}
                    {activeTab === 'marketing' && (
                        <>
                            <div className={cardCls}>
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <i className="fas fa-bullseye text-blue-500" />
                                        تتبع الإعلانات والبكسلات (Tracking Pixels)
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        تتبع المشاهدات، الإضافة للسلة، بدء الدفع، وإتمام الطلبات تلقائياً في حملاتك الإعلانية.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                <i className="fab fa-facebook text-blue-600" />
                                                Meta Pixel ID
                                            </label>
                                            {metaPixelId.trim() && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                                    مُفعّل
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={metaPixelId}
                                            onChange={e => setMetaPixelId(e.target.value)}
                                            placeholder="123456789012345"
                                            className={`${inputCls} font-mono`}
                                        />
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                <i className="fab fa-tiktok" />
                                                TikTok Pixel ID
                                            </label>
                                            {tiktokPixelId.trim() && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                                    مُفعّل
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={tiktokPixelId}
                                            onChange={e => setTiktokPixelId(e.target.value)}
                                            placeholder="CXXXXXXXXXXXX"
                                            className={`${inputCls} font-mono`}
                                        />
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                <i className="fab fa-google text-amber-500" />
                                                Google Tag / Analytics / Ads ID
                                            </label>
                                            {googleTagId.trim() && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                                    مُفعّل
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={googleTagId}
                                            onChange={e => setGoogleTagId(e.target.value)}
                                            placeholder="G-XXXXXXXXXX"
                                            className={`${inputCls} font-mono`}
                                        />
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                <i className="fab fa-snapchat text-yellow-500" />
                                                Snapchat Pixel ID
                                            </label>
                                            {snapPixelId.trim() && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                                    مُفعّل
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={snapPixelId}
                                            onChange={e => setSnapPixelId(e.target.value)}
                                            placeholder="xxxxxxxx-xxxx-xxxx"
                                            className={`${inputCls} font-mono`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={cardCls}>
                                <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-bell text-primary" />
                                    الإشعارات والتنبيهات العامة
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50 dark:bg-gray-700/60 p-4 rounded-xl border dark:border-gray-600">
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">
                                            حالة إشعارات المتصفح:{' '}
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs ${
                                                    notificationStatus === 'granted'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}
                                            >
                                                {notificationStatus === 'granted'
                                                    ? 'مفعلة'
                                                    : notificationStatus === 'denied'
                                                        ? 'مرفوضة'
                                                        : 'غير مفعلة'}
                                            </span>
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleEnableNotifications}
                                        disabled={notificationStatus === 'granted' || notificationStatus === 'denied'}
                                        className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:bg-gray-400"
                                    >
                                        تفعيل الإشعارات
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    <textarea
                                        className={inputCls}
                                        rows={2}
                                        value={broadcastMessageText}
                                        onChange={e => setBroadcastMessageText(e.target.value)}
                                        placeholder="إرسال إشعار عام فوري لجميع زوار المتجر..."
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!broadcastMessageText.trim()) return alert('الرجاء كتابة رسالة');
                                                try {
                                                    await useStore.getState().sendBroadcast(broadcastMessageText.trim());
                                                    setBroadcastMessageText('');
                                                    addToast('تم إرسال الإشعار بنجاح', 'success');
                                                } catch {
                                                    addToast('فشل إرسال الإشعار', 'error');
                                                }
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold flex items-center gap-2"
                                        >
                                            <i className="fas fa-paper-plane" />
                                            <span>إرسال للجميع</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={cardCls}>
                                <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <i className="fas fa-shield-alt text-amber-500" />
                                    كلمة مرور العمليات الحساسة
                                </h3>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                    className={`${inputCls} max-w-md`}
                                    placeholder="اتركه فارغاً لتعطيل الخاصية"
                                />
                                <p className="text-xs text-gray-500">
                                    تستخدم لتأكيد الحذف وتعديل الأسعار ومسح المعاملات في لوحة الإدارة.
                                </p>

                                <div className="pt-4 border-t border-red-200 dark:border-red-900/40">
                                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                                        <div>
                                            <p className="font-bold text-sm text-red-800 dark:text-red-300">
                                                منطقة الخطر — مسح جميع بيانات التطبيق
                                            </p>
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                سيتم مسح المنتجات والمبيعات والطلبات نهائياً مع إبقاء الحسابات والإعدادات.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsResetModalOpen(true)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-xs font-bold whitespace-nowrap"
                                        >
                                            <i className="fas fa-trash-alt ml-1.5" />
                                            مسح جميع البيانات
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleResetDatabase}
                title="تأكيد مسح جميع البيانات"
                message="هل أنت متأكد تماماً من رغبتك في مسح جميع البيانات؟ سيتم حذف جميع المنتجات، المبيعات، الطلبات، وكل شيء آخر. هذا الإجراء لا يمكن التراجع عنه!"
                isLoading={isResetting}
                requireSecurityCheck={true}
            />
        </div>
    );
};

export default Settings;
