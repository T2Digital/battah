import React, { useState, useEffect } from 'react';
import useStore from '../../lib/store';
import SectionHeader from '../shared/SectionHeader';
import { requestNotificationPermission } from '../../lib/firebase';
import ConfirmationModal from '../shared/ConfirmationModal';
import { BranchConfig, CashierConfig, StorefrontFiltersConfig } from '../../types';
import {
    getActiveBranches,
    getActiveCashiers,
    getMainCategories,
    getSubCategoriesMap,
    getStorefrontFiltersConfig,
} from '../../lib/appConfig';

const Settings: React.FC = () => {
    const { appData, updateSettings, updateStorefrontSettings, updateAppCustomization, addToast, resetDatabase } = useStore();
    const settings = appData?.settings || {
        enableIPRestriction: false,
        enableTimeRestriction: false,
        workStartTime: "09:00",
        workEndTime: "23:00"
    };

    const [localSettings, setLocalSettings] = useState(settings);
    const [adminPassword, setAdminPassword] = useState(appData?.storefrontSettings?.adminPassword || '');
    const [contactPhone, setContactPhone] = useState((appData?.storefrontSettings as any)?.contactPhone || (typeof window !== 'undefined' ? (window as any).__TENANT_BRAND__?.phone : '') || '01013373634');
    const [address, setAddress] = useState((appData?.storefrontSettings as any)?.address || (typeof window !== 'undefined' ? (window as any).__TENANT_BRAND__?.address : '') || 'القاهرة - التوفيقية');
    const [primaryColor, setPrimaryColor] = useState(() => {
        const raw = (appData?.storefrontSettings as any)?.primaryColor || (typeof window !== 'undefined' ? (window as any).__TENANT_BRAND__?.primaryColor : '') || '#0284c7';
        return String(raw).toLowerCase() === '#00f0ff' ? '#0284c7' : raw;
    });
    const [currentIP, setCurrentIP] = useState<string>('');
    const [isLoadingIP, setIsLoadingIP] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [newTickerMessage, setNewTickerMessage] = useState('');
    const [tickerMessages, setTickerMessages] = useState<string[]>([]);
    const [notificationStatus, setNotificationStatus] = useState<string>('default');

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
            setAdminPassword(appData.storefrontSettings.adminPassword || '');
            if ((appData.storefrontSettings as any).contactPhone) setContactPhone((appData.storefrontSettings as any).contactPhone);
            if ((appData.storefrontSettings as any).address) setAddress((appData.storefrontSettings as any).address);
            if ((appData.storefrontSettings as any).primaryColor) {
                const c = String((appData.storefrontSettings as any).primaryColor);
                setPrimaryColor(c.toLowerCase() === '#00f0ff' ? '#0284c7' : c);
            }
        }
        if (appData?.appCustomization) {
            setActiveBranches(getActiveBranches(appData.appCustomization));
            setCashiers(getActiveCashiers(appData.appCustomization));
            setMainCategories(getMainCategories(appData.appCustomization));
            setSubCategoriesMap(getSubCategoriesMap(appData.appCustomization));
            setStorefrontFilters(getStorefrontFiltersConfig(appData.appCustomization));
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
            setCurrentIP(data.ip);
            setLocalSettings(prev => ({ ...prev, allowedIP: data.ip }));
        } catch (error) {
            console.error("Failed to fetch IP:", error);
            addToast("فشل في جلب عنوان IP الحالي", "error");
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

            await updateSettings(localSettings);
            await updateStorefrontSettings({
                ...(appData?.storefrontSettings || {}),
                adminPassword,
                contactPhone,
                address,
                primaryColor,
            } as any);
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
            });
            addToast("تم حفظ الإعدادات بنجاح", "success");
        } catch (error) {
            console.error("Failed to save settings:", error);
            addToast("فشل في حفظ الإعدادات", "error");
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
            console.error("Failed to reset database:", error);
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-cogs" title="الإعدادات العامة" />
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-8">

                {/* Admin Password Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-shield-alt text-red-500"></i>
                        كلمة مرور العمليات الحساسة (للمدير)
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور</label>
                            <input 
                                type="password" 
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                placeholder="اتركه فارغاً لتعطيل الخاصية"
                            />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        تستخدم لتأكيد الحذف والتعديل والإضافة في الأقسام الحساسة (مثل تصفير الخزينة، تعديل أسعار المخزن، مسح المعاملات).
                    </p>
                </div>
                
                {/* Storefront Footer, Invoice Contact & Theme Color Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-store text-primary"></i>
                        بيانات الفوتر والفاتورة المطبوعة ولون الثيم
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الموبايل (يظهر في الفوتر والفاتورة)</label>
                            <input
                                type="text"
                                dir="ltr"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                placeholder="01013373634"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان (يظهر في الفوتر والفاتورة المطبوعة)</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                placeholder="القاهرة - التوفيقية"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">لون الثيم الرئيسي (اختر لوناً واضحاً للأزرار والنصوص)</label>
                        <div className="flex flex-wrap items-center gap-2.5">
                            {['#0284c7', '#2563eb', '#059669', '#dc2626', '#7c3aed', '#d97706'].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setPrimaryColor(preset)}
                                    style={{ backgroundColor: preset }}
                                    className={`w-8 h-8 rounded-full border-2 transition ${primaryColor === preset ? 'border-gray-900 dark:border-white scale-110 shadow-md' : 'border-transparent'}`}
                                    title={preset}
                                />
                            ))}
                            <input
                                type="color"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="w-10 h-8 rounded cursor-pointer border border-gray-300"
                            />
                            <span className="text-xs font-mono text-gray-500" dir="ltr">{primaryColor}</span>
                        </div>
                    </div>
                </div>

                {/* Dynamic Branches Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                        <i className="fas fa-code-branch text-primary"></i>
                        إدارة الفروع والمخازن
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        حدد الفروع والمخازن النشطة في نظامك (مثال: فرع واحد أو عدة فروع) لتظهر تلقائياً في المبيعات والمخزون والتقارير.
                    </p>
                    <div className="space-y-2.5 mb-3">
                        {activeBranches.map((branch, idx) => (
                            <div key={branch.key} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                <span className="text-xs font-mono px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 shrink-0" dir="ltr">
                                    {branch.key}
                                </span>
                                <input
                                    type="text"
                                    value={branch.label}
                                    onChange={(e) => setActiveBranches(prev => prev.map((b, i) => i === idx ? { ...b, label: e.target.value } : b))}
                                    className="flex-grow px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                    placeholder="اسم الفرع..."
                                />
                                <button
                                    type="button"
                                    disabled={activeBranches.length <= 1}
                                    onClick={() => setActiveBranches(prev => prev.filter((_, i) => i !== idx))}
                                    className="px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    title={activeBranches.length <= 1 ? 'يجب وجود فرع واحد على الأقل' : 'حذف الفرع'}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newBranchLabel}
                            onChange={(e) => setNewBranchLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBranch())}
                            placeholder="اسم الفرع الجديد (مثال: فرع مدينة نصر)..."
                            className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm"
                        />
                        <button
                            type="button"
                            onClick={handleAddBranch}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-bold whitespace-nowrap"
                        >
                            + إضافة فرع
                        </button>
                    </div>
                </div>

                {/* Dynamic Cashiers Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                        <i className="fas fa-cash-register text-primary"></i>
                        إدارة نقاط البيع (الكاشيرات)
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        تحكم في عدد وأسماء الكاشيرات المتاحة داخل شاشة مبيعات اليوم ونقطة البيع.
                    </p>
                    <div className="space-y-2.5 mb-3">
                        {cashiers.map((cashier, idx) => (
                            <div key={cashier.value} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                                <span className="text-xs font-mono px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 shrink-0" dir="ltr">
                                    {cashier.value}
                                </span>
                                <input
                                    type="text"
                                    value={cashier.label}
                                    onChange={(e) => setCashiers(prev => prev.map((c, i) => i === idx ? { ...c, label: e.target.value } : c))}
                                    className="flex-grow px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                    placeholder="اسم الكاشير..."
                                />
                                <button
                                    type="button"
                                    disabled={cashiers.length <= 1}
                                    onClick={() => setCashiers(prev => prev.filter((_, i) => i !== idx))}
                                    className="px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    title={cashiers.length <= 1 ? 'يجب وجود كاشير واحد على الأقل' : 'حذف الكاشير'}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCashierLabel}
                            onChange={(e) => setNewCashierLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCashier())}
                            placeholder="اسم الكاشير الجديد (مثال: كاشير الدور الثاني)..."
                            className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm"
                        />
                        <button
                            type="button"
                            onClick={handleAddCashier}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-bold whitespace-nowrap"
                        >
                            + إضافة كاشير
                        </button>
                    </div>
                </div>

                {/* Dynamic Main & Sub Categories Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                        <i className="fas fa-layer-group text-primary"></i>
                        إدارة الأقسام الرئيسية والفرعية
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        أضف أو عدّل الأقسام الرئيسية وأقسامها الفرعية لتنعكس فوراً في المتجر الإلكتروني وشاشات إضافة المنتجات والتسعير.
                    </p>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newMainCat}
                            onChange={(e) => setNewMainCat(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMainCategory())}
                            placeholder="إضافة قسم رئيسي جديد..."
                            className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm"
                        />
                        <button
                            type="button"
                            onClick={handleAddMainCategory}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-bold whitespace-nowrap"
                        >
                            + إضافة قسم رئيسي
                        </button>
                    </div>
                    <div className="space-y-4">
                        {mainCategories.map((cat, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 space-y-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={cat}
                                        onChange={(e) => handleRenameMainCategory(idx, e.target.value)}
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
                                        className="px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        title="حذف القسم"
                                    >
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(subCategoriesMap[cat] || []).map((sub) => (
                                        <span key={sub} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-xs font-medium">
                                            <span>{sub}</span>
                                            <button
                                                type="button"
                                                onClick={() => setSubCategoriesMap(prev => ({
                                                    ...prev,
                                                    [cat]: (prev[cat] || []).filter(s => s !== sub),
                                                }))}
                                                className="text-red-500 hover:text-red-700 font-bold"
                                                aria-label={`حذف ${sub}`}
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
                                        onChange={(e) => setNewSubCatDraft(prev => ({ ...prev, [cat]: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubCategory(cat))}
                                        placeholder={`إضافة قسم فرعي تحت "${cat}"...`}
                                        className="flex-grow px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleAddSubCategory(cat)}
                                        className="px-3 py-1.5 bg-gray-800 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs font-bold whitespace-nowrap"
                                    >
                                        + إضافة فرعي
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Storefront Filters Customization Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                        <i className="fas fa-sliders-h text-primary"></i>
                        إدارة فلاتر المتجر الإلكتروني
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        فعّل أو أخفِ فلاتر البحث والتصفية التي تظهر لعملائك في صفحة المتجر.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                        {([
                            { key: 'showSearch', label: 'شريط البحث' },
                            { key: 'showCategoryFilter', label: 'فلتر الأقسام الرئيسية' },
                            { key: 'showSubCategoryFilter', label: 'فلتر الأقسام الفرعية' },
                            { key: 'showBrandFilter', label: 'فلتر الماركة / السمة' },
                            { key: 'showPriceFilter', label: 'فلتر السعر (من / إلى)' },
                            { key: 'showInStockOnlyFilter', label: 'فلتر المتوفر بالمخزون فقط' },
                        ] as const).map((toggle) => (
                            <label key={toggle.key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 cursor-pointer">
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{toggle.label}</span>
                                <input
                                    type="checkbox"
                                    checked={Boolean(storefrontFilters[toggle.key])}
                                    onChange={(e) => setStorefrontFilters(prev => ({ ...prev, [toggle.key]: e.target.checked }))}
                                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                                />
                            </label>
                        ))}
                    </div>

                    {storefrontFilters.showBrandFilter && (
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم فلتر الماركة / السمة</label>
                                <input
                                    type="text"
                                    value={storefrontFilters.brandFilterLabel}
                                    onChange={(e) => setStorefrontFilters(prev => ({ ...prev, brandFilterLabel: e.target.value }))}
                                    placeholder="مثال: ماركة السيارة"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">خيارات القائمة المنسدلة</label>
                                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto mb-2.5 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                    {storefrontFilters.brandFilterOptions.map((opt) => (
                                        <span key={opt} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
                                            <span>{opt}</span>
                                            <button
                                                type="button"
                                                onClick={() => setStorefrontFilters(prev => ({
                                                    ...prev,
                                                    brandFilterOptions: prev.brandFilterOptions.filter(o => o !== opt),
                                                }))}
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
                                        onChange={(e) => setNewBrandOption(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBrandOption())}
                                        placeholder="أضف خيار جديد للفلتر..."
                                        className="flex-grow px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddBrandOption}
                                        className="px-3 py-1.5 bg-gray-800 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs font-bold whitespace-nowrap"
                                    >
                                        + إضافة خيار
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* IP Restriction Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-network-wired text-primary"></i>
                        تقييد الدخول بالموقع (IP Restriction)
                    </h3>
                    <div className="flex items-center gap-4 mb-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={localSettings.enableIPRestriction}
                                onChange={(e) => setLocalSettings({...localSettings, enableIPRestriction: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                            <span className="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">تفعيل التقييد</span>
                        </label>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان IP المسموح به (الفرع)</label>
                            <input 
                                type="text" 
                                value={localSettings.allowedIP || ''}
                                onChange={(e) => setLocalSettings({...localSettings, allowedIP: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                placeholder="مثال: 192.168.1.1"
                            />
                        </div>
                        <button 
                            onClick={fetchCurrentIP} 
                            disabled={isLoadingIP}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                        >
                            {isLoadingIP ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-globe"></i>}
                            استخدام IP الحالي
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        عند التفعيل، لن يتمكن الموظفون من تسجيل الدخول إلا إذا كان عنوان IP الخاص بهم يطابق العنوان المحدد أعلاه.
                    </p>
                </div>

                {/* Time Restriction Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-clock text-primary"></i>
                        تقييد الدخول بالوقت (Time Restriction)
                    </h3>
                    <div className="flex items-center gap-4 mb-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={localSettings.enableTimeRestriction}
                                onChange={(e) => setLocalSettings({...localSettings, enableTimeRestriction: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                            <span className="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">تفعيل التقييد</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بداية وقت العمل</label>
                            <input 
                                type="time" 
                                value={localSettings.workStartTime}
                                onChange={(e) => setLocalSettings({...localSettings, workStartTime: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نهاية وقت العمل</label>
                            <input 
                                type="time" 
                                value={localSettings.workEndTime}
                                onChange={(e) => setLocalSettings({...localSettings, workEndTime: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        عند التفعيل، لن يتمكن الموظفون من تسجيل الدخول خارج هذه الأوقات.
                    </p>
                </div>

                {/* Electronic Payment Number Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-wallet text-primary"></i>
                        رقم استقبال الدفع الإلكتروني
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم المحفظة (فودافون كاش، انستاباي، إلخ)</label>
                            <input 
                                type="text" 
                                value={localSettings.electronicPaymentNumber || ''}
                                onChange={(e) => setLocalSettings({...localSettings, electronicPaymentNumber: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                placeholder="مثال: 01080444447"
                            />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        سيتم استخدام هذا الرقم في صفحة إتمام الطلب للعملاء.
                    </p>
                </div>

                {/* Ticker Messages Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-scroll text-primary"></i>
                        شريط الأخبار (المتحرك)
                    </h3>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            أضف رسائل ترويجية تظهر في الشريط المتحرك أعلى المتجر.
                        </p>
                        
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTickerMessage}
                                onChange={(e) => setNewTickerMessage(e.target.value)}
                                placeholder="اكتب رسالة جديدة..."
                                className="flex-grow p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddTickerMessage()}
                            />
                            <button
                                onClick={handleAddTickerMessage}
                                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition"
                            >
                                <i className="fas fa-plus"></i>
                            </button>
                        </div>

                        <div className="space-y-2 mt-4">
                            {tickerMessages.map((msg, index) => (
                                <div key={index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded border dark:border-gray-600">
                                    <span className="text-gray-800 dark:text-gray-200">{msg}</span>
                                    <button
                                        onClick={() => handleRemoveTickerMessage(index)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                            {tickerMessages.length === 0 && (
                                <p className="text-center text-gray-500 italic py-2">لا يوجد رسائل حالياً</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Push Notifications Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-bell text-primary"></i>
                        إشعارات المتصفح (Push Notifications)
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-white">
                                حالة الإشعارات: 
                                <span className={`mr-2 px-2 py-1 rounded text-sm ${
                                    notificationStatus === 'granted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    notificationStatus === 'denied' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                }`}>
                                    {notificationStatus === 'granted' ? 'مفعلة' : notificationStatus === 'denied' ? 'مرفوضة' : 'غير مفعلة'}
                                </span>
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                قم بتفعيل الإشعارات لتلقي التنبيهات حتى عندما يكون التطبيق مغلقاً.
                            </p>
                        </div>
                        <button
                            onClick={handleEnableNotifications}
                            disabled={notificationStatus === 'granted' || notificationStatus === 'denied'}
                            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                                notificationStatus === 'granted' 
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' 
                                    : 'bg-primary text-white hover:bg-primary-dark'
                            }`}
                        >
                            <i className="fas fa-bell-slash"></i>
                            تفعيل الإشعارات
                        </button>
                    </div>
                </div>

                {/* Broadcast Notification Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-bullhorn text-primary"></i>
                        إرسال إشعار عام للمستخدمين
                    </h3>
                    <div className="flex flex-col gap-4">
                        <textarea
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            rows={3}
                            placeholder="اكتب نص الإشعار هنا..."
                            id="broadcast-message"
                        ></textarea>
                        <button
                            onClick={async () => {
                                const msg = (document.getElementById('broadcast-message') as HTMLTextAreaElement).value;
                                if (!msg) return alert('الرجاء كتابة رسالة');
                                try {
                                    await useStore.getState().sendBroadcast(msg);
                                    (document.getElementById('broadcast-message') as HTMLTextAreaElement).value = '';
                                    addToast('تم إرسال الإشعار بنجاح', 'success');
                                } catch (e) {
                                    console.error(e);
                                    addToast('فشل إرسال الإشعار', 'error');
                                }
                            }}
                            className="self-end px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            <i className="fas fa-paper-plane ml-2"></i>
                            إرسال للجميع
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        سيظهر هذا الإشعار لجميع المستخدمين الذين يفتحون التطبيق.
                    </p>
                </div>

                {/* Reset Database Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                        <i className="fas fa-exclamation-triangle"></i>
                        منطقة الخطر (إعادة ضبط المصنع)
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                        <div>
                            <p className="font-medium text-red-800 dark:text-red-300">
                                مسح جميع بيانات التطبيق
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                سيتم مسح جميع المنتجات، المبيعات، الطلبات، المصروفات، وكل البيانات الأخرى نهائياً. لا يمكن التراجع عن هذا الإجراء. سيتم الاحتفاظ بحسابات المستخدمين والإعدادات فقط.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsResetModalOpen(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 whitespace-nowrap"
                        >
                            <i className="fas fa-trash-alt"></i>
                            مسح جميع البيانات
                        </button>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                        {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                    </button>
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
