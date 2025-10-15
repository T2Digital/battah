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
import AIChatbot from './components/shared/AIChatbot';
import SeedData from './lib/seed';


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
      checkIfSeeded
    } = useStore();

    const [viewMode, setViewMode] = useState<ViewMode>('store');
    const [activeSection, setActiveSection] = useState<Section>(Section.Dashboard);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [activeReport, setActiveReport] = useState<string | null>(null);

    // Check Firebase Auth state on mount
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && user.email) {
                // When auth state is confirmed, fetch all app data
                if (!isInitialized) {
                    await fetchInitialData();
                }
                // After data is fetched, set the current user from our DB
                const appUser = useStore.getState().appData?.users.find(u => u.username.toLowerCase() === user.email?.toLowerCase());
                if (appUser) {
                  setCurrentUser(appUser);
                } else {
                  // User exists in Auth but not in our DB, log them out
                  clearCurrentUser();
                }
            } else {
                // No user logged in Firebase Auth
                clearCurrentUser();
                if (!isInitialized) {
                  await fetchInitialData(); // Still fetch public data like products
                }
            }
        });
        return () => unsubscribe();
    }, [isInitialized, fetchInitialData, setCurrentUser, clearCurrentUser]);

    // Check if DB is seeded
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
        if (activeReport === 'inventory') {
            return <InventoryReports setActiveReport={setActiveReport} />;
        }
        switch (activeSection) {
            case Section.Dashboard: return <Dashboard />;
            case Section.Treasury: return <Treasury />;
            case Section.DailySales: return <DailySales />;
            case Section.Inventory: return <Inventory />;
            case Section.Purchasing: return <Purchasing />;
            case Section.Employees: return <Employees />;
            case Section.Advances: return <Advances />;
            case Section.Attendance: return <Attendance />;
            case Section.Payroll: return <Payroll />;
            case Section.Suppliers: return <Suppliers />;
            case Section.Expenses: return <Expenses />;
            case Section.DailyReview: return <DailyReview />;
            case Section.Reports: return <Reports setActiveReport={setActiveReport} />;
            default: return <Dashboard />;
        }
    };
    
    // MAIN RENDER LOGIC
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
            <>
                <Storefront 
                    setViewMode={setViewMode}
                />
                <AIChatbot />
            </>
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
        </div>
    );
};

export default App;