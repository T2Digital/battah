

import React, { useState, useEffect, useCallback } from 'react';
import { Section, User, Role, ROLES, AppData } from './types';
import { initialData } from './constants';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import Employees from './components/employees/Employees';
import DailySales from './components/sales/DailySales';
import LoginModal from './components/LoginModal';
import Expenses from './components/expenses/Expenses';
import Suppliers from './components/suppliers/Suppliers';
import Advances from './components/advances/Advances';
import Payroll from './components/payroll/Payroll';
import Attendance from './components/attendance/Attendance';
import DailyReview from './components/daily-review/DailyReview';
import Reports from './components/reports/Reports';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>(Section.Dashboard);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // State for all application data
  const [data, setData] = useState<AppData>(() => {
    try {
      const savedData = localStorage.getItem('battahSystemData');
      if (savedData) {
        console.log("📥 Loading data from localStorage.");
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
    }
    return initialData;
  });

  // Effect to sync state with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('battahSystemData', JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save data to localStorage", error);
    }
  }, [data]);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveSection(Section.Dashboard);
  };

  const hasPermission = useCallback((permission: Section) => {
    if (!currentUser) return false;
    const userPermissions = ROLES[currentUser.role];
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(permission);
  }, [currentUser]);


  const renderContent = () => {
    if (!currentUser) return null;

    switch (activeSection) {
      case Section.Dashboard:
        return <Dashboard 
          employees={data.employees} 
          advances={data.advances}
          expenses={data.expenses}
          dailyReview={data.dailyReview}
        />;
      case Section.Employees:
        return <Employees employees={data.employees} setEmployees={(d) => setData(p => ({...p, employees: d}))} />;
      case Section.DailySales:
        return <DailySales 
          dailySales={data.dailySales} 
          // FIX: Handle function updates for SetStateAction to resolve type incompatibility.
          setDailySales={(d) => setData(p => ({...p, dailySales: typeof d === 'function' ? d(p.dailySales) : d}))}
          currentUser={currentUser}
        />;
      case Section.Advances:
        return <Advances 
          advances={data.advances} 
          setAdvances={(d) => setData(p => ({...p, advances: d}))}
          employees={data.employees}
        />;
      case Section.Attendance:
        return <Attendance 
          attendance={data.attendance}
          setAttendance={(d) => setData(p => ({...p, attendance: d}))}
          employees={data.employees}
        />;
      case Section.Payroll:
        return <Payroll 
          payroll={data.payroll}
          setPayroll={(d) => setData(p => ({...p, payroll: d}))}
          employees={data.employees}
        />;
      case Section.Suppliers:
        return <Suppliers 
          suppliers={data.suppliers}
          setSuppliers={(d) => setData(p => ({...p, suppliers: d}))}
          payments={data.payments}
          setPayments={(d) => setData(p => ({...p, payments: d}))}
        />;
      case Section.Expenses:
        return <Expenses expenses={data.expenses} setExpenses={(d) => setData(p => ({...p, expenses: d}))} />;
      case Section.DailyReview:
        return <DailyReview 
          dailyReviews={data.dailyReview}
          setDailyReviews={(d) => setData(p => ({...p, dailyReview: d}))}
        />;
      case Section.Reports:
        return <Reports appData={data}/>;
      default:
        return <Dashboard 
          employees={data.employees} 
          advances={data.advances}
          expenses={data.expenses}
          dailyReview={data.dailyReview}
        />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isSidebarOpen ? 'lg:pr-72' : 'lg:pr-20'}`}>
      {!currentUser && <LoginModal users={data.users} onLogin={handleLogin} />}
      {currentUser && (
        <>
          <Header
            theme={theme}
            toggleTheme={toggleTheme}
            currentUser={currentUser}
            isSidebarOpen={isSidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
          <Sidebar
            isOpen={isSidebarOpen}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            hasPermission={hasPermission}
          />
          <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-8">
            {renderContent()}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
