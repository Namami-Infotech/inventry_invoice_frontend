import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Users,
  Package,
  IndianRupee,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  PlusCircle,
  Building2,
  Sparkles,
  ArrowRight,
  Settings
} from 'lucide-react';
import { invoiceService, itemService, userService } from '../services/api';


export default function Dashboard({ setActiveTab, onSelectInvoice, companySetting }) {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    totalTax: 0,
    totalCgstSgst: 0,
    totalIgst: 0,
    paidCount: 0,
    pendingCount: 0,
    itemsCount: 0,
    usersCount: 0,
    recentInvoices: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [invRes, itemRes, userRes] = await Promise.all([
          invoiceService.getAll(),
          itemService.getAll(),
          userService.getAll()
        ]);

        const invoices = invRes.data.success ? invRes.data.data : [];
        const items = itemRes.data.success ? itemRes.data.data : [];
        const users = userRes.data.success ? userRes.data.data : [];

        let totalRevenue = 0;
        let totalTax = 0;
        let totalCgstSgst = 0;
        let totalIgst = 0;
        let paidCount = 0;
        let pendingCount = 0;

        for (const inv of invoices) {
          totalRevenue += Number(inv.grandTotal) || 0;
          totalTax += Number(inv.totalTax) || 0;
          totalCgstSgst += (Number(inv.totalCgst) || 0) + (Number(inv.totalSgst) || 0);
          totalIgst += Number(inv.totalIgst) || 0;
          if (inv.status === 'PAID') paidCount++;
          if (inv.status === 'PENDING') pendingCount++;
        }

        setStats({
          totalInvoices: invoices.length,
          totalRevenue,
          totalTax,
          totalCgstSgst,
          totalIgst,
          paidCount,
          pendingCount,
          itemsCount: items.length,
          usersCount: users.length,
          recentInvoices: invoices
        });
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-3.5 sm:space-y-4 flex-1 flex flex-col min-h-0 h-full">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3 truncate">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4.5 h-4.5 text-indigo-300" />
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight truncate text-white leading-tight">
                {companySetting?.companyName || 'Namami Enterprises'}
              </h1>
              <span className="px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
                Dual-GST
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-300 mt-1 truncate leading-tight">
              <span>Origin: <strong className="text-white">{companySetting?.state || 'Not Set'}</strong></span>
              {companySetting?.gstin && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="font-mono text-slate-300">GSTIN: <strong className="text-white">{companySetting.gstin}</strong></span>
                </>
              )}
              <span className="text-slate-600 hidden md:inline">•</span>
              <span className="text-indigo-200 hidden md:inline">Intra &rarr; CGST+SGST | Inter &rarr; IGST</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('create-invoice')}
            className="flex items-center space-x-1.5 h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs transition-colors text-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center space-x-1.5 h-9 px-3 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-semibold rounded-lg transition-colors text-xs cursor-pointer"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Invoiced
            </span>
            <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900 font-mono leading-tight">
              ₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">Across {stats.totalInvoices} generated invoices</p>
          </div>
        </div>

        {/* CGST + SGST (Intra-State) */}
        <div className="bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              CGST + SGST (Intra)
            </span>
            <span className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-blue-900 font-mono leading-tight">
              ₹{stats.totalCgstSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">Local supplies in {companySetting?.state || 'State'}</p>
          </div>
        </div>

        {/* IGST (Inter-State) */}
        <div className="bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              IGST (Inter-State)
            </span>
            <span className="p-1.5 rounded-md bg-amber-50 text-amber-600">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-amber-900 font-mono leading-tight">
              ₹{stats.totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">Inter-state outside {companySetting?.state || 'State'}</p>
          </div>
        </div>

        {/* Active Database Entities */}
        <div className="bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Catalogs & Accounts
            </span>
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-center space-x-3.5 mt-2">
            <div>
              <div className="text-lg font-black text-slate-900 leading-none">{stats.itemsCount}</div>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">Items</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div>
              <div className="text-lg font-black text-slate-900 leading-none">{stats.usersCount}</div>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">Users</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices Section (Fills remaining height) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Recent GST Invoices</h3>
          </div>
          <button
            onClick={() => setActiveTab('invoices')}
            className="flex items-center space-x-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <span>View All Invoices</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 bg-slate-50">Invoice #</th>
                <th className="py-2 px-3 bg-slate-50">Customer</th>
                <th className="py-2 px-3 bg-slate-50">Buyer State</th>
                <th className="py-2 px-3 bg-slate-50">Applied GST</th>
                <th className="py-2 px-3 text-right bg-slate-50">Grand Total (₹)</th>
                <th className="py-2 px-3 text-center bg-slate-50">Status</th>
                <th className="py-2 px-3 text-center bg-slate-50">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                    No recent invoices. Click "Create Invoice" above to generate your first bill.
                  </td>
                </tr>
              ) : (
                stats.recentInvoices.slice(0, 8).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-[11px] text-indigo-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900">
                      {inv.customerName}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {inv.customerState}
                    </td>
                    <td className="py-2 px-3">
                      {inv.isSameState ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          CGST + SGST (Intra)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          IGST (Inter-state)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        View & Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer Bar */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-shrink-0">
          <span>Showing latest {Math.min(stats.recentInvoices.length, 8)} of {stats.totalInvoices} invoices</span>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Paid: {stats.paidCount}</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              <span>Pending: {stats.pendingCount}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
