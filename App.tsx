

import React, { useState, useEffect, Suspense } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './lib/firebase';
import { Section, Role } from './types';
import useStore from './lib/store';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import Storefront from './components/store/Storefront';
import SeedData from './lib/seed';
import AdminAIChatbot from './components/admin/AdminAIChatbot';
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
    } = useStore();

    const [viewMode, setViewMode] = useState<ViewMode>('store');
    const [activeSection, setActiveSection] = useState<Section>(Section.Dashboard);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [activeReport, setActiveReport] = useState<string | null>(null);
    
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
                            alert("عذراً، لا يمكن تسجيل الدخول خارج أوقات العمل الرسمية.");
                            await useStore.getState().logout();
                            return;
                        }
                    }
    
                    // IP Check
                    if (settings.enableIPRestriction && settings.allowedIP) {
                        try {
                            const response = await fetch('https://api.ipify.org?format=json');
                            const data = await response.json();
                            if (data.ip !== settings.allowedIP) {
                                alert(`عذراً، لا يمكن تسجيل الدخول من هذا الموقع (${data.ip}). يجب أن تكون في الفرع.`);
                                await useStore.getState().logout();
                                return;
                            }
                        } catch (error) {
                            console.error("IP Check failed", error);
                            alert("فشل التحقق من الموقع. يرجى التأكد من الاتصال بالإنترنت.");
                            await useStore.getState().logout();
                            return;
                        }
                    }
                }
                // User is logged in and passed checks, fetch all admin-specific data.
                initAdminListeners();
            };
            checkRestrictions();
        } else {
            // User logged out, ensure admin listeners are cleared and return to store view.
            clearAdminListeners();
            setViewMode('store');
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

    const renderAdminContent = () => {
        if (!appData || !currentUser) return null;

        const {
            employees = [], advances = [], 
            attendance = [], payroll = [], suppliers = [],
            payments = [], expenses = [], 
            treasury = [],
            purchaseOrders = []
        } = appData;
        
        // Handle Interactive Reports routing
        if (activeSection === Section.Reports) {
            if (activeReport === 'inventory') return <InventoryReports setActiveReport={setActiveReport} />;
            if (activeReport === 'sales') return <SalesReportView setActiveReport={setActiveReport} />;
            if (activeReport === 'employees') return <EmployeesReportView setActiveReport={setActiveReport} />;
            if (activeReport === 'financials') return <FinancialReportView setActiveReport={setActiveReport} />;
            if (activeReport === 'suppliers') return <SuppliersReportView setActiveReport={setActiveReport} />;
            return <Reports setActiveReport={setActiveReport} />;
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
        return <LoginModal />;
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
            />
            <main className={`transition-all duration-300 ease-in-out pt-24 pb-8 px-4 sm:px-8 ${isSidebarOpen ? 'mr-64 sm:mr-72' : 'mr-20'}`}>
                <Suspense fallback={<div className="text-center p-8">جاري تحميل القسم...</div>}>
                    {renderAdminContent()}
                </Suspense>
            </main>
            {currentUser?.role === Role.Admin && <AdminAIChatbot appData={appData} />}
        </div>
    );
};

export default App;