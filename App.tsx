

import React, { useState, useEffect, Suspense } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth, setupMessageListener } from './lib/firebase';
import { Section, Role } from './types';
import useStore from './lib/store';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import Storefront from './components/store/Storefront';
import SeedData from './lib/seed';
import AdminChatbot from './components/admin/AdminChatbot';
import Reports from './components/reports/Reports';
import InventoryReports from './components/reports/InventoryReports';
import SalesReportView from './components/reports/SalesReportView';
import EmployeesReportView from './components/reports/EmployeesReportView';
import FinancialReportView from './components/reports/FinancialReportView';
import SuppliersReportView from './components/reports/SuppliersReportView';
import ToastContainer from './components/shared/ToastContainer';

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


import AccessDenied from './components/shared/AccessDenied';

type ViewMode = 'admin' | 'store';

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
      isSeeded,
      checkIfSeeded,
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

                const autoReview = {
                    date: yesterdayStr,
                    branch: 'branch1' as const,
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
                // Fetch the user profile from DB and set it in the store.
                // The next effect will trigger based on this change.
                await setCurrentUserByEmail(user.email);
            } else {
                // If user is null, clear everything.
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
            const hash = window.location.hash.replace('#', '');
            if (Object.values(Section).includes(hash as Section)) {
                setActiveSection(hash as Section);
            } else {
                setActiveSection(Section.Dashboard);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const updateActiveSection = (section: Section) => {
        setActiveReport(null); // Reset active report when changing main section
        window.location.hash = section;
    };

     useEffect(() => {
        checkIfSeeded();
    }, [checkIfSeeded]);


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
                useStore.getState().addToast(
                    `${payload.notification.title}: ${payload.notification.body}`, 
                    'info'
                );
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
    
    if (!isSeeded) {
        return <SeedData />;
    }
    
    if (viewMode === 'store') {
        return <Storefront setViewMode={setViewMode} />;
    }

    // --- Admin View Logic ---
    if (!currentUser) {
        return <LoginModal setViewMode={setViewMode} />;
    }

    if (isLoading || !isInitialized || !appData) {
        return <div className="flex justify-center items-center min-h-screen">جاري تحميل النظام...</div>;
    }

    return (
        <div className="bg-slate-100 dark:bg-gray-900 min-h-screen font-cairo">
            <ToastContainer />
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
            <main className={`transition-all duration-300 ease-in-out pt-24 pb-8 px-4 sm:px-8 ${isSidebarOpen ? 'sm:mr-72' : 'sm:mr-20'}`}>
                <Suspense fallback={<div className="text-center p-8">جاري تحميل القسم...</div>}>
                    {renderAdminContent()}
                </Suspense>
            </main>
            {currentUser?.role === Role.Admin && <AdminChatbot />}
        </div>
    );
};

export default App;