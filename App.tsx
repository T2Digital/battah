

import React, { useState, useEffect, Suspense } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth, setupMessageListener, requestNotificationPermission } from './lib/firebase';
import { Section, Role } from './types';
import useStore from './lib/store';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { bootstrapBattahTenant, resolveTenantBrandId, TenantBrandConfig } from './lib/tenantBootstrap';
import { verifyTenantSession } from './lib/tenantErpSync';
import { getActiveBranches } from './lib/appConfig';

import Storefront from './components/store/Storefront';
import ToastContainer from './components/shared/ToastContainer';

// Lazy load admin shell, auth modal, and heavy report views so the public storefront stays fast
const Sidebar = React.lazy(() => import('./components/Sidebar'));
const Header = React.lazy(() => import('./components/Header'));
const LoginModal = React.lazy(() => import('./components/LoginModal'));
const AdminChatbot = React.lazy(() => import('./components/admin/AdminChatbot'));
const Reports = React.lazy(() => import('./components/reports/Reports'));
const InventoryReports = React.lazy(() => import('./components/reports/InventoryReports'));
const SalesReportView = React.lazy(() => import('./components/reports/SalesReportView'));
const EmployeesReportView = React.lazy(() => import('./components/reports/EmployeesReportView'));
const FinancialReportView = React.lazy(() => import('./components/reports/FinancialReportView'));
const SuppliersReportView = React.lazy(() => import('./components/reports/SuppliersReportView'));
const AccessDenied = React.lazy(() => import('./components/shared/AccessDenied'));

// Lazy load components for code splitting and better performance
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard'));
const SellerDashboard = React.lazy(() => import('./components/dashboard/SellerDashboard'));
const BranchManagerDashboard = React.lazy(() => import('./components/dashboard/BranchManagerDashboard'));
const AccountantDashboard = React.lazy(() => import('./components/dashboard/AccountantDashboard'));
const CashierDashboard = React.lazy(() => import('./components/dashboard/CashierDashboard'));
const Treasury = React.lazy(() => import('./components/treasury/Treasury'));
const DailySales = React.lazy(() => import('./components/sales/DailySales'));
const Inventory = React.lazy(() => import('./components/inventory/Inventory'));
const Purchasing = React.lazy(() => import('./components/purchasing/Purchasing'));
const Employees = React.lazy(() => import('./components/employees/Employees'));
const Advances = React.lazy(() => import('./components/advances/Advances'));
const Attendance = React.lazy(() => import('./components/attendance/Attendance'));
const Payroll = React.lazy(() => import('./components/payroll/Payroll'));
const Suppliers = React.lazy(() => import('./components/suppliers/Suppliers'));
const Expenses = React.lazy(() => import('./components/expenses/Expenses'));
const DailyReview = React.lazy(() => import('./components/daily-review/DailyReview'));
const Orders = React.lazy(() => import('./components/orders/Orders'));
const Customers = React.lazy(() => import('./components/customers/Customers'));
const Promotions = React.lazy(() => import('./components/promotions/Promotions'));
const Settings = React.lazy(() => import('./components/dashboard/Settings'));
const Notifications = React.lazy(() => import('./components/notifications/Notifications'));
const Users = React.lazy(() => import('./components/users/Users'));

type ViewMode = 'admin' | 'store';

const NotificationPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            const hasSeenPrompt = localStorage.getItem('hasSeenNotificationPrompt');
            if (!hasSeenPrompt) {
                // Delay showing the prompt slightly so it's not too aggressive
                const timer = setTimeout(() => setShowPrompt(true), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, []);

    const handleEnable = async () => {
        const token = await requestNotificationPermission();
        if (token) {
            await useStore.getState().saveDeviceToken(token);
            useStore.getState().addToast('تم تفعيل الإشعارات بنجاح', 'success');
        }
        setShowPrompt(false);
        localStorage.setItem('hasSeenNotificationPrompt', 'true');
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('hasSeenNotificationPrompt', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 z-50 border border-gray-200 dark:border-gray-700 animate-fade-in flex flex-col gap-3">
            <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <i className="fas fa-bell text-xl"></i>
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-gray-800 dark:text-white">تفعيل الإشعارات</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">احصل على أحدث العروض وتنبيهات الطلبات فور حدوثها.</p>
                </div>
            </div>
            <div className="flex gap-2 justify-end mt-2">
                <button onClick={handleDismiss} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                    ليس الآن
                </button>
                <button onClick={handleEnable} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition shadow-md">
                    تفعيل الإشعارات
                </button>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const { 
      currentUser, 
      isInitialized, 
      isLoading,
      appData,
      initPublicListeners,
      initAdminListeners,
      clearAdminListeners,
      clearCurrentUser,
      setCurrentUserByEmail,
      addAdvance,
      updateAdvance,
      deleteAdvance,
      setAttendance,
      addPayroll,
      updatePayroll,
      deletePayroll,
      addPayment,
      updatePayment,
      deletePayment,
      addExpense,
      updateExpense,
      deleteExpense,
      setDailyReviews,
    } = useStore();

    const [viewMode, setViewMode] = useState<ViewMode>('store');
    const [activeSection, setActiveSection] = useState<Section>(Section.Dashboard);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [activeReport, setActiveReport] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState<{ reason: 'time' | 'ip', details?: string } | null>(null);
    const [tenantBrand, setTenantBrand] = useState<TenantBrandConfig | null>(null);

    useEffect(() => {
        bootstrapBattahTenant().then((b) => {
            if (b) {
                setTenantBrand(b);
                const catalog = Array.isArray(b.productsCatalog) ? b.productsCatalog : [];
                const currentProducts = useStore.getState().appData?.products || [];
                if (catalog.length > 0 && currentProducts.length === 0) {
                    const hydrated = catalog.map((item: any, idx: number) => {
                        const price = Number(item.numericPrice || String(item.price || '').replace(/[^\d.]/g, '')) || 500;
                        return {
                            id: idx + 1,
                            name: item.name || `منتج ${idx + 1}`,
                            sku: item.sku || `AH-${idx + 101}`,
                            category: item.category || 'قطع غيار',
                            description: item.description || '',
                            purchasePrice: Math.round(price * 0.7),
                            sellingPrice: price,
                            stock: { main: 25, branch1: 10, branch2: 10, branch3: 10 },
                            imageUrl: item.imageUrl || b.logoUrl || ''
                        };
                    });
                    useStore.setState((state) => ({
                        isLoading: false,
                        appData: { ...(state.appData as any), products: hydrated }
                    }));
                } else if (currentProducts.length > 0) {
                    useStore.setState({ isLoading: false });
                }
            }
        });
    }, []);
    
    useEffect(() => {
        const checkPrintHash = async () => {
            const hash = window.location.hash || '';
            const match = hash.match(/^#print-invoice\/(.+)$/);
            if (!match) return;
            const targetId = decodeURIComponent(match[1]);
            const state = useStore.getState();
            let sale = (state.appData?.dailySales || []).find((s: any) => String(s.id) === targetId || String(s.invoiceNumber) === targetId);
            if (!sale) {
                const { resolveTenantBrandId } = await import('./lib/tenantBootstrap');
                const { fetchTenantErpState, getTenantSessionToken } = await import('./lib/tenantErpSync');
                const slug = resolveTenantBrandId();
                if (slug) {
                    const cloud = await fetchTenantErpState(slug, getTenantSessionToken(slug));
                    if (Array.isArray(cloud?.dailySales)) {
                        sale = cloud.dailySales.find((s: any) => String(s.id) === targetId || String(s.invoiceNumber) === targetId);
                    }
                }
            }
            if (sale) {
                const { triggerInvoicePrint } = await import('./lib/reportTemplates');
                triggerInvoicePrint(sale, useStore.getState().appData?.products || [], sale.isTaxable || false);
            }
        };
        checkPrintHash();
        window.addEventListener('hashchange', checkPrintHash);
        return () => window.removeEventListener('hashchange', checkPrintHash);
    }, []);

    useEffect(() => {
        (window as any).printInvoiceFromCardex = async (saleId: number) => {
            const state = useStore.getState();
            if(!state.appData) return;
            const sale = state.appData.dailySales.find(s => s.id === saleId);
            if(sale) {
                const { triggerInvoicePrint } = await import('./lib/reportTemplates');
                triggerInvoicePrint(sale, state.appData.products, sale.isTaxable || false);
            } else {
                alert('عذراً، لم يتم العثور على الفاتورة.');
            }
        };
        return () => {
             delete (window as any).printInvoiceFromCardex;
        };
    }, []);

    // Global barcode scanner handling
    useBarcodeScanner((barcode) => {
        let trimmedCode = barcode.trim();
        // Decode if it contains the URL hash part
        if (trimmedCode.includes('#scan/')) {
            trimmedCode = decodeURIComponent(trimmedCode.split('#scan/')[1]);
        }
        
        console.log("Global physical scanner detected:", trimmedCode);
        
        // Dispatch event that both store and admin screens listen to
        if (viewMode === 'store') {
            window.dispatchEvent(new CustomEvent('scan-store-product', { detail: trimmedCode }));
        } else {
            // For admin views, ensure we are on the DailySales section
            if (activeSection !== Section.DailySales) {
                setActiveSection(Section.DailySales);
                // Give it a tiny delay to mount before dispatching
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('scan-product', { detail: trimmedCode }));
                }, 100);
            } else {
                window.dispatchEvent(new CustomEvent('scan-product', { detail: trimmedCode }));
            }
        }
    });

    // Auto Daily Review Generator
    useEffect(() => {
        if (currentUser?.role === Role.Admin && appData) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const existingReview = appData.dailyReview?.find(r => r.date === yesterdayStr);
            
            if (!existingReview) {
                const yesterdaySales = appData.dailySales?.filter(s => s.date === yesterdayStr) || [];
                const salesCash = yesterdaySales.reduce((sum, s) => {
                    if (s.direction === 'مرتجع') return sum - (s.cashAmount || (s.paymentMethod === 'نقدى' ? s.totalAmount : 0));
                    return sum + (s.cashAmount || (s.paymentMethod === 'نقدى' ? s.totalAmount : 0));
                }, 0);
                const salesElectronic = yesterdaySales.reduce((sum, s) => {
                    if (s.direction === 'مرتجع') return sum - (s.electronicAmount || (s.paymentMethod === 'إلكترونى' ? s.totalAmount : 0));
                    return sum + (s.electronicAmount || (s.paymentMethod === 'إلكترونى' ? s.totalAmount : 0));
                }, 0);
                const totalSales = salesCash + salesElectronic;
                
                const yesterdayExpenses = appData.expenses?.filter(e => e.date.startsWith(yesterdayStr)).reduce((sum, e) => sum + e.amount, 0) || 0;
                
                const yesterdayOrders = appData.orders?.filter(o => o.date.startsWith(yesterdayStr)) || [];
                const onlineOrdersTotal = yesterdayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
                const onlineOrdersCount = yesterdayOrders.length;

                const drawerBalance = salesCash - yesterdayExpenses;

                const defaultReviewBranch = getActiveBranches((appData as any).appCustomization)[0]?.key || 'main';
                const autoReview = {
                    date: yesterdayStr,
                    branch: defaultReviewBranch,
                    salesCash,
                    salesElectronic,
                    totalSales,
                    drawerBalance,
                    expensesTotal: yesterdayExpenses,
                    onlineOrdersTotal,
                    onlineOrdersCount,
                    notes: `تم الإغلاق التلقائي لليوم. إجمالي المبيعات: ${totalSales}، المصروفات: ${yesterdayExpenses}، طلبات الأونلاين: ${onlineOrdersCount}`
                };

                const newId = Math.max(0, ...(appData.dailyReview?.map(r => r.id) || [])) + 1;
                setDailyReviews([...(appData.dailyReview || []), { ...autoReview, id: newId }]);
            }
        }
    }, [currentUser, appData?.dailyReview, appData?.dailySales, appData?.expenses, appData?.orders, setDailyReviews]);

    // This effect runs once to set up public data and auth listening
    useEffect(() => {
        initPublicListeners(); // Load only products and storefront settings for public view.

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && user.email) {
                await setCurrentUserByEmail(user.email);
            } else {
                const brandSlug = resolveTenantBrandId();
                if (brandSlug) {
                    try {
                        const rawSession = localStorage.getItem(`t2_tenant_session_${brandSlug}`);
                        if (rawSession) {
                            const parsed = JSON.parse(rawSession);
                            if (parsed?.token && parsed?.user) {
                                useStore.getState().setCurrentUser(parsed.user);
                                verifyTenantSession(brandSlug, parsed.token).then((result) => {
                                    if (result.unauthorized) {
                                        localStorage.removeItem(`t2_tenant_session_${brandSlug}`);
                                        clearCurrentUser();
                                        clearAdminListeners();
                                    }
                                }).catch(() => {});
                                return;
                            }
                        }
                    } catch {}
                }
                clearCurrentUser();
                clearAdminListeners();
            }
        });

        return () => unsubscribe();
    }, [initPublicListeners, setCurrentUserByEmail, clearCurrentUser, clearAdminListeners]);

    // Reset activeSection when user changes to avoid showing previous user's last screen
    useEffect(() => {
        setActiveSection(Section.Dashboard);
        setActiveReport(null);
    }, [currentUser?.id]);

    // This effect syncs the admin data based on the currentUser state.
    useEffect(() => {
        if (currentUser) {
            const checkRestrictions = async () => {
                const settings = appData?.settings;
                if (settings && currentUser.role !== Role.Admin) {
                    // Time Check
                    if (settings.enableTimeRestriction) {
                        const now = new Date();
                        const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                        if (currentTime < settings.workStartTime || currentTime > settings.workEndTime) {
                            setAccessDenied({ reason: 'time', details: `ساعات العمل: ${settings.workStartTime} - ${settings.workEndTime}` });
                            return;
                        }
                    }
    
                    // IP Check
                    if (settings.enableIPRestriction && settings.allowedIP) {
                        try {
                            const response = await fetch('https://api.ipify.org?format=json');
                            const data = await response.json();
                            if (data.ip !== settings.allowedIP) {
                                setAccessDenied({ reason: 'ip', details: `عنوان IP الخاص بك: ${data.ip}` });
                                return;
                            }
                        } catch (error) {
                            console.error("IP Check failed", error);
                            // In case of failure, we might want to allow or deny based on policy. 
                            // For now, let's assume we allow if we can't check, or maybe show a warning.
                            // But strictly, if restriction is enabled, we should probably deny or retry.
                            // Let's just log it for now.
                        }
                    }
                }
                // User is logged in and passed checks, fetch all admin-specific data.
                setAccessDenied(null);
                initAdminListeners();
            };
            checkRestrictions();
        } else {
            // User logged out, ensure admin listeners are cleared and return to store view.
            clearAdminListeners();
            setViewMode('store');
            setAccessDenied(null);
        }
    }, [currentUser, initAdminListeners, clearAdminListeners, appData?.settings]);


    useEffect(() => {
        const handleHashChange = () => {
            let fullHash = window.location.hash.replace('#', '');
            const [hash, query] = fullHash.split('?');
            console.log('Hash changed to:', hash);

            // Handle Smart Scanning
            if (hash.startsWith('scan/')) {
                const sku = decodeURIComponent(hash.split('/')[1]);
                useStore.getState().setPendingScan(sku);
                
                // Keep the hash without triggering another immediate handleHashChange if not needed
                window.history.replaceState(null, '', window.location.pathname);
                
                if (useStore.getState().currentUser) {
                    setViewMode('admin');
                    setActiveSection(Section.DailySales);
                } else {
                    setViewMode('store');
                    setActiveSection(Section.Dashboard);
                }
                return;
            }

            if (Object.values(Section).includes(hash as Section)) {
                setActiveSection(hash as Section);
            } else {
                setActiveSection(Section.Dashboard);
            }
        };

        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'OPEN_INVOICE' && event.data.saleId) {
                window.location.hash = 'sales?view=' + event.data.saleId;
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('message', handleMessage);
        handleHashChange();

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const updateActiveSection = (section: Section) => {
        setActiveReport(null); // Reset active report when changing main section
        window.location.hash = section;
    };

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
    
    const hasPermission = (permission: Section): boolean => {
        if (currentUser?.role === Role.Admin) return true;
        return currentUser?.permissions.includes(permission) || false;
    };
    
    useEffect(() => {
        const handleNavigation = (e: CustomEvent<Section>) => {
            setActiveSection(e.detail);
        };
        window.addEventListener('navigate-to-section', handleNavigation as EventListener);
        return () => window.removeEventListener('navigate-to-section', handleNavigation as EventListener);
    }, []);

    // Foreground Push Notification Listener
    useEffect(() => {
        const unsubscribe = setupMessageListener((payload: any) => {
            if (payload?.notification) {
                // Show in-app toast
                useStore.getState().addToast(
                    `${payload.notification.title}: ${payload.notification.body}`, 
                    'info'
                );

                // Show system notification (in phone's notification bar)
                if (Notification.permission === 'granted') {
                    navigator.serviceWorker.ready.then((registration) => {
                        registration.showNotification(payload.notification.title, {
                            body: payload.notification.body,
                            icon: '/pwa-192x192.png',
                            badge: '/pwa-192x192.png',
                            data: payload.data
                        });
                    });
                }
            }
        });
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const renderAdminContent = () => {
        if (!appData || !currentUser) return null;

        if (accessDenied) {
            return (
                <AccessDenied 
                    reason={accessDenied.reason} 
                    details={accessDenied.details}
                    onRetry={() => window.location.reload()}
                    onLogout={() => useStore.getState().logout()}
                />
            );
        }

        const {
            employees = [], advances = [], 
            attendance = [], payroll = [], suppliers = [],
            payments = [], expenses = [], 
            treasury = [],
            purchaseOrders = []
        } = appData;
        
        // Handle Interactive Reports routing
        if (activeSection === Section.Reports) {
            if (!hasPermission(Section.Reports)) {
                updateActiveSection(Section.Dashboard);
                return null;
            }
            if (activeReport === 'inventory') return <InventoryReports setActiveReport={setActiveReport} />;
            if (activeReport === 'sales') return <SalesReportView setActiveReport={setActiveReport} />;
            if (activeReport === 'employees') return <EmployeesReportView setActiveReport={setActiveReport} />;
            if (activeReport === 'financials') return <FinancialReportView setActiveReport={setActiveReport} />;
            if (activeReport === 'suppliers') return <SuppliersReportView setActiveReport={setActiveReport} />;
            return <Reports setActiveReport={setActiveReport} />;
        }

        if (activeSection !== Section.Dashboard && !hasPermission(activeSection)) {
            console.log('Redirecting to dashboard because hasPermission is false for', activeSection);
            updateActiveSection(Section.Dashboard);
            return null;
        }

        switch (activeSection) {
            case Section.Dashboard:
                switch (currentUser.role) {
                    case Role.Admin:
                        return <Dashboard setActiveSection={updateActiveSection} />;
                    case Role.Seller:
                        return <SellerDashboard currentUser={currentUser} setActiveSection={updateActiveSection} />;
                    case Role.BranchManager:
                        return <BranchManagerDashboard currentUser={currentUser} appData={appData} />;
                    case Role.Accountant:
                        return <AccountantDashboard appData={appData} />;
                    case Role.Cashier:
                        return <CashierDashboard currentUser={currentUser} setActiveSection={updateActiveSection} />;
                    default:
                        return <Dashboard setActiveSection={updateActiveSection} />;
                }
            case Section.Treasury: return <Treasury treasury={treasury} />;
            case Section.DailySales: return <DailySales currentUser={currentUser} />;
            case Section.StoreManagement: return <Inventory />;
            case Section.Purchasing: return <Purchasing />;
            case Section.Employees: return <Employees employees={employees} />;
            case Section.Advances: return <Advances advances={advances} addAdvance={addAdvance} updateAdvance={updateAdvance} deleteAdvance={deleteAdvance} employees={employees} />;
            case Section.Attendance: return <Attendance attendance={attendance} setAttendance={setAttendance} employees={employees} />;
            case Section.Payroll: return <Payroll payroll={payroll} addPayroll={addPayroll} updatePayroll={updatePayroll} deletePayroll={deletePayroll} employees={employees} />;
            case Section.Suppliers: return <Suppliers suppliers={suppliers} payments={payments} addPayment={addPayment} updatePayment={updatePayment} deletePayment={deletePayment} purchaseOrders={purchaseOrders} />;
            case Section.Expenses: return <Expenses expenses={expenses} addExpense={addExpense} updateExpense={updateExpense} deleteExpense={deleteExpense} />;
            case Section.DailyReview: return <DailyReview />;
            case Section.Orders: return <Orders />;
            case Section.Customers: return <Customers />;
            case Section.Promotions: return <Promotions />;
            case Section.Settings: return <Settings />;
            case Section.Notifications: return <Notifications />;
            case Section.Users: return <Users />;
            default: return <Dashboard setActiveSection={updateActiveSection} />;
        }
    };
    
    if (viewMode === 'store') {
        return (
            <>
                <Storefront setViewMode={setViewMode} />
                <NotificationPrompt />
            </>
        );
    }

    // --- Admin View Logic ---
    if (!currentUser) {
        return (
            <Suspense fallback={<div className="flex justify-center items-center min-h-screen font-cairo">جاري تحميل بوابة الدخول...</div>}>
                <LoginModal setViewMode={setViewMode} />
                <NotificationPrompt />
            </Suspense>
        );
    }

    if (isLoading || !isInitialized || !appData) {
        return <div className="flex justify-center items-center min-h-screen">جاري تحميل النظام...</div>;
    }

    return (
        <div className="bg-slate-100 dark:bg-gray-900 min-h-screen font-cairo">
            {tenantBrand && (
                <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between border-b border-cyan-500/30" dir="rtl">
                    <div className="flex items-center gap-3">
                        {tenantBrand.logoUrl && (
                            <img src={tenantBrand.logoUrl} alt={tenantBrand.name} className="w-8 h-8 rounded-lg object-cover border border-cyan-400" />
                        )}
                        <div>
                            <div className="text-sm font-black">{tenantBrand.name}</div>
                            {tenantBrand.slogan && <div className="text-[11px] text-cyan-300">{tenantBrand.slogan}</div>}
                        </div>
                    </div>
                    {tenantBrand.phone && (
                        <a href={`https://wa.me/${tenantBrand.whatsapp || tenantBrand.phone}`} target="_blank" rel="noreferrer" className="text-xs bg-emerald-500 text-black font-black px-3 py-1 rounded-lg">
                            💬 واتساب: {tenantBrand.phone}
                        </a>
                    )}
                </div>
            )}
            <ToastContainer />
            <NotificationPrompt />
            <Suspense fallback={null}>
                <Header
                    toggleSidebar={toggleSidebar}
                    isSidebarOpen={isSidebarOpen}
                    setViewMode={setViewMode}
                />
                <Sidebar
                    isOpen={isSidebarOpen}
                    activeSection={activeSection}
                    setActiveSection={updateActiveSection}
                    hasPermission={hasPermission}
                    onClose={() => setSidebarOpen(false)}
                />
            </Suspense>
            <main className={`transition-all duration-300 ease-in-out pt-24 pb-8 px-4 sm:px-8 ${isSidebarOpen ? 'sm:mr-72' : 'sm:mr-20'}`}>
                <Suspense fallback={<div className="text-center p-8">جاري تحميل القسم...</div>}>
                    {renderAdminContent()}
                </Suspense>
            </main>
            {currentUser?.role === Role.Admin && (
                <Suspense fallback={null}>
                    <AdminChatbot />
                </Suspense>
            )}
        </div>
    );
};

export default App;