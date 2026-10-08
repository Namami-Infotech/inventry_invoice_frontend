import React from 'react';
import {
  Receipt,
  PlusCircle,
  Package,
  Users,
  Settings,
  Building2,
  Sparkles,
  ChevronRight,
  X,
  LogOut,
  FileSpreadsheet
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  companySetting,
  mobileOpen,
  setMobileOpen,
  currentUser,
  onLogout
}) {
  const navItems = [
    {
      id: 'invoices',
      label: 'Invoices',
      icon: Receipt,
      desc: 'History & Status'
    },
    {
      id: 'items',
      label: 'Items Catalog',
      icon: Package,
      desc: 'HSN/SAC & Rates'
    },
    /* {
      id: 'users',
      label: 'Clients',
      icon: Users,
      desc: 'Manage clients'
    }, */
    {
      id: 'reports',
      label: 'GST Reports',
      icon: FileSpreadsheet,
      desc: 'Sales, HSN & Tax Liability'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      desc: 'Company & Bank'
    }
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden no-print"
        />
      )}

      {/* Sidebar Container with optimized viewport height */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800 no-print lg:translate-x-0 h-screen max-h-screen ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand Header (Sleek h-16 / 64px) */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 flex-shrink-0">
          <div
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => handleNavClick('invoices')}
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span
                  className="font-extrabold text-base tracking-tight text-white truncate max-w-[130px] block"
                  title={companySetting?.companyName || 'GST Portal'}
                >
                  {companySetting?.companyName || 'GST Portal'}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                  GST
                </span>
              </div>
              <p
                className="text-[11px] text-slate-400 truncate max-w-[135px]"
                title={companySetting?.gstin ? `GSTIN: ${companySetting.gstin}` : 'Pro Invoicing'}
              >
                {companySetting?.gstin ? `GSTIN: ${companySetting.gstin}` : (companySetting?.city ? `${companySetting.city}, ${companySetting?.state || ''}` : 'Pro Invoicing')}
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>



        {/* Navigation Links with comfortable compact height */}
        <nav className="flex-1 px-2.5 py-1 space-y-1 overflow-y-auto">
          <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Main Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full h-11 flex items-center justify-between px-3 rounded-xl text-left transition-all ${isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg flex-shrink-0 ${isActive ? 'bg-white/20 text-white' : 'text-slate-400'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-medium leading-tight">{item.label}</div>
                    <div
                      className={`text-[10px] leading-tight truncate ${isActive ? 'text-indigo-200' : 'text-slate-400'
                        }`}
                    >
                      {item.desc}
                    </div>
                  </div>
                </div>

                {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>


        {/* Sidebar Footer */}
        <div className="h-12 px-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <div className="truncate pr-2">
            <p
              className="font-semibold text-slate-300 text-[11px] truncate"
              title={companySetting?.companyName || 'Company Profile'}
            >
              {companySetting?.companyName || 'Company Profile'}
            </p>
            <p className="text-[9px] text-slate-400 truncate">
              {companySetting?.city ? `${companySetting.city}${companySetting?.state ? `, ${companySetting.state}` : ''}` : (companySetting?.state || 'GST Registered')}
            </p>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              onClick={() => handleNavClick('settings')}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Open Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Logout Admin"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
