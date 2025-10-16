import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './lib/firebase';
import { Section, Role } from './types';
import useStore from './lib/store';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import Dashboard from './components/dashboard/Dashboard';
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
import SeedData from './lib/seed';
import Orders from './components/orders/Orders';
import AdminAIChatbot from './components/admin/AdminAIChatbot';


type ViewMode = 'admin' | 'store';

const App: React.FC = () => {
    const { 
      currentUser, 
      isInitialized, 
      isLoading,
      appData,
      fetchInitialData,
      setCurrentUser,
      clearCurrentUser,
      isSeeded,
      checkIfSeeded,
      setProducts,
      setDailySales,
      setEmployees,
      setAdvances,
      setAttendance,
      addPayroll,
      updatePayroll,
      deletePayroll,
      setSuppliers,
      setPurchaseOrders,
      setPayments,
      addExpense,
      updateExpense,
      deleteExpense,
      setDailyReviews,
      addTreasuryTransaction
    } = useStore();

    const [viewMode, setViewMode] = useState<ViewMode>('store');
    const [activeSection, setActiveSection] = useState<Section>(Section.Dashboard);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [activeReport, setActiveReport] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && user.email) {
                if (!isInitialized) {
                    await fetchInitialData();
                }
                const appUser = useStore.getState().appData?.users.find(u => u.username.toLowerCase() === user.email?.toLowerCase());
                if (appUser) {
                  setCurrentUser(appUser);
                } else {
                  clearCurrentUser();
                }
            } else {
                clearCurrentUser();
                if (!isInitialized) {
                  await fetchInitialData(); 
                }
            }
        });
        return () => unsubscribe();
    }, [isInitialized, fetchInitialData, setCurrentUser, clearCurrentUser]);

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
            products, dailySales, employees, advances, attendance, payroll, suppliers,
            purchaseOrders, payments, expenses, treasury, dailyReview
        } = appData;

        if (activeReport === 'inventory') {
            return <InventoryReports setActiveReport={setActiveReport} />;
        }
        switch (activeSection) {
            case Section.Dashboard: return <Dashboard />;
            case Section.Treasury: return <Treasury treasury={treasury} />;
            case Section.DailySales: return <DailySales dailySales={dailySales} setDailySales={setDailySales} products={products} setProducts={setProducts} addTreasuryTransaction={addTreasuryTransaction} currentUser={currentUser} />;
            case Section.StoreManagement: return <Inventory />;
            case Section.Purchasing: return <Purchasing purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} suppliers={suppliers} products={products} setProducts={setProducts} />;
            case Section.Employees: return <Employees employees={employees} setEmployees={setEmployees} />;
            case Section.Advances: return <Advances advances={advances} setAdvances={setAdvances} employees={employees} addTreasuryTransaction={addTreasuryTransaction} />;
            case Section.Attendance: return <Attendance attendance={attendance} setAttendance={setAttendance} employees={employees} />;
            case Section.Payroll: return <Payroll payroll={payroll} addPayroll={addPayroll} updatePayroll={updatePayroll} deletePayroll={deletePayroll} employees={employees} />;
            case Section.Suppliers: return <Suppliers suppliers={suppliers} setSuppliers={setSuppliers} payments={payments} setPayments={setPayments} purchaseOrders={purchaseOrders} addTreasuryTransaction={addTreasuryTransaction} />;
            case Section.Expenses: return <Expenses expenses={expenses} addExpense={addExpense} updateExpense={updateExpense} deleteExpense={deleteExpense} />;
            case Section.DailyReview: return <DailyReview dailyReviews={dailyReview} setDailyReviews={setDailyReviews} />;
            case Section.Reports: return <Reports setActiveReport={setActiveReport} />;
            case Section.Orders: return <Orders />;
            default: return <Dashboard />;
        }
    };
    
    if (!isSeeded) {
        return <SeedData />;
    }

    if (isLoading && !isInitialized) {
        return <div className="flex justify-center items-center min-h-screen">جاري تحميل النظام...</div>;
    }
    
    if (!appData) {
        return <div className="flex justify-center items-center min-h-screen">حدث خطأ أثناء تحميل البيانات.</div>;
    }

    if (viewMode === 'store') {
        return (
            <Storefront 
                setViewMode={setViewMode}
            />
        );
    }

    if (!currentUser) {
        return <LoginModal />;
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
                setActiveSection={setActiveSection}
                hasPermission={hasPermission}
            />
            <main className={`transition-all duration-300 ease-in-out pt-24 pb-8 px-4 sm:px-8 ${isSidebarOpen ? 'lg:mr-72' : 'lg:mr-20'}`}>
                {renderAdminContent()}
            </main>
            <AdminAIChatbot appData={appData} />
        </div>
    );
};

export default App;