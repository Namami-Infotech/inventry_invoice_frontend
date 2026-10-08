import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Ban,
  RefreshCw,
  IndianRupee,
  Filter,
  Printer,
  Share2
} from 'lucide-react';
import { invoiceService } from '../services/api';
import Pagination from './Pagination';
import DeleteConfirmModal from './DeleteConfirmModal';
import WhatsAppShareModal from './WhatsAppShareModal';
import { formatDateDDMMYYYY } from '../utils/date';

export default function InvoiceList({ onSelectInvoice, onCreateNew, companyState, companySetting }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [shareTarget, setShareTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [summaryStats, setSummaryStats] = useState({
    totalCount: 0,
    totalAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    cancelledCount: 0,
    cancelledAmount: 0
  });

  const fetchSummaryStats = async () => {
    try {
      const res = await invoiceService.getAll('', '');
      if (res.data?.success) {
        const all = res.data.data || [];
        let totalAmount = 0;
        let paidCount = 0;
        let paidAmount = 0;
        let pendingCount = 0;
        let pendingAmount = 0;
        let cancelledCount = 0;
        let cancelledAmount = 0;

        all.forEach((inv) => {
          const amt = Number(inv.grandTotal) || 0;
          totalAmount += amt;
          if (inv.status === 'PAID') {
            paidCount++;
            paidAmount += amt;
          } else if (inv.status === 'PENDING') {
            pendingCount++;
            pendingAmount += amt;
          } else if (inv.status === 'CANCELLED') {
            cancelledCount++;
            cancelledAmount += amt;
          }
        });

        setSummaryStats({
          totalCount: all.length,
          totalAmount,
          paidCount,
          paidAmount,
          pendingCount,
          pendingAmount,
          cancelledCount,
          cancelledAmount
        });
      }
    } catch (err) {
      console.error('Error fetching invoice summary stats:', err);
    }
  };

  useEffect(() => {
    fetchSummaryStats();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await invoiceService.getAll(statusFilter, search);
      if (res.data.success) {
        setInvoices(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 300);
    return () => clearTimeout(timer);
  }, [statusFilter, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const totalItems = invoices.length;
  const paginatedInvoices = invoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await invoiceService.updateStatus(id, newStatus);
      fetchInvoices();
      fetchSummaryStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await invoiceService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchInvoices();
      fetchSummaryStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
    

      {/* Top Stat Summary Cards: Total, Paid, Pending, Cancelled (Compact Height) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Invoices */}
        <div
          onClick={() => setStatusFilter('')}
          className={`bg-white px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between ${
            statusFilter === ''
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
              : 'border-slate-200 hover:border-indigo-200'
          }`}
          title="Filter: All Invoices"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Invoices
            </span>
            <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
              <Receipt className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-lg font-black text-slate-900 font-mono leading-none">
              {summaryStats.totalCount}
            </span>
            <span className="text-xs text-slate-500 font-mono font-medium">
              ₹{summaryStats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Paid Invoices */}
        <div
          onClick={() => setStatusFilter('PAID')}
          className={`bg-white px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between ${
            statusFilter === 'PAID'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-slate-200 hover:border-emerald-200'
          }`}
          title="Filter: Paid Invoices"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Paid Invoices
            </span>
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-lg font-black text-emerald-700 font-mono leading-none">
              {summaryStats.paidCount}
            </span>
            <span className="text-xs text-slate-500 font-mono font-medium">
              ₹{summaryStats.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Pending Invoices */}
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-white px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between ${
            statusFilter === 'PENDING'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
              : 'border-slate-200 hover:border-amber-200'
          }`}
          title="Filter: Pending Invoices"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Pending Invoices
            </span>
            <span className="p-1 rounded-md bg-amber-50 text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-lg font-black text-amber-700 font-mono leading-none">
              {summaryStats.pendingCount}
            </span>
            <span className="text-xs text-slate-500 font-mono font-medium">
              ₹{summaryStats.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Cancelled Invoices */}
        <div
          onClick={() => setStatusFilter('CANCELLED')}
          className={`bg-white px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between ${
            statusFilter === 'CANCELLED'
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
              : 'border-slate-200 hover:border-rose-200'
          }`}
          title="Filter: Cancelled Invoices"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Cancel Invoices
            </span>
            <span className="p-1 rounded-md bg-rose-50 text-rose-600">
              <Ban className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-lg font-black text-rose-700 font-mono leading-none">
              {summaryStats.cancelledCount}
            </span>
            <span className="text-xs text-slate-500 font-mono font-medium">
              ₹{summaryStats.cancelledAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto">
          {['', 'PENDING', 'PAID', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === '' ? 'Active Invoices' : st === 'INACTIVE' ? 'Inactive' : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice #, customer, state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onCreateNew}
            className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4 text-right">Taxable (₹)</th>
                <th className="py-3.5 px-4 text-right">Tax (₹)</th>
                <th className="py-3.5 px-4 text-right font-bold">Total (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    No invoices generated yet. Click "Create New Invoice" to start!
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-xs text-indigo-600">
                        {inv.invoiceNumber}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap font-medium">
                      {formatDateDDMMYYYY(inv.invoiceDate)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{inv.customerName}</div>
                      <div className="text-xs text-slate-400">{inv.customerCity || ''}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700">
                      ₹{Number(inv.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                      ₹{Number(inv.totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{Number(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inv.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : inv.status === 'INACTIVE'
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5 sm:space-x-2">
                        <button
                          onClick={() => setShareTarget(inv)}
                          className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-emerald-200"
                          title="Share Invoice on WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </button>

                        <button
                          onClick={() => onSelectInvoice(inv)}
                          className="flex items-center space-x-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="View / Print / Download A4 PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                        {/* <button
                          onClick={() => setDeleteTarget({ id: inv.id, invoiceNumber: inv.invoiceNumber })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Delete Invoice"
        itemType="invoice"
        itemName={deleteTarget?.invoiceNumber}
        message="Are you sure you want to delete this invoice? The status will be marked as INACTIVE and hidden from active invoices."
        confirmText="Mark Inactive"
      />

      {/* WhatsApp Share Modal */}
      {shareTarget && (
        <WhatsAppShareModal
          isOpen={!!shareTarget}
          invoice={shareTarget}
          companySetting={companySetting}
          onClose={() => setShareTarget(null)}
          onInvoiceUpdate={(updatedInv) => {
            setInvoices((prev) =>
              prev.map((i) => (i.id === updatedInv.id ? { ...i, ...updatedInv } : i))
            );
            setShareTarget((prev) => (prev && prev.id === updatedInv.id ? { ...prev, ...updatedInv } : prev));
          }}
        />
      )}
    </div>
  );
}
