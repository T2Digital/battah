import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './lib/firebase';
import { Section, Role } from './types';
import useStore from './lib/store';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import Dashboard from './components/dashboard/Dashboard';
import SellerDashboard from './components/dashboard/SellerDashboard';
import BranchManagerDashboard from './components/dashboard/BranchManagerDashboard';
import AccountantDashboard from './components/dashboard/AccountantDashboard';
import Treasury from './components/treasury/Treasury';
import DailySales from './components/sales/DailySales';
import Inventory from './components/inventory/Inventory';
import Purchasing from './components/purchasing/Purchasing';
import Employees from './components/employees/Employees';
import Advances from './components/advances/Advances';
import Attendance from './components/attendance/Attendance';
import Payroll from './components/payroll/Payroll';
import Suppliers from './components/suppliers/Suppliers';
import Expenses from './components/expenses/Expenses';
import DailyReview from './components/daily-review/DailyReview';
import Reports from './components/reports/Reports';
import InventoryReports from './components/reports/InventoryReports';
import Storefront from './components/store/Storefront';
import SeedData from './lib/seed.ts';
import Orders from './components/orders/Orders';
import AdminAIChatbot from './components/admin/AdminAIChatbot';


type ViewMode = 'admin' | 'store';

const App: React.FC = () => {
    const { 
      currentUser, 
      isInitialized, 
      isLoading,
      appData,
      initRealtimeListeners,
      clearCurrentUser,
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
    
    useEffect(() => {
        // On user logout, always return to the store view.
        if (!currentUser) {
            setViewMode('store');
        }
    }, [currentUser]);

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
        window.location.hash = section;
    };


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                if (!useStore.getState().isInitialized) {
                    initRealtimeListeners();
                }
            } else {
                clearCurrentUser();
            }
        });
        return () => unsubscribe();
    }, [initRealtimeListeners, clearCurrentUser]);

     useEffect(() => {
        checkIfSeeded();
    }, [checkIfSeeded]);


    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
    
    const hasPermission = (permission: Section): boolean => {
        if (currentUser?.role === Role.Admin) return true;
        return currentUser?.permissions.includes(permission) || false;
    };
    
    const renderAdminContent = () => {
        if (!appData || !currentUser) return null;

        const {
            employees = [], advances = [], 
            attendance = [], payroll = [], suppliers = [],
            payments = [], expenses = [], 
            treasury = [],
            purchaseOrders = []
        } = appData;

        if (activeReport === 'inventory') {
            return <InventoryReports setActiveReport={setActiveReport} />;
        }
        switch (activeSection) {
            case Section.Dashboard:
                switch (currentUser.role) {
                    case Role.Admin:
                        return <Dashboard />;
                    case Role.Seller:
                        return <SellerDashboard currentUser={currentUser} setActiveSection={updateActiveSection} />;
                    case Role.BranchManager:
                        return <BranchManagerDashboard currentUser={currentUser} appData={appData} />;
                    case Role.Accountant:
                        return <AccountantDashboard appData={appData} />;
                    default:
                        return <Dashboard />;
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
            case Section.Reports: return <Reports setActiveReport={setActiveReport} />;
            case Section.Orders: return <Orders />;
            default: return <Dashboard />;
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
                {renderAdminContent()}
            </main>
            {currentUser?.role === Role.Admin && <AdminAIChatbot appData={appData} />}
        </div>
    );
};

export default App;
