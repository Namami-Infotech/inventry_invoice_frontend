import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ItemModule from './components/ItemModule';
// import UserModule from './components/UserModule';
import ReportModule from './components/ReportModule';
import SettingModule from './components/SettingModule';
import InvoiceCreate from './components/InvoiceCreate';
import InvoiceList from './components/InvoiceList';
import InvoiceViewModal from './components/InvoiceViewModal';
import Login from './components/Login';
import { settingService, invoiceService, authService } from './services/api';

const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#4f46e5'
    },
    secondary: {
      main: '#10b981'
    }
  },
  typography: {
    fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(',')
  }
});

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState('invoices');
  const [companySetting, setCompanySetting] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load company settings
  const fetchSettings = async () => {
    try {
      const res = await settingService.get();
      if (res.data.success) {
        setCompanySetting(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Dynamically update browser tab title from company settings
  useEffect(() => {
    if (companySetting?.companyName) {
      document.title = `${companySetting.companyName} - Dual-GST Tax Invoice Engine`;
      try {
        localStorage.setItem('company_name', companySetting.companyName);
      } catch (err) { }
    }
  }, [companySetting]);

  const handleInvoiceCreated = () => {
    setViewingInvoice(null);
    setActiveTab('invoices');
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      const res = await invoiceService.updateStatus(invoiceId, newStatus);
      if (res.data.success) {
        setViewingInvoice(res.data.data);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // If not logged in, enforce Admin Login screen
  if (!currentUser) {
    return (
      <ThemeProvider theme={muiTheme}>
        <Login
          onLoginSuccess={(user) => setCurrentUser(user)}
          companySetting={companySetting}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex">
        {/* Left Fixed Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          companySetting={companySetting}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Right Main Content Panel (offset by sidebar width on lg screens) */}
        <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0 no-print print:hidden">
          {/* Top Header Bar */}
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            companySetting={companySetting}
            setMobileOpen={setMobileOpen}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          {/* Main Views Container */}
          <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl no-print print:hidden">
            {activeTab === 'invoices' && (
              <InvoiceList
                onSelectInvoice={(inv) => setViewingInvoice(inv)}
                onCreateNew={() => setActiveTab('create-invoice')}
                companyState={companySetting?.state}
                companySetting={companySetting}
              />
            )}

            {activeTab === 'create-invoice' && (
              <InvoiceCreate
                companySetting={companySetting}
                onInvoiceCreated={handleInvoiceCreated}
                onCancel={() => setActiveTab('invoices')}
              />
            )}

            {activeTab === 'items' && <ItemModule />}

            {/* {activeTab === 'users' && (
              <UserModule companyState={companySetting?.state} />
            )} */}

            {activeTab === 'reports' && (
              <ReportModule companySetting={companySetting} />
            )}

            {activeTab === 'settings' && (
              <SettingModule
                onSettingsUpdated={(updated) => setCompanySetting(updated)}
              />
            )}
          </main>
        </div>

        {/* Modal for Viewing & Printing Tax Invoice */}
        {viewingInvoice && (
          <InvoiceViewModal
            invoice={viewingInvoice}
            companySetting={companySetting}
            onClose={() => setViewingInvoice(null)}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </ThemeProvider>
  );
}
