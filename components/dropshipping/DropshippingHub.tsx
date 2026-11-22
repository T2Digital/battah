import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import useStore from '../../lib/store';
import { getMainCategories, getActiveBranches, createEmptyStockForBranches } from '../../lib/appConfig';
import { getTenantSessionToken } from '../../lib/tenantErpSync';
import { resolveTenantBrandId } from '../../lib/tenantBootstrap';
import { formatCurrency } from '../../lib/utils';
import { DropshippingSupplierProvider, ShippingCarrierProvider } from '../../types';

const PROVIDER_TABS: Array<{
  id: DropshippingSupplierProvider | 'csv';
  label: string;
  subtitle: string;
  icon: string;
  badgeColor: string;
}> = [
  {
    id: 'cj',
    label: 'CJ Dropshipping API v2',
    subtitle: 'استيراد عالمي + شحن CJ Auto',
    icon: 'fa-globe',
    badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
  },
  {
    id: 'knawat',
    label: 'Knawat GCC',
    subtitle: 'موردو الخليج والشرق الأوسط',
    icon: 'fa-boxes',
    badgeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30',
  },
  {
    id: 'makhazen',
    label: 'مخازن (Makhazen)',
    subtitle: 'مستودعات الخليج السريعة (OTO)',
    icon: 'fa-warehouse',
    badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
  },
  {
    id: 'taager',
    label: 'تاجر (Taager)',
    subtitle: 'توصيل محلي سريع 1-2 يوم',
    icon: 'fa-bolt',
    badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'local_wholesale',
    label: 'موردين محليين (جملة)',
    subtitle: 'العتبة / الجيزة / التوفيقية',
    icon: 'fa-store',
    badgeColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30',
  },
  {
    id: 'workshop',
    label: 'ورش عند الطلب (مستقلة)',
    subtitle: 'تصنيع مخصص وقت الطلب بدون مخزون',
    icon: 'fa-tools',
    badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
  },
  {
    id: 'csv',
    label: 'استيراد CSV / Excel جماعي',
    subtitle: 'رفع كتالوج مورد محلي دفعة واحدة',
    icon: 'fa-file-excel',
    badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
  },
];

const CARRIER_OPTIONS: Array<{ value: ShippingCarrierProvider | 'manual_whatsapp'; label: string }> = [
  { value: 'bosta', label: 'بوسطة (Bosta API v2)' },
  { value: 'oto', label: 'OTO MENA (Aramex / SMSA / Zajil)' },
  { value: 'aramex', label: 'أرامكس مباشر (Aramex)' },
  { value: 'cj_auto', label: 'CJ Auto-Fulfillment Express' },
  { value: 'manual_whatsapp', label: 'توريد واتساب بدون أسعار (Zero-Price)' },
];

export const DropshippingHub: React.FC = () => {
  const { appData, addProduct, addToast } = useStore((s) => ({
    appData: s.appData,
    addProduct: s.addProduct,
    addToast: s.addToast,
  }));

  const storeSlug = resolveTenantBrandId() || 'captaincar-eg';
  const [activeTab, setActiveTab] = useState<'import' | 'routing'>('import');
  const [selectedProvider, setSelectedProvider] = useState<DropshippingSupplierProvider | 'csv'>('cj');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchNote, setSearchNote] = useState('');
  const [importingSku, setImportingSku] = useState<string | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  // Provider Config Drawer State
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [providersCfg, setProvidersCfg] = useState<any>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [cfgForm, setCfgForm] = useState({
    usdToEgp: '49.5',
    sarToEgp: '13.2',
    defaultMarkupMultiplier: '2.25',
    defaultShippingEgp: '65',
    defaultCpaEgp: '90',
    cjAccessToken: '',
    knawatApiKey: '',
    makhazenApiKey: '',
    taagerApiKey: '',
    bostaApiKey: '',
    otoApiKey: '',
    aramexAccountNumber: '',
  });

  // Bulk CSV / Excel Import
  const csvFileRef = useRef<HTMLInputElement>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);

  // Split-Order & Multi-Carrier Settlement State
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [subCarrierChoices, setSubCarrierChoices] = useState<Record<string, string>>({});
  const [dispatchingKey, setDispatchingKey] = useState<string | null>(null);
  const [dispatchOutput, setDispatchOutput] = useState<{
    title: string;
    text: string;
    waUrl: string;
    tracking?: string | null;
    trackingUrl?: string | null;
  } | null>(null);

  const existingSkus = useMemo(
    () => new Set((appData?.products || []).map((p) => String(p.sku || '').toLowerCase())),
    [appData?.products]
  );

  const authHeaders = (extra?: Record<string, string>): Record<string, string> => {
    const token = getTenantSessionToken(storeSlug);
    const masterToken =
      typeof localStorage !== 'undefined' ? localStorage.getItem('t2os_admin_token') : null;
    const h: Record<string, string> = { ...(extra || {}) };
    if (token) h.Authorization = `Bearer ${token}`;
    else if (masterToken) h.Authorization = `Bearer ${masterToken}`;
    return h;
  };

  const fetchSettlementAndProviders = async () => {
    setSettlementLoading(true);
    try {
      const [setRes, provRes] = await Promise.all([
        fetch('/api/dropshipping/settlement', {
          credentials: 'include',
          headers: authHeaders(),
        }),
        fetch('/api/dropshipping/providers', {
          credentials: 'include',
          headers: authHeaders(),
        }),
      ]);
      const setData = await setRes.json().catch(() => ({}));
      if (setRes.ok && setData?.ok) {
        setSummary(setData.summary || null);
        setOrders(Array.isArray(setData.orders) ? setData.orders : []);
      }
      const provData = await provRes.json().catch(() => ({}));
      if (provRes.ok && provData?.ok && provData.config) {
        setProvidersCfg(provData.config);
        setCfgForm((prev) => ({
          ...prev,
          usdToEgp: String(provData.config.usdToEgp ?? 49.5),
          sarToEgp: String(provData.config.sarToEgp ?? 13.2),
          defaultMarkupMultiplier: String(provData.config.defaultMarkupMultiplier ?? 2.25),
          defaultShippingEgp: String(provData.config.defaultShippingEgp ?? 65),
          defaultCpaEgp: String(provData.config.defaultCpaEgp ?? 90),
        }));
      }
    } catch (e) {
      console.error('Failed loading dropshipping hub data:', e);
    } finally {
      setSettlementLoading(false);
    }
  };

  const handleSearchCatalog = async (provOverride?: DropshippingSupplierProvider | 'csv') => {
    const target = provOverride || selectedProvider;
    if (target === 'csv') return;
    setSearchLoading(true);
    setSearchNote('');
    try {
      const res = await fetch('/api/dropshipping/suppliers/search', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ provider: target, query: searchQuery.trim(), slug: storeSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setSearchResults(Array.isArray(data.items) ? data.items : []);
        if (data.note) setSearchNote(data.note);
      } else {
        addToast(data?.error || 'تعذر تحميل كتالوج الموردين', 'error');
      }
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettlementAndProviders();
    void handleSearchCatalog('cj');
  }, [storeSlug]);

  const handleSaveProvidersConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload: Record<string, any> = {
        usdToEgp: Number(cfgForm.usdToEgp) || 49.5,
        sarToEgp: Number(cfgForm.sarToEgp) || 13.2,
        defaultMarkupMultiplier: Number(cfgForm.defaultMarkupMultiplier) || 2.25,
        defaultShippingEgp: Number(cfgForm.defaultShippingEgp) || 65,
        defaultCpaEgp: Number(cfgForm.defaultCpaEgp) || 90,
      };
      if (cfgForm.cjAccessToken.trim()) payload.cjAccessToken = cfgForm.cjAccessToken.trim();
      if (cfgForm.knawatApiKey.trim()) payload.knawatApiKey = cfgForm.knawatApiKey.trim();
      if (cfgForm.makhazenApiKey.trim()) payload.makhazenApiKey = cfgForm.makhazenApiKey.trim();
      if (cfgForm.taagerApiKey.trim()) payload.taagerApiKey = cfgForm.taagerApiKey.trim();
      if (cfgForm.bostaApiKey.trim()) payload.bostaApiKey = cfgForm.bostaApiKey.trim();
      if (cfgForm.otoApiKey.trim()) payload.otoApiKey = cfgForm.otoApiKey.trim();
      if (cfgForm.aramexAccountNumber.trim()) payload.aramexAccountNumber = cfgForm.aramexAccountNumber.trim();

      const res = await fetch('/api/dropshipping/providers', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setProvidersCfg(data.config);
        addToast('تم حفظ مفاتيح الموردين وشركات الشحن وإعدادات التسعير بنجاح', 'success');
        setShowConfigPanel(false);
        void handleSearchCatalog();
      } else {
        addToast(data?.error || 'تعذر حفظ الإعدادات', 'error');
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const handleImportSingleProduct = async (item: any) => {
    setImportingSku(item.sku);
    try {
      const sellingPrice = Number(priceOverrides[item.sku] || item.suggestedSellingPriceEgp || 550);
      const res = await fetch('/api/dropshipping/suppliers/import', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          slug: storeSlug,
          products: [
            {
              sku: item.sku,
              name: item.name,
              category: item.category,
              mainCategory: item.category,
              description: item.description,
              imageUrl: item.imageUrl,
              images: [item.imageUrl],
              sellingPriceEgp: sellingPrice,
              supplierCostEgp: item.supplierCostEgp,
              fulfillmentType: 'dropshipping',
              supplierProvider: item.supplierProvider,
              supplierId: item.supplierId,
              supplierName: item.supplierName,
              supplierWhatsapp: item.supplierWhatsapp,
              warehouseRegion: item.warehouseRegion,
              estimatedDeliveryDays: item.estimatedDeliveryDays,
            },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        addToast(data?.error || 'فشل استيراد المنتج', 'error');
        return;
      }

      if (!existingSkus.has(String(item.sku || '').toLowerCase())) {
        const branches = getActiveBranches(appData?.appCustomization);
        await addProduct({
          name: item.name,
          sku: item.sku,
          mainCategory: item.category || getMainCategories(appData?.appCustomization)[0] || 'عام',
          category: item.category || 'عام',
          subCategory: 'دروبشيبنج',
          brand: item.supplierName || 'مورد معتمد',
          purchasePrice: item.supplierCostEgp,
          sellingPrice,
          stock: createEmptyStockForBranches(branches, 40),
          description: item.description,
          images: [item.imageUrl],
          isNew: true,
          discount: 15,
          fulfillmentType: 'dropshipping',
          supplierProvider: item.supplierProvider,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          supplierSku: item.sku,
          supplierCostEgp: item.supplierCostEgp,
          warehouseRegion: item.warehouseRegion,
          estimatedDeliveryDays: item.estimatedDeliveryDays,
        });
      } else {
        addToast(`تم تحديث "${item.name}" في المتجر (${storeSlug}) بنجاح`, 'success');
      }
    } finally {
      setImportingSku(null);
    }
  };

  const handleDownloadCsvTemplate = () => {
    const sample = [
      {
        SKU: 'SUP-LOC-101',
        Name: 'جهاز مساج الرقبة الكهربائي الحراري الذكي',
        Category: 'العناية الشخصية',
        SellingPriceEGP: 790,
        SupplierCostEGP: 310,
        SupplierName: 'مستودع جملة العتبة',
        SupplierWhatsapp: '01013372674',
        WarehouseRegion: 'القاهرة — مصر',
        ImageURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=900&auto=format&fit=crop',
        Description: 'تدليك حراري بأشعة تحت الحمراء شحن USB مناسب للمنزل والسيارة.',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DropshippingCatalog');
    XLSX.writeFile(wb, 'dropshipping-suppliers-template.xlsx');
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet);
      const normalized = rows
        .map((r, i) => ({
          sku: String(r.SKU || r.sku || `CSV-${Date.now().toString().slice(-4)}-${i + 1}`).trim(),
          name: String(r.Name || r.name || r['الاسم'] || '').trim(),
          category: String(r.Category || r.category || r['القسم'] || 'منتجات مستوردة').trim(),
          sellingPriceEgp: Number(r.SellingPriceEGP || r.sellingPrice || r['سعر البيع'] || 590),
          supplierCostEgp: Number(r.SupplierCostEGP || r.supplierCost || r['سعر الجملة'] || 250),
          supplierName: String(r.SupplierName || r['المورد'] || 'مورد محلي CSV').trim(),
          supplierWhatsapp: String(r.SupplierWhatsapp || r['واتساب المورد'] || '01013372674').trim(),
          warehouseRegion: String(r.WarehouseRegion || 'القاهرة — مصر').trim(),
          imageUrl: String(
            r.ImageURL ||
              r.imageUrl ||
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=900&auto=format&fit=crop'
          ).trim(),
          description: String(r.Description || r['الوصف'] || 'منتج مستورد من ملف الموردين').trim(),
          supplierProvider: 'local_wholesale',
          fulfillmentType: 'dropshipping',
        }))
        .filter((x) => x.name);
      setCsvPreviewRows(normalized);
      addToast(`تمت قراءة ${normalized.length} صنف بنجاح للمعاينة`, 'info');
    } catch {
      addToast('تعذر قراءة الملف. تأكد من تنسيق Excel أو CSV.', 'error');
    }
  };

  const handleConfirmBulkCsvImport = async () => {
    if (csvPreviewRows.length === 0) return;
    setBulkImporting(true);
    try {
      const res = await fetch('/api/dropshipping/suppliers/import', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ slug: storeSlug, products: csvPreviewRows }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        const branches = getActiveBranches(appData?.appCustomization);
        for (const item of csvPreviewRows) {
          if (!existingSkus.has(String(item.sku).toLowerCase())) {
            await addProduct({
              name: item.name,
              sku: item.sku,
              mainCategory: item.category,
              category: item.category,
              subCategory: 'استيراد CSV',
              brand: item.supplierName,
              purchasePrice: item.supplierCostEgp,
              sellingPrice: item.sellingPriceEgp,
              stock: createEmptyStockForBranches(branches, 40),
              description: item.description,
              images: [item.imageUrl],
              isNew: true,
              fulfillmentType: 'dropshipping',
              supplierProvider: 'local_wholesale',
              supplierName: item.supplierName,
              supplierCostEgp: item.supplierCostEgp,
              warehouseRegion: item.warehouseRegion,
            });
          }
        }
        setCsvPreviewRows([]);
        addToast(`تم استيراد ${data.importedCount} منتج دفعة واحدة إلى المتجر!`, 'success');
      } else {
        addToast(data?.error || 'فشل الاستيراد الجماعي', 'error');
      }
    } finally {
      setBulkImporting(false);
    }
  };

  const handleDispatchSubOrder = async (orderId: string, subOrderId?: string, defaultCarrier?: string) => {
    const key = subOrderId ? `${orderId}::${subOrderId}` : orderId;
    setDispatchingKey(key);
    try {
      const chosenCarrier = (subOrderId && subCarrierChoices[key]) || defaultCarrier || 'bosta';
      const res = await fetch(`/api/dropshipping/orders/${encodeURIComponent(orderId)}/dispatch`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ subOrderId, carrier: chosenCarrier }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        const firstDisp = Array.isArray(data.dispatches) ? data.dispatches[0] : data;
        setDispatchOutput({
          title: subOrderId ? `توجيه الشحنة المقسّمة (${subOrderId})` : `توجيه الطلب (${orderId})`,
          text: firstDisp?.supplierDispatchText || data.supplierDispatchText || '',
          waUrl: firstDisp?.supplierWhatsappUrl || data.supplierWhatsappUrl || '',
          tracking: firstDisp?.trackingNumber || data.trackingNumber || null,
          trackingUrl: firstDisp?.trackingUrl || '',
        });
        await fetchSettlementAndProviders();
        addToast('تم إصدار أمر التوريد والشحن بدون كشف سعر البيع ✅', 'success');
      } else {
        addToast(data?.error || 'تعذر توجيه الشحنة', 'error');
      }
    } finally {
      setDispatchingKey(null);
    }
  };

  const handleOrderStatus = async (orderId: string, status: 'confirmed' | 'delivered' | 'returned', subOrderId?: string) => {
    const key = `${orderId}:${status}:${subOrderId || 'all'}`;
    setDispatchingKey(key);
    try {
      const res = await fetch(`/api/dropshipping/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status, subOrderId }),
      });
      if (res.ok) {
        await fetchSettlementAndProviders();
        addToast('تم تحديث حالة التحصيل والشحنة بنجاح', 'success');
      }
    } finally {
      setDispatchingKey(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Hero Header */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-sky-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-sky-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-black">
                T2OS Sovereign Dropshipping Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30 text-xs font-mono">
                /shop/{storeSlug}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black">
              مركز الدروبشيبنج، استيراد الموردين، والشحن متعدد الشركات
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              استورد منتجات رابحة من CJ Dropshipping و Knawat ومخازن وتاجر والورش بضغطة واحدة — مع تقسيم الطلبات تلقائياً (Split-Order) وإصدار بوالص Bosta و OTO و Aramex و CJ.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowConfigPanel((v) => !v)}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-2 transition"
            >
              <i className="fas fa-key text-amber-400" />
              <span>مفاتيح API الموردين والشحن</span>
            </button>
            <button
              type="button"
              onClick={fetchSettlementAndProviders}
              className="px-3.5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold flex items-center gap-2 transition shadow-md"
            >
              <i className={`fas fa-sync-alt ${settlementLoading ? 'fa-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition ${
              activeTab === 'import'
                ? 'bg-white text-slate-900 shadow-lg'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            }`}
          >
            <i className="fas fa-cloud-download-alt" />
            <span>1. مركز استيراد وربط الموردين ({PROVIDER_TABS.length - 1} شبكات + CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('routing')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition ${
              activeTab === 'routing'
                ? 'bg-emerald-400 text-slate-950 shadow-lg'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            }`}
          >
            <i className="fas fa-shipping-fast" />
            <span>2. توجيه الطلبات المقسّمة وبوابة الشحن ({orders.length})</span>
          </button>
        </div>
      </div>

      {/* Collapsible API Credentials & Pricing Markup Config */}
      {showConfigPanel && (
        <form
          onSubmit={handleSaveProvidersConfig}
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
            <div>
              <h3 className="font-black text-base text-gray-900 dark:text-white">
                ربط مفاتيح API الموردين العالميين وشركات الشحن وقواعد التسعير
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                تُحفظ المفاتيح مشفرة على الخادم ولا تظهر في واجهة المتجر للعملاء إطلاقاً.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {providersCfg?.configured &&
                Object.entries(providersCfg.configured).map(([k, ok]) => (
                  <span
                    key={k}
                    className={`px-2 py-0.5 rounded-full font-bold ${
                      ok
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {k.toUpperCase()}: {ok ? 'متصل لايف' : 'جاهز (Mock/WA)'}
                  </span>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">سعر صرف الدولار USD→EGP</label>
              <input
                type="number"
                step="0.1"
                value={cfgForm.usdToEgp}
                onChange={(e) => setCfgForm({ ...cfgForm, usdToEgp: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">سعر صرف الريال SAR→EGP</label>
              <input
                type="number"
                step="0.1"
                value={cfgForm.sarToEgp}
                onChange={(e) => setCfgForm({ ...cfgForm, sarToEgp: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">معامل التسعير التلقائي (Markup ×)</label>
              <input
                type="number"
                step="0.05"
                value={cfgForm.defaultMarkupMultiplier}
                onChange={(e) => setCfgForm({ ...cfgForm, defaultMarkupMultiplier: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">تكلفة الشحن التقديرية (ج.م)</label>
              <input
                type="number"
                value={cfgForm.defaultShippingEgp}
                onChange={(e) => setCfgForm({ ...cfgForm, defaultShippingEgp: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">متوسط تكلفة الإعلان CPA (ج.م)</label>
              <input
                type="number"
                value={cfgForm.defaultCpaEgp}
                onChange={(e) => setCfgForm({ ...cfgForm, defaultCpaEgp: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-sm"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">
                CJ Dropshipping Access Token {providersCfg?.maskedKeys?.cjAccessToken ? `(${providersCfg.maskedKeys.cjAccessToken})` : ''}
              </label>
              <input
                type="password"
                placeholder="اتركه فارغاً للإبقاء على المفتاح الحالي"
                value={cfgForm.cjAccessToken}
                onChange={(e) => setCfgForm({ ...cfgForm, cjAccessToken: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-xs font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                Knawat API Key {providersCfg?.maskedKeys?.knawatApiKey ? `(${providersCfg.maskedKeys.knawatApiKey})` : ''}
              </label>
              <input
                type="password"
                placeholder="Knawat GCC Consumer Key"
                value={cfgForm.knawatApiKey}
                onChange={(e) => setCfgForm({ ...cfgForm, knawatApiKey: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-xs font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                مخازن (Makhazen) API Key {providersCfg?.maskedKeys?.makhazenApiKey ? `(${providersCfg.maskedKeys.makhazenApiKey})` : ''}
              </label>
              <input
                type="password"
                placeholder="Makhazen Merchant Key"
                value={cfgForm.makhazenApiKey}
                onChange={(e) => setCfgForm({ ...cfgForm, makhazenApiKey: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-xs font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                Bosta API v2 Key {providersCfg?.maskedKeys?.bostaApiKey ? `(${providersCfg.maskedKeys.bostaApiKey})` : ''}
              </label>
              <input
                type="password"
                placeholder="Bosta Authorization Token"
                value={cfgForm.bostaApiKey}
                onChange={(e) => setCfgForm({ ...cfgForm, bostaApiKey: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-xs font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                OTO Gateway Token (Aramex / SMSA) {providersCfg?.maskedKeys?.otoApiKey ? `(${providersCfg.maskedKeys.otoApiKey})` : ''}
              </label>
              <input
                type="password"
                placeholder="OTO Access Token"
                value={cfgForm.otoApiKey}
                onChange={(e) => setCfgForm({ ...cfgForm, otoApiKey: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-xs font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                Taager API Key {providersCfg?.maskedKeys?.taagerApiKey ? `(${providersCfg.maskedKeys.taagerApiKey})` : ''}
              </label>
              <input
                type="password"
                placeholder="Taager Integration Token"
                value={cfgForm.taagerApiKey}
                onChange={(e) => setCfgForm({ ...cfgForm, taagerApiKey: e.target.value })}
                className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600 text-xs font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfigPanel(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black disabled:opacity-50"
            >
              {savingConfig ? 'جاري الحفظ...' : 'حفظ مفاتيح الربط والتسعير'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'import' ? (
        <div className="space-y-5">
          {/* Supplier Provider Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {PROVIDER_TABS.map((prov) => {
              const active = selectedProvider === prov.id;
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => {
                    setSelectedProvider(prov.id);
                    if (prov.id !== 'csv') void handleSearchCatalog(prov.id);
                  }}
                  className={`p-3 rounded-2xl border text-right transition flex flex-col gap-1.5 ${
                    active
                      ? 'bg-primary text-white border-primary shadow-lg scale-[1.02]'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <i className={`fas ${prov.icon} text-lg ${active ? 'text-white' : 'text-primary'}`} />
                  </div>
                  <div className="text-xs font-black leading-tight">{prov.label}</div>
                  <div className={`text-[10px] leading-tight ${active ? 'text-white/85' : 'text-gray-500 dark:text-gray-400'}`}>
                    {prov.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedProvider === 'csv' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    استيراد جماعي لكتالوج الموردين المحليين (CSV / Excel)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ارفع شيت الأسعار من أي مورد جملة أو ورشة — سيُضاف تلقائياً لمتجر Battah مع تفعيل التوجيه المباشر بدون أسعار.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-200"
                  >
                    <i className="fas fa-download text-primary" />
                    <span>تحميل نموذج Excel جاهز</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => csvFileRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black flex items-center gap-2 shadow"
                  >
                    <i className="fas fa-upload" />
                    <span>اختيار ملف CSV / XLSX</span>
                  </button>
                  <input
                    ref={csvFileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleCsvUpload}
                  />
                </div>
              </div>

              {csvPreviewRows.length > 0 && (
                <div className="space-y-3">
                  <div className="overflow-x-auto border dark:border-gray-700 rounded-xl">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="p-2.5">SKU</th>
                          <th className="p-2.5">المنتج</th>
                          <th className="p-2.5">المورد</th>
                          <th className="p-2.5">تكلفة الجملة</th>
                          <th className="p-2.5">سعر البيع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreviewRows.map((row, idx) => (
                          <tr key={idx} className="border-t dark:border-gray-700">
                            <td className="p-2.5 font-mono">{row.sku}</td>
                            <td className="p-2.5 font-bold">{row.name}</td>
                            <td className="p-2.5">{row.supplierName}</td>
                            <td className="p-2.5">{formatCurrency(row.supplierCostEgp)}</td>
                            <td className="p-2.5 font-black text-emerald-600">{formatCurrency(row.sellingPriceEgp)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmBulkCsvImport}
                    disabled={bulkImporting}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black shadow-lg disabled:opacity-50"
                  >
                    {bulkImporting ? 'جاري الاستيراد...' : `تأكيد استيراد ${csvPreviewRows.length} منتج للمتجر الآن`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <i className="fas fa-search absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCatalog()}
                    placeholder="ابحث داخل كتالوج المورد (مثلاً: CarPlay / Smart / LED / Projector)..."
                    className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSearchCatalog()}
                  disabled={searchLoading}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-black flex items-center justify-center gap-2"
                >
                  {searchLoading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-search" />}
                  <span>بحث في كتالوج المورد</span>
                </button>
              </div>

              {searchNote && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <i className="fas fa-info-circle" />
                  <span>{searchNote}</span>
                </div>
              )}

              {/* Catalog Results Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {searchResults.map((item) => {
                  const isWinner = item.codEconomics?.verdict === 'WINNING_PRODUCT';
                  const alreadyInStore = existingSkus.has(String(item.sku || '').toLowerCase());
                  const currentSell = priceOverrides[item.sku] ?? item.suggestedSellingPriceEgp;
                  return (
                    <div
                      key={item.sku}
                      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col"
                    >
                      <div className="relative h-44 bg-slate-100 dark:bg-slate-900">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-black">
                          {item.warehouseRegion}
                        </span>
                        <span
                          className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            isWinner ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-black'
                          }`}
                        >
                          {isWinner ? `منتج رابح ${item.codEconomics?.realNetMarginPct}% ✅` : 'عدّل السعر للربح ⚠️'}
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col gap-3">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                            <span className="font-mono">{item.sku}</span>
                            <span>⏱️ {item.estimatedDeliveryDays}</span>
                          </div>
                          <h4 className="font-black text-sm text-gray-900 dark:text-white line-clamp-2">{item.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-gray-700/40 p-2.5 rounded-xl text-xs">
                          <div>
                            <span className="block text-[10px] text-gray-500">جملة المورد</span>
                            <b className="text-amber-600 dark:text-amber-300">{formatCurrency(item.supplierCostEgp)}</b>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-500">سعر البيع المقترح</span>
                            <input
                              type="number"
                              value={currentSell}
                              onChange={(e) =>
                                setPriceOverrides((prev) => ({
                                  ...prev,
                                  [item.sku]: Number(e.target.value) || item.suggestedSellingPriceEgp,
                                }))
                              }
                              className="w-20 text-center font-black border rounded-lg p-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-500">صافي COD الفعلي</span>
                            <b className="text-emerald-600 dark:text-emerald-400">
                              +{item.codEconomics?.realNetProfitPerDeliveredEgp || 0} ج.م
                            </b>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleImportSingleProduct(item)}
                          disabled={importingSku === item.sku}
                          className={`mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
                            alreadyInStore
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300'
                              : 'bg-primary hover:bg-primary-dark text-white shadow'
                          }`}
                        >
                          {importingSku === item.sku ? (
                            <i className="fas fa-spinner fa-spin" />
                          ) : (
                            <i className={`fas ${alreadyInStore ? 'fa-sync' : 'fa-plus-circle'}`} />
                          )}
                          <span>{alreadyInStore ? 'تحديث المنتج في المتجر' : 'استيراد بضغطة واحدة إلى المتجر'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI Summary Strip */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm">
                <div className="text-xs text-gray-500">إجمالي الطلبات</div>
                <div className="text-2xl font-black mt-1">{summary.totalOrders}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
                <div className="text-xs text-gray-500">تم التسليم</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{summary.delivered}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-rose-200 dark:border-rose-800/40 shadow-sm">
                <div className="text-xs text-gray-500">نسبة المرتجعات</div>
                <div className="text-2xl font-black text-rose-600 mt-1">{summary.returnRatePct}%</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/40 shadow-sm">
                <div className="text-xs text-gray-500">مستحق الموردين</div>
                <div className="text-xl font-black text-amber-600 mt-1">{formatCurrency(summary.supplierPayableEgp)}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm">
                <div className="text-xs text-gray-500">شحن + إعلانات</div>
                <div className="text-xl font-black text-purple-600 mt-1">
                  {formatCurrency((summary.shippingCostEgp || 0) + (summary.adSpendEgp || 0))}
                </div>
              </div>
              <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-md">
                <div className="text-xs text-emerald-100">صافي الربح الفعلي</div>
                <div className="text-2xl font-black mt-1">{formatCurrency(summary.netRealizedProfitEgp)}</div>
              </div>
            </div>
          )}

          {/* Webhook Auto-Tracking Status Strip */}
          <div className="bg-slate-50 dark:bg-gray-800/70 rounded-2xl p-4 border dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="font-black text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <i className="fas fa-satellite-dish text-emerald-500" />
              <span>روابط التتبع التلقائي لشركات الشحن (Webhooks Ready):</span>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[11px]" dir="ltr">
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-700">
                POST /api/webhooks/bosta
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-700">
                POST /api/webhooks/oto
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-700">
                POST /api/webhooks/cj
              </span>
            </div>
          </div>

          {/* Zero-Price Dispatch Output Preview */}
          {dispatchOutput && (
            <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-700 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-sky-900 dark:text-sky-200">
                  ✅ {dispatchOutput.title} — رسالة توريد سرية بدون سعر البيع
                </h4>
                <button
                  type="button"
                  onClick={() => setDispatchOutput(null)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800"
                >
                  إغلاق
                </button>
              </div>
              {dispatchOutput.tracking && (
                <div className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                  رقم البوليصة والتتبع: {dispatchOutput.tracking}{' '}
                  {dispatchOutput.trackingUrl && (
                    <a href={dispatchOutput.trackingUrl} target="_blank" rel="noreferrer" className="underline mr-2">
                      فتح التتبع ↗
                    </a>
                  )}
                </div>
              )}
              <pre className="whitespace-pre-wrap text-xs bg-white dark:bg-gray-900 p-3 rounded-xl border dark:border-gray-700 font-sans">
                {dispatchOutput.text}
              </pre>
              {dispatchOutput.waUrl && (
                <a
                  href={dispatchOutput.waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-black shadow"
                >
                  <i className="fab fa-whatsapp text-base" />
                  <span>إرسال أمر التوريد لواتساب المورد الآن</span>
                </a>
              )}
            </div>
          )}

          {/* Split-Order Multi-Supplier Orders Ledger */}
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center border dark:border-gray-700 text-sm text-gray-500">
                لا توجد طلبات دروبشيبنج حتى الآن — اطلب منتجاً من المتجر (/shop/{storeSlug}) لتظهر الشحنات المقسمة هنا فوراً.
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b dark:border-gray-700">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black text-primary">{ord.refCode}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-xs font-bold">
                          {ord.status}
                        </span>
                        <span className="text-xs text-gray-500">{ord.governorate}</span>
                        {Array.isArray(ord.subOrders) && ord.subOrders.length > 1 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-black">
                            Split-Order × {ord.subOrders.length} موردين
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                        {ord.customerName} ({ord.customerPhone}) — {ord.address}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        التحصيل COD: <b className="text-amber-600">{formatCurrency(ord.totalCodEgp)}</b> · جملة الموردين:{' '}
                        <b>{formatCurrency(ord.supplierCostTotalEgp)}</b> · صافي ربحك المتوقع:{' '}
                        <b className="text-emerald-600">{formatCurrency(ord.netProfitEgp)}</b>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(ord.id, 'delivered')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        تم التسليم ✅
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(ord.id, 'returned')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                      >
                        مرتجع ↩️
                      </button>
                    </div>
                  </div>

                  {/* Sub-Orders Grouped Per Supplier */}
                  {Array.isArray(ord.subOrders) && ord.subOrders.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {ord.subOrders.map((sub: any) => {
                        const subKey = `${ord.id}::${sub.subOrderId}`;
                        const chosenCarrier = subCarrierChoices[subKey] || sub.carrierProvider || 'bosta';
                        return (
                          <div
                            key={sub.subOrderId}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-700 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                                  <span className="font-mono text-primary">{sub.subOrderId}</span>
                                  <span>· {sub.supplierName}</span>
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  المستودع: {sub.warehouseRegion} · الحالة: <b>{sub.status}</b>
                                </div>
                              </div>
                              {sub.trackingNumber && (
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono font-bold">
                                  {sub.trackingNumber}
                                </span>
                              )}
                            </div>

                            <ul className="text-xs space-y-1 bg-white dark:bg-gray-800 p-2 rounded-lg border dark:border-gray-700">
                              {(sub.items || []).map((it: any, idx: number) => (
                                <li key={idx} className="flex justify-between">
                                  <span>
                                    {it.productName} <span className="text-gray-400 font-mono">[{it.sku}]</span>
                                  </span>
                                  <b>×{it.qty}</b>
                                </li>
                              ))}
                            </ul>

                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={chosenCarrier}
                                onChange={(e) =>
                                  setSubCarrierChoices((prev) => ({ ...prev, [subKey]: e.target.value }))
                                }
                                className="flex-1 min-w-[160px] p-2 rounded-lg border text-xs dark:bg-gray-800 dark:border-gray-600 font-bold"
                              >
                                {CARRIER_OPTIONS.map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={dispatchingKey === subKey}
                                onClick={() => handleDispatchSubOrder(ord.id, sub.subOrderId, chosenCarrier)}
                                className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <i className="fas fa-paper-plane" />
                                <span>توجيه والشحن بدون أسعار</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropshippingHub;
