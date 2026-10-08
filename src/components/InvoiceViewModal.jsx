import React, { useRef, useState, useEffect } from 'react';
import {
  Printer,
  FileDown,
  X,
  CheckCircle,
  Loader2,
  FileText,
  Share2
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import WhatsAppShareModal from './WhatsAppShareModal';
import { settingService } from '../services/api';
import { formatDateDDMMYYYY, formatDateDDMonYYYY } from '../utils/date';
import { getStateCode } from '../utils/states';

// Number to Indian words converter for GST invoices
function numberToWords(num) {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : ' ');
  }

  const integerPart = Math.floor(num || 0);
  const decimalPart = Math.round(((num || 0) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return 'INR Zero Only';

  let str = '';
  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const hundred = Math.floor((integerPart % 1000) / 100);
  const remainder = integerPart % 100;

  if (crore) str += inWords(crore) + 'Crore ';
  if (lakh) str += inWords(lakh) + 'Lakh ';
  if (thousand) str += inWords(thousand) + 'Thousand ';
  if (hundred) str += inWords(hundred) + 'Hundred ';
  if (remainder) str += inWords(remainder);

  let result = 'INR ' + (str.trim() || 'Zero');
  if (decimalPart > 0) {
    result += ' and ' + inWords(decimalPart).trim() + ' Paise';
  }
  return result + ' Only';
}

export default function InvoiceViewModal({ invoice, companySetting, onClose, onStatusChange }) {
  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentSetting, setCurrentSetting] = useState(companySetting || null);

  useEffect(() => {
    if (!companySetting || !companySetting.companyName) {
      settingService
        .get()
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setCurrentSetting(res.data.data);
          }
        })
        .catch((err) => {
          console.error('Failed to load company settings in modal:', err);
        });
    } else {
      setCurrentSetting(companySetting);
    }
  }, [companySetting]);

  if (!invoice) return null;

  const setting = currentSetting || {};

  const company = {
    name: setting.companyName || invoice.companyName || 'Company Name',
    address: setting.fullAddress || invoice.companyAddress || '',
    city: setting.city || '',
    state: setting.state || invoice.companyState || '',
    pincode: setting.pincode || '',
    gstin: setting.gstin || invoice.companyGstin || '',
    phone: setting.phoneNo || invoice.companyPhone || '',
    email: setting.email || '',
    hsa: setting.hsa || '',
    bankName: setting.bankName || '',
    accountHolderName: setting.accountHolderName || setting.companyName || invoice.companyName || '',
    accountNumber: setting.accountNumber || '',
    ifscCode: setting.ifscCode || ''
  };

  const companyStateCode = invoice.companyStateCode || getStateCode(company.state, company.gstin);

  const resolveBuyerPhone = () => {
    if (invoice.customerPhone) return invoice.customerPhone;
    if (invoice.shippingPhone) return invoice.shippingPhone;
    const nameKey = (invoice.customerName || '').trim().toLowerCase();
    if (nameKey) {
      try {
        const cached = localStorage.getItem(`cust_phone_${nameKey}`);
        if (cached) return cached;
        const dir = JSON.parse(localStorage.getItem('customer_phones_directory') || '{}');
        if (dir[nameKey]) return dir[nameKey];
      } catch (e) {}
    }
    return '';
  };
  const resolvedCustomerPhone = resolveBuyerPhone();

  // Buyer (Bill to)
  const buyer = {
    name: invoice.customerName || 'Customer',
    address: invoice.customerAddress || '',
    city: invoice.customerCity || '',
    state: invoice.customerState || '',
    stateCode: invoice.customerStateCode || getStateCode(invoice.customerState, invoice.customerGstin),
    gstin: invoice.customerGstin || '',
    phone: resolvedCustomerPhone,
    email: invoice.customerEmail || ''
  };

  // Consignee (Ship to)
  const consignee = {
    name: invoice.shippingName || invoice.customerName || 'Customer',
    address: invoice.shippingAddress || invoice.customerAddress || '',
    city: invoice.shippingCity || invoice.customerCity || '',
    state: invoice.shippingState || invoice.customerState || '',
    stateCode: invoice.shippingStateCode || getStateCode(invoice.shippingState || invoice.customerState, invoice.shippingGstin || invoice.customerGstin),
    gstin: invoice.shippingGstin || invoice.customerGstin || '',
    phone: invoice.shippingPhone || resolvedCustomerPhone
  };

  const isSame = invoice.isSameState;
  const items = invoice.items || [];

  // Group items by HSN/SAC for the HSN Tax Summary table
  const hsnGroups = {};
  items.forEach((it) => {
    const hsn = it.hsnSac || '—';
    if (!hsnGroups[hsn]) {
      hsnGroups[hsn] = {
        hsnSac: hsn,
        taxableAmount: 0,
        cgstRate: it.cgstRate || 0,
        cgstAmount: 0,
        sgstRate: it.sgstRate || 0,
        sgstAmount: 0,
        igstRate: it.igstRate || 0,
        igstAmount: 0,
        totalTax: 0
      };
    }
    hsnGroups[hsn].taxableAmount += Number(it.taxableAmount) || 0;
    hsnGroups[hsn].cgstAmount += Number(it.cgstAmount) || 0;
    hsnGroups[hsn].sgstAmount += Number(it.sgstAmount) || 0;
    hsnGroups[hsn].igstAmount += Number(it.igstAmount) || 0;
    hsnGroups[hsn].totalTax +=
      (Number(it.cgstAmount) || 0) + (Number(it.sgstAmount) || 0) + (Number(it.igstAmount) || 0);
  });
  const hsnList = Object.values(hsnGroups);

  // Totals calculations
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalGstAmount = items.reduce(
    (sum, item) =>
      sum +
      (Number(item.cgstAmount || 0) +
        Number(item.sgstAmount || 0) +
        Number(item.igstAmount || 0)),
    0
  );
  const totalItemAmount = items.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

  const isPaid = invoice.status === 'PAID';
  const receivedAmount = isPaid ? invoice.grandTotal : 0;
  const balanceAmount = isPaid ? 0 : invoice.grandTotal;

  // Native A4 Browser Print Dialog
  const handlePrint = () => {
    window.print();
  };

  // High-Quality A4 PDF Generation & Direct Download
  const handleDownloadPdf = async () => {
    const element = invoiceRef.current;
    if (!element) return;

    try {
      setDownloading(true);

      // Canonical A4 rendering width in px for sharp, proportional layout
      const renderWidth = 800;

      const canvas = await html2canvas(element, {
        scale: 2, // 2x Retina resolution for sharp text and clean lines
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: renderWidth,
        windowWidth: renderWidth,
        onclone: (clonedDoc) => {
          const clonedElement =
            clonedDoc.getElementById('printable-tax-invoice') ||
            clonedDoc.querySelector('.invoice-a4-sheet');

          if (clonedElement) {
            // Remove padding, margins, and shifts from all ancestor modal wrappers
            let parent = clonedElement.parentElement;
            while (parent && parent !== clonedDoc.body) {
              parent.style.padding = '0';
              parent.style.margin = '0';
              parent.style.border = 'none';
              parent.style.boxShadow = 'none';
              parent.style.width = '100%';
              parent.style.maxWidth = '100%';
              parent.style.display = 'block';
              parent = parent.parentElement;
            }

            if (clonedDoc.body) {
              clonedDoc.body.style.padding = '0';
              clonedDoc.body.style.margin = '0';
              clonedDoc.body.style.width = `${renderWidth}px`;
              clonedDoc.body.style.backgroundColor = '#ffffff';
            }

            // Lock cloned sheet to renderWidth with completely balanced left & right padding
            clonedElement.style.width = `${renderWidth}px`;
            clonedElement.style.maxWidth = `${renderWidth}px`;
            clonedElement.style.minWidth = `${renderWidth}px`;
            clonedElement.style.margin = '0 auto';
            clonedElement.style.padding = '20px 24px';
            clonedElement.style.boxSizing = 'border-box';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const fileName = `${invoice.invoiceNumber || 'Tax-Invoice'}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('Could not generate PDF directly. Please use "Print A4" and choose "Save as PDF".');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      id="invoice-modal-root"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static"
    >
      <div className="bg-white rounded-lg max-w-4xl w-full shadow-2xl border border-slate-300 overflow-hidden my-auto print:shadow-none print:border-none print:w-full print:max-w-full print:rounded-none">
        {/* Action Header Bar (Hidden during Print) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="p-1 rounded bg-indigo-600/30 text-indigo-400">
              <FileText className="w-4 h-4" />
            </span>
            <span className="font-bold text-sm tracking-wide">Standard GST Tax Invoice</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                isPaid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {onStatusChange && !isPaid && (
              <button
                onClick={() => onStatusChange(invoice.id, 'PAID')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs flex items-center space-x-1 cursor-pointer"
                title="Mark this invoice as Paid"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Mark Paid</span>
              </button>
            )}

            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              title="Share Invoice on WhatsApp (Web or App)"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share WhatsApp</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer transition-colors border border-slate-700 disabled:opacity-50"
              title="Download PDF directly"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{downloading ? 'Preparing...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
              title="Print directly in A4 size"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer ml-1"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE TAX INVOICE - 100% SEAMLESS SINGLE MASTER TABLE (ZERO OVERLAP)
            ========================================================================= */}
        <div className="overflow-x-auto w-full flex justify-center bg-slate-100/60 p-2 sm:p-6 print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={invoiceRef}
            id="printable-tax-invoice"
            className="p-6 sm:p-8 bg-white text-black font-sans invoice-a4-sheet shadow-sm print:shadow-none"
            style={{
              width: '100%',
              maxWidth: '800px',
              margin: '0 auto',
              color: '#000000',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box'
            }}
          >
            {/* Top Title: Tax Invoice (Centered) */}
            <div className="text-center pb-2">
              <h1 className="text-lg font-bold tracking-normal uppercase text-black">Tax Invoice</h1>
            </div>

            {/* SINGLE MASTER TABLE WITH FULLY COLLAPSED CONTINUOUS BORDERS */}
            <table
              className="w-full text-xs text-black border-collapse font-sans bg-white"
              style={{
                borderCollapse: 'collapse',
                border: '1px solid #000000',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <tbody>
                {/* ROW 1: TOP SECTION (LEFT: SELLER, SHIP TO, BILL TO | RIGHT: DISPATCH GRID) */}
                <tr>
                  <td colSpan={7} className="p-0 align-top" style={{ borderBottom: '1px solid #000000' }}>
                    <div className="flex w-full">
                      {/* LEFT COLUMN: SELLER, CONSIGNEE, BUYER */}
                      <div className="w-1/2 flex flex-col justify-between" style={{ borderRight: '1px solid #000000' }}>
                        {/* SELLER / COMPANY */}
                        <div className="p-2.5 space-y-0.5 text-xs text-black">
                          <h2 className="font-bold text-sm uppercase tracking-wide text-black leading-tight">
                            {company.name}
                          </h2>
                          <p className="text-[11px] leading-snug whitespace-pre-line text-black">
                            {company.address}
                            {company.city ? `, ${company.city}` : ''}
                            {company.pincode ? `-${company.pincode}` : ''}
                          </p>
                          {company.gstin && (
                            <p className="text-[11px]">
                              <span className="font-semibold">GSTIN/UIN:</span>{' '}
                              <span className="font-mono font-bold">{company.gstin}</span>
                            </p>
                          )}
                          <p className="text-[11px]">
                            <span className="font-semibold">State Name :</span> {company.state}
                            {companyStateCode ? `, Code : ${companyStateCode}` : ''}
                          </p>
                          {company.email && (
                            <p className="text-[11px]">
                              <span className="font-semibold">E-Mail :</span> {company.email}
                            </p>
                          )}
                        </div>

                        {/* CONSIGNEE (SHIP TO) */}
                        <div className="p-2.5 space-y-0.5 text-xs text-black" style={{ borderTop: '1px solid #000000' }}>
                          <span className="text-[10px] text-slate-700 block">Consignee (Ship to)</span>
                          <p className="font-bold text-xs uppercase leading-tight text-black">
                            {consignee.name}
                          </p>
                          {consignee.address && (
                            <p className="text-[11px] leading-snug whitespace-pre-line text-black">
                              {consignee.address}
                            </p>
                          )}
                          <p className="text-[11px]">
                            <span className="font-semibold">State Name :</span> {consignee.state || company.state}
                            {consignee.stateCode ? `, Code : ${consignee.stateCode}` : ''}
                          </p>
                          {(consignee.phone || buyer.phone) && (
                            <p className="text-[11px]">
                              <span className="font-semibold">Contact / Phone :</span> {consignee.phone || buyer.phone}
                            </p>
                          )}
                        </div>

                        {/* BUYER (BILL TO) */}
                        <div className="p-2.5 space-y-0.5 text-xs text-black" style={{ borderTop: '1px solid #000000' }}>
                          <span className="text-[10px] text-slate-700 block">Buyer (Bill to)</span>
                          <p className="font-bold text-xs uppercase leading-tight text-black">
                            {buyer.name}
                          </p>
                          {buyer.address && (
                            <p className="text-[11px] leading-snug whitespace-pre-line text-black">
                              {buyer.address}
                            </p>
                          )}
                          <p className="text-[11px]">
                            <span className="font-semibold">State Name :</span> {buyer.state || company.state}
                            {buyer.stateCode ? `, Code : ${buyer.stateCode}` : ''}
                          </p>
                          {buyer.phone && (
                            <p className="text-[11px]">
                              <span className="font-semibold">Contact / Phone :</span> {buyer.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* RIGHT COLUMN: 2-COLUMN METADATA GRID */}
                      <div className="w-1/2 flex flex-col justify-start text-xs text-black">
                        {/* ROW 1: INVOICE NO & DATED */}
                        <div className="flex w-full" style={{ borderBottom: '1px solid #000000' }}>
                          <div className="w-1/2 p-2" style={{ borderRight: '1px solid #000000' }}>
                            <span className="text-[10px] text-slate-700 block">Invoice No.</span>
                            <span className="font-bold font-mono text-xs block">{invoice.invoiceNumber}</span>
                          </div>
                          <div className="w-1/2 p-2">
                            <span className="text-[10px] text-slate-700 block">Dated</span>
                            <span className="font-bold text-xs block">{formatDateDDMonYYYY(invoice.invoiceDate)}</span>
                          </div>
                        </div>

                        {/* ROW 2: DELIVERY NOTE & MODE/TERMS OF PAYMENT */}
                        <div className="flex w-full" style={{ borderBottom: '1px solid #000000' }}>
                          <div className="w-1/2 p-2 min-h-[36px]" style={{ borderRight: '1px solid #000000' }}>
                            <span className="text-[10px] text-slate-700 block">Delivery Note</span>
                            <span className="font-medium text-xs block">{invoice.deliveryNote || ''}</span>
                          </div>
                          <div className="w-1/2 p-2 min-h-[36px]">
                            <span className="text-[10px] text-slate-700 block">Mode/Terms of Payment</span>
                            <span className="font-medium text-xs block">{invoice.modeTermsOfPayment || ''}</span>
                          </div>
                        </div>

                        {/* ROW 3: REFERENCE NO & DATE & OTHER REFERENCES */}
                        <div className="flex w-full" style={{ borderBottom: '1px solid #000000' }}>
                          <div className="w-1/2 p-2 min-h-[36px]" style={{ borderRight: '1px solid #000000' }}>
                            <span className="text-[10px] text-slate-700 block">Reference No. & Date.</span>
                            <span className="font-medium text-xs block">{invoice.referenceNoDate || ''}</span>
                          </div>
                          <div className="w-1/2 p-2 min-h-[36px]">
                            <span className="text-[10px] text-slate-700 block">Other References</span>
                            <span className="font-medium text-xs block">{invoice.otherReferences || ''}</span>
                          </div>
                        </div>

                        {/* ROW 4: BUYER'S ORDER NO & DATED */}
                        <div className="flex w-full" style={{ borderBottom: '1px solid #000000' }}>
                          <div className="w-1/2 p-2 min-h-[36px]" style={{ borderRight: '1px solid #000000' }}>
                            <span className="text-[10px] text-slate-700 block">Buyer's Order No.</span>
                            <span className="font-medium text-xs block">{invoice.buyersOrderNo || ''}</span>
                          </div>
                          <div className="w-1/2 p-2 min-h-[36px]">
                            <span className="text-[10px] text-slate-700 block">Dated</span>
                            <span className="font-medium text-xs block">{formatDateDDMonYYYY(invoice.orderDate) || ''}</span>
                          </div>
                        </div>

                        {/* ROW 5: DISPATCH DOC NO & DELIVERY NOTE DATE */}
                        <div className="flex w-full" style={{ borderBottom: '1px solid #000000' }}>
                          <div className="w-1/2 p-2 min-h-[36px]" style={{ borderRight: '1px solid #000000' }}>
                            <span className="text-[10px] text-slate-700 block">Dispatch Doc No.</span>
                            <span className="font-medium text-xs block">{invoice.dispatchDocNo || ''}</span>
                          </div>
                          <div className="w-1/2 p-2 min-h-[36px]">
                            <span className="text-[10px] text-slate-700 block">Delivery Note Date</span>
                            <span className="font-medium text-xs block">{formatDateDDMonYYYY(invoice.deliveryNoteDate) || ''}</span>
                          </div>
                        </div>

                        {/* ROW 6: DISPATCHED THROUGH & DESTINATION */}
                        <div className="flex w-full" style={{ borderBottom: '1px solid #000000' }}>
                          <div className="w-1/2 p-2 min-h-[36px]" style={{ borderRight: '1px solid #000000' }}>
                            <span className="text-[10px] text-slate-700 block">Dispatched through</span>
                            <span className="font-medium text-xs block">{invoice.dispatchedThrough || ''}</span>
                          </div>
                          <div className="w-1/2 p-2 min-h-[36px]">
                            <span className="text-[10px] text-slate-700 block">Destination</span>
                            <span className="font-medium text-xs block">{invoice.destination || ''}</span>
                          </div>
                        </div>

                        {/* ROW 7: TERMS OF DELIVERY */}
                        <div className="p-2 flex-1 min-h-[48px]">
                          <span className="text-[10px] text-slate-700 block">Terms of Delivery</span>
                          <span className="font-medium text-xs block whitespace-pre-line leading-relaxed">{invoice.termsOfDelivery || ''}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* ROW 2: ITEMS TABLE HEADERS */}
                <tr
                  className="bg-slate-50 font-bold text-center text-xs"
                  style={{ borderBottom: '1px solid #000000' }}
                >
                  <th style={{ borderRight: '1px solid #000000', padding: '8px 6px', verticalAlign: 'middle' }} className="text-center w-8">
                    Sl<br/>No.
                  </th>
                  <th style={{ borderRight: '1px solid #000000', padding: '8px 10px', verticalAlign: 'middle' }} className="text-left">
                    Description of Goods
                  </th>
                  <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-center w-24">
                    HSN/SAC
                  </th>
                  <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-center w-20">
                    Quantity
                  </th>
                  <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-right w-20">
                    Rate
                  </th>
                  <th style={{ padding: '8px 10px', verticalAlign: 'middle' }} className="text-right w-24">
                    Amount
                  </th>
                </tr>

                {/* ITEMS ROWS */}
                {items.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="text-center text-xs text-black"
                    style={{ borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }}
                  >
                    <td style={{ borderRight: '1px solid #000000', padding: '7px 6px', verticalAlign: 'middle' }} className="font-mono text-center">
                      {idx + 1}
                    </td>
                    <td style={{ borderRight: '1px solid #000000', padding: '7px 10px', verticalAlign: 'middle' }} className="text-left font-bold">
                      {item.itemName}
                    </td>
                    <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-center">
                      {item.hsnSac || '—'}
                    </td>
                    <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="text-center font-bold">
                      {item.qty} {item.unit || 'SET'}
                    </td>
                    <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="text-right font-mono">
                      {Number(item.pricePerUnit).toFixed(2)}
                    </td>
                    <td style={{ padding: '7px 10px', verticalAlign: 'middle' }} className="text-right font-mono font-bold">
                      {Number(item.taxableAmount).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* TAX BREAKUP ROWS INSIDE GOODS SECTION (MATCHING TAX INVOICE SAMPLE) */}
                {isSame ? (
                  <>
                    <tr className="text-xs text-black font-bold">
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ borderRight: '1px solid #000000', padding: '7px 10px', verticalAlign: 'middle' }} className="text-right font-bold tracking-wide">
                        OUTPUT CGST
                      </td>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ padding: '7px 10px', verticalAlign: 'middle' }} className="text-right font-mono font-bold">
                        {Number(invoice.totalCgst).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="text-xs text-black font-bold">
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ borderRight: '1px solid #000000', padding: '7px 10px', verticalAlign: 'middle' }} className="text-right font-bold tracking-wide">
                        OUTPUT SGST
                      </td>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ borderRight: '1px solid #000000' }}></td>
                      <td style={{ padding: '7px 10px', verticalAlign: 'middle' }} className="text-right font-mono font-bold">
                        {Number(invoice.totalSgst).toFixed(2)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr className="text-xs text-black font-bold">
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000', padding: '7px 10px', verticalAlign: 'middle' }} className="text-right font-bold tracking-wide">
                      OUTPUT IGST
                    </td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ padding: '7px 10px', verticalAlign: 'middle' }} className="text-right font-mono font-bold">
                      {Number(invoice.totalIgst).toFixed(2)}
                    </td>
                  </tr>
                )}

                {/* TOTAL ROW */}
                <tr
                  className="font-bold text-center bg-slate-50 text-xs"
                  style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}
                >
                  <td colSpan={3} style={{ borderRight: '1px solid #000000', padding: '8px 10px', verticalAlign: 'middle' }} className="text-right font-bold">
                    Total
                  </td>
                  <td style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-center font-bold">
                    {totalQty} {items[0]?.unit || 'SET'}
                  </td>
                  <td style={{ borderRight: '1px solid #000000' }}></td>
                  <td style={{ padding: '8px 10px', verticalAlign: 'middle' }} className="text-right font-mono font-bold">
                    ₹ {Number(invoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* AMOUNT IN WORDS & E. & O.E */}
                <tr style={{ borderBottom: '1px solid #000000' }}>
                  <td colSpan={4} style={{ padding: '10px 12px' }} className="text-xs text-black">
                    <span className="text-[10px] text-slate-700 block">Amount Chargeable (in words)</span>
                    <p className="font-bold text-xs text-black mt-0.5">{numberToWords(invoice.grandTotal)}</p>
                  </td>
                  <td colSpan={2} style={{ padding: '10px 12px' }} className="text-right align-top">
                    <span className="font-bold text-xs">E. & O.E</span>
                  </td>
                </tr>

                {/* HSN/SAC TAX SUMMARY TABLE */}
                <tr style={{ borderBottom: '1px solid #000000' }}>
                  <td colSpan={6} style={{ padding: '10px 12px' }}>
                    <table
                      className="w-full text-xs text-black border-collapse"
                      style={{ border: '1px solid #000000', borderCollapse: 'collapse' }}
                    >
                      <thead>
                        <tr className="bg-slate-50 font-bold text-center text-xs" style={{ borderBottom: '1px solid #000000' }}>
                          <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-center font-bold">
                            HSN/SAC
                          </th>
                          <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-right font-bold">
                            Taxable Value
                          </th>
                          {isSame ? (
                            <>
                              <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-center font-bold">
                                CGST (Rate)
                              </th>
                              <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-right font-bold">
                                CGST (Amount)
                              </th>
                              <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-center font-bold">
                                SGST (Rate)
                              </th>
                              <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-right font-bold">
                                SGST (Amount)
                              </th>
                            </>
                          ) : (
                            <>
                              <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-center font-bold">
                                IGST (Rate)
                              </th>
                              <th style={{ borderRight: '1px solid #000000', padding: '8px 8px', verticalAlign: 'middle' }} className="text-right font-bold">
                                IGST (Amount)
                              </th>
                            </>
                          )}
                          <th style={{ padding: '8px 8px', verticalAlign: 'middle' }} className="text-right font-bold">
                            Total Tax Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {hsnList.map((h, i) => (
                          <tr key={i} className="text-xs" style={{ borderBottom: '1px solid #000000' }}>
                            <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-center">
                              {h.hsnSac}
                            </td>
                            <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-right">
                              {h.taxableAmount.toFixed(2)}
                            </td>
                            {isSame ? (
                              <>
                                <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-center">
                                  {h.cgstRate}%
                                </td>
                                <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-right">
                                  {h.cgstAmount.toFixed(2)}
                                </td>
                                <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-center">
                                  {h.sgstRate}%
                                </td>
                                <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-right">
                                  {h.sgstAmount.toFixed(2)}
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-center">
                                  {h.igstRate}%
                                </td>
                                <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-right">
                                  {h.igstAmount.toFixed(2)}
                                </td>
                              </>
                            )}
                            <td style={{ padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-right font-bold">
                              {h.totalTax.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {/* HSN TOTAL ROW */}
                        <tr className="font-bold text-xs bg-slate-50">
                          <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="text-right font-bold">
                            Total
                          </td>
                          <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-right">
                            {Number(invoice.subtotal).toFixed(2)}
                          </td>
                          {isSame ? (
                            <>
                              <td style={{ borderRight: '1px solid #000000' }}></td>
                              <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-right">
                                {Number(invoice.totalCgst).toFixed(2)}
                              </td>
                              <td style={{ borderRight: '1px solid #000000' }}></td>
                              <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-right">
                                {Number(invoice.totalSgst).toFixed(2)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ borderRight: '1px solid #000000' }}></td>
                              <td style={{ borderRight: '1px solid #000000', padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-right">
                                {Number(invoice.totalIgst).toFixed(2)}
                              </td>
                            </>
                          )}
                          <td style={{ padding: '7px 8px', verticalAlign: 'middle' }} className="font-mono text-right font-bold">
                            {Number(invoice.totalTax).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="pt-2 text-xs">
                      <span className="font-semibold">Tax Amount (in words) : </span>
                      <span className="font-bold">{numberToWords(invoice.totalTax)}</span>
                    </div>
                  </td>
                </tr>

                {/* DECLARATION & SIGNATURE ROW */}
                <tr>
                  <td colSpan={3} className="p-3 text-xs align-top" style={{ borderRight: '1px solid #000000' }}>
                    <span className="font-bold block mb-1">Declaration</span>
                    <p className="text-[11px] leading-relaxed text-slate-800">
                      We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                    </p>

                    {/* Bank details if available */}
                    {company.bankName && (
                      <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                        <span className="font-bold text-slate-800 block mb-0.5">Bank Details:</span>
                        <p>Bank: <strong className="text-slate-800">{company.bankName}</strong> | A/C: <strong className="text-slate-800 font-mono">{company.accountNumber}</strong></p>
                        <p>IFSC: <strong className="text-slate-800 font-mono">{company.ifscCode}</strong> | A/C Holder: <strong className="text-slate-800">{company.accountHolderName}</strong></p>
                      </div>
                    )}
                  </td>

                  <td colSpan={3} className="p-3 text-xs align-top text-right">
                    <span className="font-bold text-xs uppercase block">
                      for {company.name}
                    </span>
                    <div className="pt-14">
                      <span className="text-xs font-semibold block">Authorised Signatory</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* COMPUTER GENERATED FOOTER */}
            <div className="text-center pt-2 pb-1 text-[11px] text-slate-600">
              This is a Computer Generated Invoice
            </div>
        </div>
        </div>
      </div>

      {/* WhatsApp Share Modal */}
      {showShareModal && (
        <WhatsAppShareModal
          isOpen={showShareModal}
          invoice={invoice}
          companySetting={currentSetting || companySetting}
          onClose={() => setShowShareModal(false)}
          onInvoiceUpdate={(updatedInv) => {
            if (invoice && invoice.id === updatedInv.id) {
              Object.assign(invoice, updatedInv);
            }
          }}
        />
      )}
    </div>
  );
}
