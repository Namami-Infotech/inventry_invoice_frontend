import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Search,
  Filter,
  FileText,
  TrendingUp,
  Layers,
  Building,
  CheckCircle2,
  RefreshCw,
  Hash,
  ChevronRight,
  Package,
  Receipt
} from 'lucide-react';
import { invoiceService } from '../services/api';
import { formatDateDDMonYYYY } from '../utils/date';

// Format Indian Currency
const formatINR = (val) => {
  const num = Number(val) || 0;
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format Number with 2 decimals
const formatDec = (val) => {
  const num = Number(val) || 0;
  return num.toFixed(2);
};

export default function ReportModule({ companySetting }) {
  const [activeReportTab, setActiveReportTab] = useState('sales'); // 'sales' | 'hsn' | 'liability'

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_fy' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch invoices from backend
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await invoiceService.getAll();

      console.log(res);
      if (res.data.success) {
        setInvoices(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load invoices for reports:', err);
      setError('Failed to fetch invoice data for reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Set date ranges when preset changes
  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    if (datePreset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (datePreset === 'this_month') {
      const start = new Date(y, m, 1).toISOString().split('T')[0];
      const end = new Date(y, m + 1, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (datePreset === 'last_month') {
      const start = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (datePreset === 'this_quarter') {
      const qMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, qMonth, 1).toISOString().split('T')[0];
      const end = new Date(y, qMonth + 3, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (datePreset === 'this_fy') {
      // Indian FY starts April 1st
      const fyStartYear = m >= 3 ? y : y - 1;
      const start = `${fyStartYear}-04-01`;
      const end = `${fyStartYear + 1}-03-31`;
      setStartDate(start);
      setEndDate(end);
    }
  }, [datePreset]);

  // Filter invoices based on date and search query
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Exclude INACTIVE / deleted
      if (inv.status === 'INACTIVE') return false;

      // Date filtering
      if (startDate && inv.invoiceDate < startDate) return false;
      if (endDate && inv.invoiceDate > endDate) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const numMatch = inv.invoiceNumber?.toLowerCase().includes(q);
        const nameMatch = inv.customerName?.toLowerCase().includes(q);
        const gstinMatch = inv.customerGstin?.toLowerCase().includes(q);
        const stateMatch = inv.customerState?.toLowerCase().includes(q);
        const itemMatch = inv.items?.some(it =>
          it.itemName?.toLowerCase().includes(q) ||
          it.hsnSac?.toLowerCase().includes(q)
        );
        if (!numMatch && !nameMatch && !gstinMatch && !stateMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, startDate, endDate, searchTerm]);

  // ==========================================
  // 1. GST SALES REPORT COMPUTATION
  // ==========================================
  const salesSummary = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let totalTax = 0;
    let grandTotal = 0;

    for (const inv of filteredInvoices) {
      taxable += Number(inv.subtotal) || 0;
      cgst += Number(inv.totalCgst) || 0;
      sgst += Number(inv.totalSgst) || 0;
      igst += Number(inv.totalIgst) || 0;
      totalTax += Number(inv.totalTax) || 0;
      grandTotal += Number(inv.grandTotal) || 0;
    }

    return {
      count: filteredInvoices.length,
      taxable,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal
    };
  }, [filteredInvoices]);

  // ==========================================
  // 2. HSN/SAC SUMMARY COMPUTATION (Table 12)
  // ==========================================
  const hsnSummaryData = useMemo(() => {
    const map = new Map();

    for (const inv of filteredInvoices) {
      if (!inv.items || !inv.items.length) continue;

      for (const item of inv.items) {
        const key = `${item.hsnSac || 'OTHER'}_${item.unit || 'PCS'}`;

        if (!map.has(key)) {
          map.set(key, {
            hsnSac: item.hsnSac || 'OTHER',
            description: item.itemName || 'Goods',
            uqc: item.unit || 'PCS',
            totalQty: 0,
            totalValue: 0,
            taxableValue: 0,
            igstAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            totalTax: 0,
            gstRate: item.gstRate || 0
          });
        }

        const rec = map.get(key);
        const qty = Number(item.qty) || 0;
        const taxable = Number(item.taxableAmount) || 0;
        const cgst = Number(item.cgstAmount) || 0;
        const sgst = Number(item.sgstAmount) || 0;
        const igst = Number(item.igstAmount) || 0;
        const tax = cgst + sgst + igst;
        const val = Number(item.totalAmount) || (taxable + tax);

        rec.totalQty += qty;
        rec.taxableValue += taxable;
        rec.cgstAmount += cgst;
        rec.sgstAmount += sgst;
        rec.igstAmount += igst;
        rec.totalTax += tax;
        rec.totalValue += val;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.hsnSac.localeCompare(b.hsnSac));
  }, [filteredInvoices]);

  const hsnTotals = useMemo(() => {
    return hsnSummaryData.reduce(
      (acc, h) => {
        acc.totalQty += h.totalQty;
        acc.totalValue += h.totalValue;
        acc.taxableValue += h.taxableValue;
        acc.cgstAmount += h.cgstAmount;
        acc.sgstAmount += h.sgstAmount;
        acc.igstAmount += h.igstAmount;
        acc.totalTax += h.totalTax;
        return acc;
      },
      {
        totalQty: 0,
        totalValue: 0,
        taxableValue: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0
      }
    );
  }, [hsnSummaryData]);

  // ==========================================
  // 3. GST SUMMARY / TAX LIABILITY COMPUTATION
  // ==========================================
  const taxLiabilityData = useMemo(() => {
    const rateMap = new Map();
    // Prepopulate common Indian GST rates
    [0, 5, 12, 18, 28].forEach(r => {
      rateMap.set(r, {
        rate: r,
        intraTaxable: 0,
        cgst: 0,
        sgst: 0,
        interTaxable: 0,
        igst: 0,
        totalTaxable: 0,
        totalTax: 0
      });
    });

    for (const inv of filteredInvoices) {
      if (!inv.items || !inv.items.length) continue;

      for (const item of inv.items) {
        const rate = Number(item.gstRate) || 0;
        if (!rateMap.has(rate)) {
          rateMap.set(rate, {
            rate,
            intraTaxable: 0,
            cgst: 0,
            sgst: 0,
            interTaxable: 0,
            igst: 0,
            totalTaxable: 0,
            totalTax: 0
          });
        }

        const row = rateMap.get(rate);
        const taxable = Number(item.taxableAmount) || 0;
        const cgst = Number(item.cgstAmount) || 0;
        const sgst = Number(item.sgstAmount) || 0;
        const igst = Number(item.igstAmount) || 0;

        if (igst > 0) {
          row.interTaxable += taxable;
          row.igst += igst;
        } else {
          row.intraTaxable += taxable;
          row.cgst += cgst;
          row.sgst += sgst;
        }

        row.totalTaxable += taxable;
        row.totalTax += (cgst + sgst + igst);
      }
    }

    // Filter out slabs with 0 activity, or keep 5, 12, 18, 28
    return Array.from(rateMap.values())
      .filter(r => r.totalTaxable > 0 || [5, 12, 18].includes(r.rate))
      .sort((a, b) => a.rate - b.rate);
  }, [filteredInvoices]);

  const liabilityTotals = useMemo(() => {
    return taxLiabilityData.reduce(
      (acc, r) => {
        acc.intraTaxable += r.intraTaxable;
        acc.cgst += r.cgst;
        acc.sgst += r.sgst;
        acc.interTaxable += r.interTaxable;
        acc.igst += r.igst;
        acc.totalTaxable += r.totalTaxable;
        acc.totalTax += r.totalTax;
        return acc;
      },
      {
        intraTaxable: 0,
        cgst: 0,
        sgst: 0,
        interTaxable: 0,
        igst: 0,
        totalTaxable: 0,
        totalTax: 0
      }
    );
  }, [taxLiabilityData]);


  // ==========================================
  // EXPORT UTILITIES (CSV & JSON)
  // ==========================================
  const downloadCSV = (filename, rows) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map(item => `"${String(item ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export 1: GST Sales Register CSV
  const exportSalesCSV = () => {
    const header = [
      'Sl No',
      'Invoice No',
      'Invoice Date',
      'Customer Name',
      'Customer GSTIN',
      'Place of Supply',
      'State Code',
      'Supply Type',
      'Taxable Value',
      'CGST Amount',
      'SGST Amount',
      'IGST Amount',
      'Total Tax',
      'Invoice Value',
      'Status'
    ];
    const data = filteredInvoices.map((inv, idx) => [
      idx + 1,
      inv.invoiceNumber,
      inv.invoiceDate,
      inv.customerName,
      inv.customerGstin || 'URP',
      inv.customerState,
      inv.customerStateCode || '',
      Number(inv.totalIgst) > 0 ? 'Inter-State' : 'Intra-State',
      formatDec(inv.subtotal),
      formatDec(inv.totalCgst),
      formatDec(inv.totalSgst),
      formatDec(inv.totalIgst),
      formatDec(inv.totalTax),
      formatDec(inv.grandTotal),
      inv.status
    ]);
    data.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      formatDec(salesSummary.taxable),
      formatDec(salesSummary.cgst),
      formatDec(salesSummary.sgst),
      formatDec(salesSummary.igst),
      formatDec(salesSummary.totalTax),
      formatDec(salesSummary.grandTotal),
      ''
    ]);
    downloadCSV(`GST_Sales_Report_${startDate || 'all'}_to_${endDate || 'all'}.csv`, [header, ...data]);
  };

  // Export 2: HSN Summary CSV
  const exportHsnCSV = () => {
    const header = [
      'Sl No',
      'HSN/SAC',
      'Description',
      'UQC',
      'Total Qty',
      'Total Value',
      'Taxable Value',
      'Integrated Tax (IGST)',
      'Central Tax (CGST)',
      'State/UT Tax (SGST)',
      'Cess',
      'Total Tax'
    ];
    const data = hsnSummaryData.map((h, idx) => [
      idx + 1,
      h.hsnSac,
      h.description,
      h.uqc,
      h.totalQty,
      formatDec(h.totalValue),
      formatDec(h.taxableValue),
      formatDec(h.igstAmount),
      formatDec(h.cgstAmount),
      formatDec(h.sgstAmount),
      '0.00',
      formatDec(h.totalTax)
    ]);
    data.push([
      'TOTAL',
      '',
      '',
      '',
      hsnTotals.totalQty,
      formatDec(hsnTotals.totalValue),
      formatDec(hsnTotals.taxableValue),
      formatDec(hsnTotals.igstAmount),
      formatDec(hsnTotals.cgstAmount),
      formatDec(hsnTotals.sgstAmount),
      '0.00',
      formatDec(hsnTotals.totalTax)
    ]);
    downloadCSV(`HSN_SAC_Summary_${startDate || 'all'}_to_${endDate || 'all'}.csv`, [header, ...data]);
  };

  // Export 3: Tax Liability CSV
  const exportLiabilityCSV = () => {
    const header = [
      'Rate Slab (%)',
      'Intra-State Taxable',
      'CGST Amount',
      'SGST Amount',
      'Inter-State Taxable',
      'IGST Amount',
      'Total Taxable Turnover',
      'Total Tax Liability'
    ];
    const data = taxLiabilityData.map(r => [
      `${r.rate}%`,
      formatDec(r.intraTaxable),
      formatDec(r.cgst),
      formatDec(r.sgst),
      formatDec(r.interTaxable),
      formatDec(r.igst),
      formatDec(r.totalTaxable),
      formatDec(r.totalTax)
    ]);
    data.push([
      'TOTAL',
      formatDec(liabilityTotals.intraTaxable),
      formatDec(liabilityTotals.cgst),
      formatDec(liabilityTotals.sgst),
      formatDec(liabilityTotals.interTaxable),
      formatDec(liabilityTotals.igst),
      formatDec(liabilityTotals.totalTaxable),
      formatDec(liabilityTotals.totalTax)
    ]);
    downloadCSV(`GST_Tax_Liability_${startDate || 'all'}_to_${endDate || 'all'}.csv`, [header, ...data]);
  };



  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* 3 MAIN REPORT SELECTOR TABS */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveReportTab('sales')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeReportTab === 'sales'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Receipt className="w-4 h-4" />
            <span>1. GST Sales Report</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${activeReportTab === 'sales' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
              {filteredInvoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab('hsn')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeReportTab === 'hsn'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Package className="w-4 h-4" />
            <span>2. HSN/SAC Summary</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${activeReportTab === 'hsn' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
              {hsnSummaryData.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab('liability')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeReportTab === 'liability'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>3. GST Summary / Tax Liability</span>
          </button>

        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          {activeReportTab === 'sales' && (
            <button
              onClick={exportSalesCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          {activeReportTab === 'hsn' && (
            <button
              onClick={exportHsnCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Table 12 CSV</span>
            </button>
          )}

          {activeReportTab === 'liability' && (
            <button
              onClick={exportLiabilityCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Liability CSV</span>
            </button>
          )}


          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        {/* Left: Date Presets & Custom Range */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Period:</span>
          </div>

          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_fy">This Financial Year (FY 26-27)</option>
            <option value="custom">Custom Range</option>
          </select>

          {datePreset === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Right: Search Filter & Refresh */}
        <div className="flex items-center space-x-2 flex-1 sm:flex-initial justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search inv #, customer, HSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <button
            onClick={fetchInvoices}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block mb-4 p-4 border border-black text-black">
        <div className="text-center pb-2 border-b border-black">
          <h2 className="text-lg font-bold uppercase">{companySetting?.companyName || 'TAX INVOICE COMPLIANCE'}</h2>
          <p className="text-xs">{companySetting?.fullAddress || ''}</p>
          <p className="text-xs">GSTIN: {companySetting?.gstin || ''} | State: {companySetting?.state || ''}</p>
        </div>
        <div className="pt-2 flex justify-between text-xs">
          <div>
            <strong>Report:</strong>{' '}
            {activeReportTab === 'sales' && 'GST Sales Report (Outward Supplies Register)'}
            {activeReportTab === 'hsn' && 'HSN/SAC Summary (Table 12)'}
            {activeReportTab === 'liability' && 'GST Summary / Tax Output Liability'}
          </div>
          <div>
            <strong>Period:</strong> {startDate || 'All'} to {endDate || 'All'}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* REPORT 1: GST SALES REPORT (Sales Register) */}
      {/* ============================================================== */}
      {activeReportTab === 'sales' && (
        <div className="space-y-4">
          {/* Sales Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invoices Count</span>
              <p className="text-lg font-black text-slate-800 mt-1 font-mono">{salesSummary.count}</p>
              <span className="text-[10px] text-slate-500">Total bills issued</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taxable Sales</span>
              <p className="text-lg font-black text-indigo-600 mt-1 font-mono">{formatINR(salesSummary.taxable)}</p>
              <span className="text-[10px] text-slate-500">Base turnover</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Output CGST</span>
              <p className="text-lg font-black text-slate-700 mt-1 font-mono">{formatINR(salesSummary.cgst)}</p>
              <span className="text-[10px] text-slate-500">Central tax</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Output SGST</span>
              <p className="text-lg font-black text-slate-700 mt-1 font-mono">{formatINR(salesSummary.sgst)}</p>
              <span className="text-[10px] text-slate-500">State / UT tax</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Output IGST</span>
              <p className="text-lg font-black text-purple-600 mt-1 font-mono">{formatINR(salesSummary.igst)}</p>
              <span className="text-[10px] text-slate-500">Inter-state tax</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Total Invoice Value</span>
              <p className="text-lg font-black text-emerald-700 mt-1 font-mono">{formatINR(salesSummary.grandTotal)}</p>
              <span className="text-[10px] text-indigo-600 font-semibold">Incl. {formatINR(salesSummary.totalTax)} Tax</span>
            </div>
          </div>

          {/* Sales Register Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  GST Sales Register
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chronological record of invoices with state-wise GST breakup
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-600">
                Showing {filteredInvoices.length} invoices
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">Sl</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Invoice No.</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Customer / Buyer</th>
                    {/* <th className="py-2.5 px-3">GSTIN / UIN</th> */}
                    <th className="py-2.5 px-3 whitespace-nowrap">POS State</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Taxable (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">IGST (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Total Tax (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Invoice Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                        No sales invoices found for the selected period
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv, idx) => {
                      const isInter = Number(inv.totalIgst) > 0;
                      return (
                        <tr key={inv.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] text-center">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 whitespace-nowrap">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{formatDateDDMonYYYY(inv.invoiceDate)}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900" title={inv.customerName}>
                            {inv.customerName}
                          </td>
                          {/* <td className="py-2 px-3">
                            {inv.customerGstin ? (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {inv.customerGstin}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">URP</span>
                            )}
                          </td> */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-slate-700">{inv.customerState}</span>
                            {inv.customerStateCode && (
                              <span className="text-[10px] text-slate-400 ml-1 font-mono">({inv.customerStateCode})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">{formatDec(inv.subtotal)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{formatDec(inv.totalCgst)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{formatDec(inv.totalSgst)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-purple-700 font-semibold whitespace-nowrap">{formatDec(inv.totalIgst)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">{formatDec(inv.totalTax)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-slate-50/40 whitespace-nowrap">
                            {formatDec(inv.grandTotal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Grand Totals Footer */}
                {filteredInvoices.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider whitespace-nowrap">
                        Total ({filteredInvoices.length} Invoices)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-700 whitespace-nowrap">{formatDec(salesSummary.taxable)}</td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">{formatDec(salesSummary.cgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">{formatDec(salesSummary.sgst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-purple-700 whitespace-nowrap">{formatDec(salesSummary.igst)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 whitespace-nowrap">{formatDec(salesSummary.totalTax)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/50 whitespace-nowrap">
                        {formatINR(salesSummary.grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REPORT 2: HSN/SAC SUMMARY (Table 12 of GSTR-1) */}
      {/* ============================================================== */}
      {activeReportTab === 'hsn' && (
        <div className="space-y-4">
          {/* HSN KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unique HSN Codes</span>
              <p className="text-lg font-black text-slate-800 mt-1 font-mono">{hsnSummaryData.length}</p>
              <span className="text-[10px] text-slate-500">Categories reported</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Quantity Sold</span>
              <p className="text-lg font-black text-indigo-600 mt-1 font-mono">{hsnTotals.totalQty}</p>
              <span className="text-[10px] text-slate-500">Units aggregated</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Taxable Value</span>
              <p className="text-lg font-black text-slate-800 mt-1 font-mono">{formatINR(hsnTotals.taxableValue)}</p>
              <span className="text-[10px] text-slate-500">Net taxable base</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Tax Amount</span>
              <p className="text-lg font-black text-emerald-700 mt-1 font-mono">{formatINR(hsnTotals.totalTax)}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Total GST on HSN</span>
            </div>
          </div>

          {/* HSN Table 12 Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Table 12: HSN-wise Summary of Outward Supplies
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Compliant with official GST Form GSTR-1 Table 12 requirements
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-600 font-mono">
                {hsnSummaryData.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Sl</th>
                    <th className="py-2.5 px-3">HSN / SAC</th>
                    <th className="py-2.5 px-3">Description of Goods</th>
                    <th className="py-2.5 px-3 text-center">UQC / Unit</th>
                    <th className="py-2.5 px-3 text-right">Total Qty</th>
                    <th className="py-2.5 px-3 text-right">Total Value (₹)</th>
                    <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                    <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {hsnSummaryData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                        No HSN item data available for the selected filter
                      </td>
                    </tr>
                  ) : (
                    hsnSummaryData.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">{h.hsnSac}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{h.description}</td>
                        <td className="py-2 px-3 text-center font-mono uppercase text-[11px] text-slate-600">{h.uqc}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">{h.totalQty}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatDec(h.totalValue)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">{formatDec(h.taxableValue)}</td>
                        <td className="py-2 px-3 text-right font-mono text-purple-700">{formatDec(h.igstAmount)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{formatDec(h.cgstAmount)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{formatDec(h.sgstAmount)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 bg-slate-50/40">
                          {formatDec(h.totalTax)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {hsnSummaryData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                        Total
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{hsnTotals.totalQty}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatDec(hsnTotals.totalValue)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-700">{formatDec(hsnTotals.taxableValue)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-purple-700">{formatDec(hsnTotals.igstAmount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatDec(hsnTotals.cgstAmount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatDec(hsnTotals.sgstAmount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/50">
                        {formatINR(hsnTotals.totalTax)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REPORT 3: GST SUMMARY / TAX LIABILITY */}
      {/* ============================================================== */}
      {activeReportTab === 'liability' && (
        <div className="space-y-4">
          {/* Liability Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Output CGST Liability</span>
              <p className="text-lg font-black text-slate-800 mt-1 font-mono">{formatINR(liabilityTotals.cgst)}</p>
              <span className="text-[10px] text-slate-500">Central tax payable</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Output SGST Liability</span>
              <p className="text-lg font-black text-slate-800 mt-1 font-mono">{formatINR(liabilityTotals.sgst)}</p>
              <span className="text-[10px] text-slate-500">State / UT tax payable</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Output IGST Liability</span>
              <p className="text-lg font-black text-purple-600 mt-1 font-mono">{formatINR(liabilityTotals.igst)}</p>
              <span className="text-[10px] text-slate-500">Integrated tax payable</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Gross Output Tax Liability</span>
              <p className="text-lg font-black text-indigo-700 mt-1 font-mono">{formatINR(liabilityTotals.totalTax)}</p>
              <span className="text-[10px] text-indigo-600 font-semibold">Total tax on sales</span>
            </div>
          </div>

          {/* Rate-wise Tax Liability Slab Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Tax Liability by GST Rate Slabs
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Segregation of turnover and taxes into Intra-State (CGST + SGST) and Inter-State (IGST)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">GST Rate Slab</th>
                    <th className="py-2.5 px-3 text-right">Intra Taxable (₹)</th>
                    <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">Inter Taxable (₹)</th>
                    <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total Taxable Turnover (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total Tax Liability (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {taxLiabilityData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-bold font-mono text-indigo-700">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                          {row.rate}% GST
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{formatDec(row.intraTaxable)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{formatDec(row.cgst)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{formatDec(row.sgst)}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatDec(row.interTaxable)}</td>
                      <td className="py-2 px-3 text-right font-mono text-purple-700 font-semibold">{formatDec(row.igst)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/30">{formatDec(row.totalTaxable)}</td>
                      <td className="py-2 px-3 text-right font-mono font-black text-indigo-700 bg-indigo-50/20">
                        {formatDec(row.totalTax)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td className="py-2.5 px-3 uppercase text-[11px] tracking-wider">Total Liability</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatDec(liabilityTotals.intraTaxable)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatDec(liabilityTotals.cgst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatDec(liabilityTotals.sgst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatDec(liabilityTotals.interTaxable)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-purple-700">{formatDec(liabilityTotals.igst)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 bg-slate-200/50">{formatDec(liabilityTotals.totalTaxable)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-700 bg-indigo-100/50">
                      {formatINR(liabilityTotals.totalTax)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
