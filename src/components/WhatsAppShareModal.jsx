import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Share2,
  Download,
  Check,
  AlertCircle,
  Phone,
  MessageSquare,
  Smartphone,
  Globe,
  Loader2,
  Copy
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  checkFileShareSupport,
  cleanPhoneNumber,
  extract10DigitPhone,
  formatWhatsAppInvoiceMessage,
  openWhatsAppWeb,
  openWhatsAppApp,
  openWhatsAppDirect,
  shareInvoiceFile
} from '../services/shareService';
import { invoiceService, userService } from '../services/api';
import { formatDateDDMonYYYY } from '../utils/date';
import { getStateCode } from '../utils/states';

// Number to words helper for invoice representation
function numberToWords(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'INR Zero Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(val) {
    if ((val = val.toString()).length > 9) return 'overflow';
    const match = ('000000000' + val).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!match) return '';
    let str = '';
    str += Number(match[1]) !== 0 ? (a[Number(match[1])] || b[match[1][0]] + ' ' + a[match[1][1]]) + 'Crore ' : '';
    str += Number(match[2]) !== 0 ? (a[Number(match[2])] || b[match[2][0]] + ' ' + a[match[2][1]]) + 'Lakh ' : '';
    str += Number(match[3]) !== 0 ? (a[Number(match[3])] || b[match[3][0]] + ' ' + a[match[3][1]]) + 'Thousand ' : '';
    str += Number(match[4]) !== 0 ? (a[Number(match[4])] || b[match[4][0]] + ' ' + a[match[4][1]]) + 'Hundred ' : '';
    str += Number(match[5]) !== 0
      ? (str !== '' ? 'and ' : '') + (a[Number(match[5])] || b[match[5][0]] + ' ' + a[match[5][1]])
      : '';
    return str.trim();
  }

  return `INR ${inWords(n)} Only`;
}

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  invoice,
  companySetting,
  onInvoiceUpdate
}) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isSaved, setIsSaved] = useState(false);
  const invoiceSheetRef = useRef(null);

  // Helper to persist phone number to DB and localStorage
  const persistPhone = async (cleanDigits) => {
    if (!cleanDigits || cleanDigits.length < 10) return;
    const tenDigits = cleanDigits.slice(-10);

    // 1. Cache locally by customer name
    const custKey = (invoice?.customerName || '').trim().toLowerCase();
    if (custKey) {
      localStorage.setItem(`cust_phone_${custKey}`, tenDigits);
      try {
        const dir = JSON.parse(localStorage.getItem('customer_phones_directory') || '{}');
        dir[custKey] = tenDigits;
        localStorage.setItem('customer_phones_directory', JSON.stringify(dir));
      } catch (e) {}
    }

    // 2. Persist to invoice in database
    if (invoice?.id) {
      try {
        await invoiceService.updatePhone(invoice.id, {
          customerPhone: tenDigits,
          shippingPhone: tenDigits
        });
        invoice.customerPhone = tenDigits;
        invoice.shippingPhone = tenDigits;
        setIsSaved(true);
        if (onInvoiceUpdate) {
          onInvoiceUpdate({ ...invoice, customerPhone: tenDigits, shippingPhone: tenDigits });
        }
      } catch (err) {
        console.warn('Failed to auto-save phone to invoice:', err);
      }
    }
  };

  // Sync and auto-populate phone number when invoice opens
  useEffect(() => {
    if (!invoice) return;

    let initialPhone = extract10DigitPhone(invoice.customerPhone || invoice.shippingPhone || '');

    // Check localStorage cache for customer
    const cleanCustomerName = (invoice.customerName || '').trim().toLowerCase();
    if (!initialPhone && cleanCustomerName) {
      const cached = localStorage.getItem(`cust_phone_${cleanCustomerName}`);
      if (cached) {
        initialPhone = extract10DigitPhone(cached);
      }
    }

    // Check customer phones directory
    if (!initialPhone && cleanCustomerName) {
      try {
        const dir = JSON.parse(localStorage.getItem('customer_phones_directory') || '{}');
        if (dir[cleanCustomerName]) {
          initialPhone = extract10DigitPhone(dir[cleanCustomerName]);
        }
      } catch (e) {}
    }

    // If still not found, check registered users
    if (!initialPhone && (invoice.userId || cleanCustomerName)) {
      userService.getAll()
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            const users = res.data.data;
            const matchedUser = users.find(
              (u) =>
                (invoice.userId && String(u.id) === String(invoice.userId)) ||
                (u.name && u.name.trim().toLowerCase() === cleanCustomerName) ||
                (u.name && cleanCustomerName && cleanCustomerName.includes(u.name.trim().toLowerCase()))
            );
            if (matchedUser?.contactNumber) {
              const userPhone = extract10DigitPhone(matchedUser.contactNumber);
              if (userPhone) {
                setPhoneNumber(userPhone);
                persistPhone(userPhone);
              }
            }
          }
        })
        .catch(() => {});
    }

    setPhoneNumber(initialPhone || '');
    setIsSaved(Boolean(initialPhone && initialPhone.length === 10));
    setFeedback(null);
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  // Normalized company data
  const company = {
    name: companySetting?.companyName || invoice.companyName || 'MY ELECTRICYCLE SHOP',
    address: companySetting?.fullAddress || invoice.companyAddress || 'FIRST FLOOR, DDA SHOP F-41, TRIVAENI COMPLEX',
    city: companySetting?.city || 'New Delhi',
    pincode: companySetting?.pincode || '110017',
    state: companySetting?.state || invoice.companyState || 'Delhi',
    gstin: companySetting?.gstin || invoice.companyGstin || '07AEUPM2913G2ZA',
    phone: companySetting?.phoneNo || invoice.companyPhone || '+91 98765 43210',
    email: companySetting?.email || 'myelectricycleshop@gmail.com',
    bankName: companySetting?.bankName || invoice.bankName || '',
    accountNumber: companySetting?.accountNumber || invoice.accountNumber || '',
    ifscCode: companySetting?.ifscCode || invoice.ifscCode || '',
    accountHolderName: companySetting?.accountHolderName || invoice.accountHolderName || ''
  };

  const companyStateCode = invoice.companyStateCode || getStateCode(company.state, company.gstin);
  const customerStateCode = invoice.customerStateCode || getStateCode(invoice.customerState, invoice.customerGstin);
  const isSame = invoice.isSameState !== undefined ? invoice.isSameState : (invoice.totalIgst === 0 || !invoice.totalIgst);
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

  // Generate PDF File from hidden printable element
  const generatePdfFile = async () => {
    const element = invoiceSheetRef.current;
    if (!element) {
      throw new Error('Invoice printable template not ready');
    }

    const renderWidth = 800;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: renderWidth,
      windowWidth: renderWidth
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
    const blob = pdf.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

    return { pdf, blob, file, fileName, imageBlob };
  };

  // Helper to copy invoice image to clipboard for instant Ctrl+V into WhatsApp
  const copyInvoiceImageToClipboard = async (imageBlob) => {
    if (imageBlob && typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': imageBlob })
        ]);
        return true;
      } catch (err) {
        console.warn('Clipboard image write not permitted:', err);
      }
    }
    return false;
  };

  // 1. Share via WhatsApp Web (Desktop)
  const handleShareWeb = async () => {
    const cleanPhone = cleanPhoneNumber(phoneNumber);
    if (!cleanPhone) {
      setFeedback({ type: 'error', text: 'Please enter a valid 10-digit mobile number' });
      return;
    }
    await persistPhone(phoneNumber);

    try {
      setLoading(true);
      setLoadingText('Generating Tax Invoice...');
      setFeedback(null);

      const { pdf, fileName, imageBlob } = await generatePdfFile();
      pdf.save(fileName);

      // Copy image to clipboard so user can simply press Ctrl+V in WhatsApp Web
      const copiedImage = await copyInvoiceImageToClipboard(imageBlob);

      setLoadingText('Opening WhatsApp Web...');
      const message = formatWhatsAppInvoiceMessage({ invoice, company });

      // Open WhatsApp Web directly with customer number and pre-filled message
      openWhatsAppWeb({ phone: cleanPhone, message });

      setFeedback({
        type: 'success',
        text: copiedImage
          ? `Invoice copied to clipboard! WhatsApp Web open hone par chat me Ctrl+V (Paste) dabayein, ya downloaded PDF (${fileName}) ko attach karein.`
          : `PDF downloaded! WhatsApp Web me downloaded ${fileName} attach karein.`
      });
    } catch (err) {
      console.error('WhatsApp Web share failed:', err);
      setFeedback({ type: 'error', text: 'Failed to generate invoice for WhatsApp Web' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Share via WhatsApp App: Directly opens customer's WhatsApp chat with pre-filled invoice details
  const handleShareApp = async () => {
    const cleanPhone = cleanPhoneNumber(phoneNumber);
    if (!cleanPhone) {
      setFeedback({ type: 'error', text: 'Please enter a valid 10-digit mobile number' });
      return;
    }
    await persistPhone(phoneNumber);

    try {
      setLoading(true);
      setLoadingText('Opening WhatsApp with Customer Number...');
      setFeedback(null);

      const { pdf, fileName, imageBlob } = await generatePdfFile();
      const message = formatWhatsAppInvoiceMessage({ invoice, company });

      // 1. Copy high-res invoice image to clipboard for instant Ctrl+V paste in WhatsApp
      const copiedImage = await copyInvoiceImageToClipboard(imageBlob);

      // 2. Auto-save PDF on device
      pdf.save(fileName);

      // 3. Directly launch WhatsApp targeting this exact customer's phone number
      openWhatsAppApp({ phone: cleanPhone, message });

      setFeedback({
        type: 'success',
        text: copiedImage
          ? `WhatsApp opened for +${cleanPhone}! Invoice copied to clipboard — press Ctrl+V (Paste) in chat, or drag downloaded ${fileName}.`
          : `WhatsApp opened for +${cleanPhone}! PDF (${fileName}) saved to your device.`
      });
    } catch (err) {
      console.error('WhatsApp App share failed:', err);
      setFeedback({ type: 'error', text: 'Failed to open WhatsApp for this customer' });
    } finally {
      setLoading(false);
    }
  };

  const previewMessage = formatWhatsAppInvoiceMessage({ invoice, company });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 no-print">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Share Invoice on WhatsApp</h2>
              <p className="text-[11px] text-emerald-100">Directly send PDF & details to customer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Invoice Summary Pill */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Invoice</span>
              <span className="font-mono font-bold text-indigo-700 text-sm">{invoice.invoiceNumber}</span>
              <span className="text-[11px] text-slate-500 block">{invoice.customerName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Amount</span>
              <span className="font-mono font-bold text-emerald-700 text-base">
                ₹{Number(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 block">{formatDateDDMonYYYY(invoice.invoiceDate)}</span>
            </div>
          </div>

          {/* Recipient Phone Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recipient WhatsApp Number *</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">India (+91)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs font-semibold">
                +91
              </div>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phoneNumber}
                maxLength={10}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhoneNumber(digits);
                  if (digits.length === 10) {
                    persistPhone(digits);
                  } else {
                    setIsSaved(false);
                  }
                }}
                className="w-full h-10 pl-11 pr-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px]">
              <span className="text-slate-500">
                {isSaved || phoneNumber.length === 10 ? (
                  <span className="text-emerald-600 font-semibold flex items-center">
                    <Check className="w-3 h-3 inline mr-1 text-emerald-600" />
                    Auto-linked to {invoice.customerName || 'Customer'}
                  </span>
                ) : (
                  'Number is auto-saved to customer profile & invoice'
                )}
              </span>
              {phoneNumber.length > 0 && (
                <span className={`font-mono font-bold ${phoneNumber.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {phoneNumber.length}/10 digits
                </span>
              )}
            </div>
          </div>

          {/* Formatted Message Preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs">
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
              <span className="flex items-center space-x-1">
                <MessageSquare className="w-3 h-3 text-slate-400" />
                <span>WhatsApp Message Preview</span>
              </span>
              <span className="text-[9px] text-emerald-600 font-semibold">+ PDF File</span>
            </div>
            <pre className="text-[11px] font-sans text-slate-700 whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
              {previewMessage}
            </pre>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-start space-x-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
              )}
              <span className="leading-snug">{feedback.text}</span>
            </div>
          )}

          {/* Action Buttons: Web and App */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* 1. WhatsApp Web (Desktop) */}
            <button
              type="button"
              onClick={handleShareWeb}
              disabled={loading}
              className="flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Web</span>
            </button>

            {/* 2. WhatsApp App */}
            <button
              type="button"
              onClick={handleShareApp}
              disabled={loading}
              className="flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Smartphone className="w-4 h-4" />
              <span>WhatsApp App</span>
            </button>
          </div>

          {/* Loading status */}
          {loading && (
            <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-emerald-700 py-1">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>{loadingText}</span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Official Tax Invoice PDF will be prepared</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* =========================================================================
          OFF-SCREEN COMPLETE PRINTABLE TAX INVOICE DOM TEMPLATE FOR PDF GENERATION
          ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '-9999px',
          width: '800px',
          zIndex: -100,
          visibility: 'visible',
          pointerEvents: 'none',
          backgroundColor: '#ffffff'
        }}
      >
        <div
          ref={invoiceSheetRef}
          id="printable-tax-invoice"
          className="p-8 bg-white text-black font-sans invoice-a4-sheet"
          style={{
            width: '800px',
            color: '#000000',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box'
          }}
        >
          {/* Top Title */}
          <div className="text-center pb-2">
            <h1 className="text-lg font-bold tracking-normal uppercase text-black">Tax Invoice</h1>
          </div>

          {/* Master Table */}
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
              {/* Header Row */}
              <tr>
                <td colSpan={7} className="p-0 align-top" style={{ borderBottom: '1px solid #000000' }}>
                  <div className="flex w-full">
                    {/* Left Column: Seller, Consignee, Buyer */}
                    <div className="w-1/2 flex flex-col justify-between" style={{ borderRight: '1px solid #000000' }}>
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

                      {/* Consignee */}
                      <div className="p-2.5 space-y-0.5 text-xs text-black" style={{ borderTop: '1px solid #000000' }}>
                        <span className="text-[10px] text-slate-700 block">Consignee (Ship to)</span>
                        <p className="font-bold text-xs uppercase leading-tight text-black">
                          {invoice.shippingName || invoice.customerName}
                        </p>
                        {(invoice.shippingAddress || invoice.customerAddress) && (
                          <p className="text-[11px] leading-snug whitespace-pre-line text-black">
                            {invoice.shippingAddress || invoice.customerAddress}
                          </p>
                        )}
                        <p className="text-[11px]">
                          <span className="font-semibold">State Name :</span> {invoice.shippingState || invoice.customerState || company.state}
                          {invoice.shippingStateCode ? `, Code : ${invoice.shippingStateCode}` : ''}
                        </p>
                        {(invoice.shippingPhone || invoice.customerPhone || phoneNumber) && (
                          <p className="text-[11px]">
                            <span className="font-semibold">Contact / Phone :</span> {invoice.shippingPhone || invoice.customerPhone || phoneNumber}
                          </p>
                        )}
                      </div>

                      {/* Buyer */}
                      <div className="p-2.5 space-y-0.5 text-xs text-black" style={{ borderTop: '1px solid #000000' }}>
                        <span className="text-[10px] text-slate-700 block">Buyer (Bill to)</span>
                        <p className="font-bold text-xs uppercase leading-tight text-black">
                          {invoice.customerName}
                        </p>
                        {invoice.customerAddress && (
                          <p className="text-[11px] leading-snug whitespace-pre-line text-black">
                            {invoice.customerAddress}
                          </p>
                        )}
                        <p className="text-[11px]">
                          <span className="font-semibold">State Name :</span> {invoice.customerState || company.state}
                          {customerStateCode ? `, Code : ${customerStateCode}` : ''}
                        </p>
                        {(invoice.customerPhone || phoneNumber) && (
                          <p className="text-[11px]">
                            <span className="font-semibold">Contact / Phone :</span> {invoice.customerPhone || phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Dispatch & Metadata Grid */}
                    <div className="w-1/2 flex flex-col justify-start">
                      <div className="grid grid-cols-2 text-xs" style={{ borderBottom: '1px solid #000000' }}>
                        <div className="p-1.5" style={{ borderRight: '1px solid #000000' }}>
                          <span className="text-[10px] text-slate-700 block">Invoice No.</span>
                          <span className="font-mono font-bold text-sm block">{invoice.invoiceNumber}</span>
                        </div>
                        <div className="p-1.5">
                          <span className="text-[10px] text-slate-700 block">Dated</span>
                          <span className="font-bold block">{formatDateDDMonYYYY(invoice.invoiceDate)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 text-xs" style={{ borderBottom: '1px solid #000000' }}>
                        <div className="p-1.5" style={{ borderRight: '1px solid #000000' }}>
                          <span className="text-[10px] text-slate-700 block">Delivery Note</span>
                          <span className="font-medium">{invoice.deliveryNote || ''}</span>
                        </div>
                        <div className="p-1.5">
                          <span className="text-[10px] text-slate-700 block">Mode/Terms of Payment</span>
                          <span className="font-medium">{invoice.modeTermsOfPayment || ''}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 text-xs" style={{ borderBottom: '1px solid #000000' }}>
                        <div className="p-1.5" style={{ borderRight: '1px solid #000000' }}>
                          <span className="text-[10px] text-slate-700 block">Reference No. & Date.</span>
                          <span className="font-medium">{invoice.referenceNoDate || ''}</span>
                        </div>
                        <div className="p-1.5">
                          <span className="text-[10px] text-slate-700 block">Other References</span>
                          <span className="font-medium">{invoice.otherReferences || ''}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 text-xs" style={{ borderBottom: '1px solid #000000' }}>
                        <div className="p-1.5" style={{ borderRight: '1px solid #000000' }}>
                          <span className="text-[10px] text-slate-700 block">Buyer's Order No.</span>
                          <span className="font-medium">{invoice.buyersOrderNo || ''}</span>
                        </div>
                        <div className="p-1.5">
                          <span className="text-[10px] text-slate-700 block">Dated</span>
                          <span className="font-medium">{formatDateDDMonYYYY(invoice.orderDate)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 text-xs" style={{ borderBottom: '1px solid #000000' }}>
                        <div className="p-1.5" style={{ borderRight: '1px solid #000000' }}>
                          <span className="text-[10px] text-slate-700 block">Dispatch Doc No.</span>
                          <span className="font-medium">{invoice.dispatchDocNo || ''}</span>
                        </div>
                        <div className="p-1.5">
                          <span className="text-[10px] text-slate-700 block">Delivery Note Date</span>
                          <span className="font-medium">{formatDateDDMonYYYY(invoice.deliveryNoteDate)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 text-xs" style={{ borderBottom: '1px solid #000000' }}>
                        <div className="p-1.5" style={{ borderRight: '1px solid #000000' }}>
                          <span className="text-[10px] text-slate-700 block">Dispatched through</span>
                          <span className="font-medium">{invoice.dispatchedThrough || ''}</span>
                        </div>
                        <div className="p-1.5">
                          <span className="text-[10px] text-slate-700 block">Destination</span>
                          <span className="font-medium">{invoice.destination || ''}</span>
                        </div>
                      </div>

                      <div className="p-1.5 text-xs">
                        <span className="text-[10px] text-slate-700 block">Terms of Delivery</span>
                        <span className="font-medium">{invoice.termsOfDelivery || ''}</span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Items Table Header */}
              <tr className="bg-white text-[11px] font-bold text-black" style={{ borderBottom: '1px solid #000000' }}>
                <th className="py-1 px-1.5 text-center w-8" style={{ borderRight: '1px solid #000000' }}>Sl No.</th>
                <th className="py-1 px-2 text-left" style={{ borderRight: '1px solid #000000' }}>Description of Goods</th>
                <th className="py-1 px-2 text-center w-20" style={{ borderRight: '1px solid #000000' }}>HSN/SAC</th>
                <th className="py-1 px-2 text-center w-16" style={{ borderRight: '1px solid #000000' }}>Quantity</th>
                <th className="py-1 px-2 text-right w-16" style={{ borderRight: '1px solid #000000' }}>Rate</th>
                {/* <th className="py-1 px-2 text-center w-12" style={{ borderRight: '1px solid #000000' }}>per</th> */}
                <th className="py-1 px-2 text-right w-20">Amount</th>
              </tr>

              {/* Line Items */}
              {(invoice.items || []).map((item, idx) => (
                <tr key={idx} className="text-xs text-black" style={{ verticalAlign: 'top' }}>
                  <td className="py-1 px-1.5 font-mono text-center" style={{ borderRight: '1px solid #000000' }}>{idx + 1}</td>
                  <td className="py-1 px-2 font-bold text-black" style={{ borderRight: '1px solid #000000' }}>{item.itemName}</td>
                  <td className="py-1 px-2 font-mono text-center" style={{ borderRight: '1px solid #000000' }}>{item.hsnSac || ''}</td>
                  <td className="py-1 px-2 font-mono font-bold text-center" style={{ borderRight: '1px solid #000000' }}>{item.qty} {item.unit}</td>
                  <td className="py-1 px-2 font-mono text-right" style={{ borderRight: '1px solid #000000' }}>{Number(item.pricePerUnit).toFixed(2)}</td>
                  {/* <td className="py-1 px-2 text-center uppercase" style={{ borderRight: '1px solid #000000' }}>{item.unit}</td> */}
                  <td className="py-1 px-2 font-mono font-bold text-right">{Number(item.taxableAmount).toFixed(2)}</td>
                </tr>
              ))}

              {/* Tax Rows embedded in table */}
              {isSame ? (
                <>
                  <tr className="text-xs text-black">
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td className="py-0.5 px-2 font-bold text-right uppercase tracking-wider text-black" style={{ borderRight: '1px solid #000000' }}>OUTPUT CGST</td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td className="py-0.5 px-2 font-mono font-bold text-right">{Number(invoice.totalCgst || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="text-xs text-black">
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td className="py-0.5 px-2 font-bold text-right uppercase tracking-wider text-black" style={{ borderRight: '1px solid #000000' }}>OUTPUT SGST</td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td style={{ borderRight: '1px solid #000000' }}></td>
                    <td className="py-0.5 px-2 font-mono font-bold text-right">{Number(invoice.totalSgst || 0).toFixed(2)}</td>
                  </tr>
                </>
              ) : (
                <tr className="text-xs text-black">
                  <td style={{ borderRight: '1px solid #000000' }}></td>
                  <td className="py-0.5 px-2 font-bold text-right uppercase tracking-wider text-black" style={{ borderRight: '1px solid #000000' }}>OUTPUT IGST</td>
                  <td style={{ borderRight: '1px solid #000000' }}></td>
                  <td style={{ borderRight: '1px solid #000000' }}></td>
                  <td style={{ borderRight: '1px solid #000000' }}></td>
                  <td className="py-0.5 px-2 font-mono font-bold text-right">{Number(invoice.totalIgst || 0).toFixed(2)}</td>
                </tr>
              )}

              {/* Total Row */}
              <tr className="font-bold text-xs bg-white text-black" style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                <td style={{ borderRight: '1px solid #000000' }}></td>
                <td className="py-1 px-2 text-right" style={{ borderRight: '1px solid #000000' }}>Total</td>
                <td style={{ borderRight: '1px solid #000000' }}></td>
                <td className="py-1 px-2 font-mono text-center" style={{ borderRight: '1px solid #000000' }}>
                  {(invoice.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0)} {(invoice.items?.[0]?.unit || 'SET')}
                </td>
                <td style={{ borderRight: '1px solid #000000' }}></td>
                <td className="py-1 px-2 font-mono font-black text-right">
                  ₹ {Number(invoice.grandTotal || 0).toFixed(2)}
                </td>
              </tr>

              {/* Amount Chargeable In Words */}
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td colSpan={4} className="p-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-700 block">Amount Chargeable (in words)</span>
                    <strong className="text-xs uppercase text-black font-bold block">
                      {numberToWords(invoice.grandTotal)}
                    </strong>
                  </div>
                </td>
                <td colSpan={2} className="p-2 text-right align-top">
                  <span className="text-[11px] font-bold text-black">E. & O.E</span>
                </td>
              </tr>

              {/* HSN/SAC TAX SUMMARY TABLE */}
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td colSpan={6} className="p-2.5">
                  <table
                    className="w-full text-xs text-black border-collapse"
                    style={{ border: '1px solid #000000', borderCollapse: 'collapse' }}
                  >
                    <thead>
                      <tr className="bg-slate-50 font-bold text-center" style={{ borderBottom: '1px solid #000000' }}>
                        <th rowSpan={2} className="py-1 px-2 text-center" style={{ borderRight: '1px solid #000000' }}>
                          HSN/SAC
                        </th>
                        <th rowSpan={2} className="py-1 px-2 text-right" style={{ borderRight: '1px solid #000000' }}>
                          Taxable Value
                        </th>
                        {isSame ? (
                          <>
                            <th colSpan={2} className="py-1 px-2 text-center" style={{ borderRight: '1px solid #000000' }}>
                              CGST
                            </th>
                            <th colSpan={2} className="py-1 px-2 text-center" style={{ borderRight: '1px solid #000000' }}>
                              SGST/UTGST
                            </th>
                          </>
                        ) : (
                          <th colSpan={2} className="py-1 px-2 text-center" style={{ borderRight: '1px solid #000000' }}>
                            IGST
                          </th>
                        )}
                        <th rowSpan={2} className="py-1 px-2 text-right">
                          Total Tax Amount
                        </th>
                      </tr>
                      <tr className="bg-slate-50 text-[10px]" style={{ borderBottom: '1px solid #000000' }}>
                        {isSame ? (
                          <>
                            <th className="py-0.5 px-1 text-center" style={{ borderRight: '1px solid #000000' }}>Rate</th>
                            <th className="py-0.5 px-1 text-right" style={{ borderRight: '1px solid #000000' }}>Amount</th>
                            <th className="py-0.5 px-1 text-center" style={{ borderRight: '1px solid #000000' }}>Rate</th>
                            <th className="py-0.5 px-1 text-right" style={{ borderRight: '1px solid #000000' }}>Amount</th>
                          </>
                        ) : (
                          <>
                            <th className="py-0.5 px-1 text-center" style={{ borderRight: '1px solid #000000' }}>Rate</th>
                            <th className="py-0.5 px-1 text-right" style={{ borderRight: '1px solid #000000' }}>Amount</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {hsnList.map((h, i) => (
                        <tr key={i} className="text-xs" style={{ borderBottom: '1px solid #000000' }}>
                          <td className="py-1 px-2 font-mono text-center" style={{ borderRight: '1px solid #000000' }}>
                            {h.hsnSac}
                          </td>
                          <td className="py-1 px-2 font-mono text-right" style={{ borderRight: '1px solid #000000' }}>
                            {h.taxableAmount.toFixed(2)}
                          </td>
                          {isSame ? (
                            <>
                              <td className="py-1 px-1 font-mono text-center" style={{ borderRight: '1px solid #000000' }}>
                                {h.cgstRate}%
                              </td>
                              <td className="py-1 px-2 font-mono text-right" style={{ borderRight: '1px solid #000000' }}>
                                {h.cgstAmount.toFixed(2)}
                              </td>
                              <td className="py-1 px-1 font-mono text-center" style={{ borderRight: '1px solid #000000' }}>
                                {h.sgstRate}%
                              </td>
                              <td className="py-1 px-2 font-mono text-right" style={{ borderRight: '1px solid #000000' }}>
                                {h.sgstAmount.toFixed(2)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-1 px-1 font-mono text-center" style={{ borderRight: '1px solid #000000' }}>
                                {h.igstRate}%
                              </td>
                              <td className="py-1 px-2 font-mono text-right" style={{ borderRight: '1px solid #000000' }}>
                                {h.igstAmount.toFixed(2)}
                              </td>
                            </>
                          )}
                          <td className="py-1 px-2 font-mono text-right font-bold">
                            {h.totalTax.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {/* HSN TOTAL ROW */}
                      <tr className="font-bold text-xs bg-slate-50">
                        <td className="py-1 px-2 text-right" style={{ borderRight: '1px solid #000000' }}>
                          Total
                        </td>
                        <td className="py-1 px-2 font-mono text-right" style={{ borderRight: '1px solid #000000' }}>
                          {Number(invoice.subtotal).toFixed(2)}
                        </td>
                        {isSame ? (
                          <>
                            <td style={{ borderRight: '1px solid #000000' }}></td>
                            <td className="py-1 px-2 font-mono text-right" style={{ borderRight: '1px solid #000000' }}>
                              {Number(invoice.totalCgst).toFixed(2)}
                            </td>
                            <td style={{ borderRight: '1px solid #000000' }}></td>
                            <td className="py-1 px-2 font-mono text-right" style={{ borderRight: '1px solid #000000' }}>
                              {Number(invoice.totalSgst).toFixed(2)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ borderRight: '1px solid #000000' }}></td>
                            <td className="py-1 px-2 font-mono text-right" style={{ borderRight: '1px solid #000000' }}>
                              {Number(invoice.totalIgst).toFixed(2)}
                            </td>
                          </>
                        )}
                        <td className="py-1 px-2 font-mono text-right font-bold">
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

              {/* Declaration & Signature */}
              <tr>
                <td colSpan={3} className="p-3 text-xs align-top" style={{ borderRight: '1px solid #000000' }}>
                  <span className="font-bold block mb-1">Declaration</span>
                  <p className="text-[11px] leading-relaxed text-black">
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                  </p>
                  {company.bankName && (
                    <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                      <span className="font-bold text-slate-800 block mb-0.5">Bank Details:</span>
                      <p>Bank: <strong className="text-slate-800">{company.bankName}</strong> | A/C: <strong className="text-slate-800 font-mono">{company.accountNumber}</strong></p>
                      <p>IFSC: <strong className="text-slate-800 font-mono">{company.ifscCode}</strong> | A/C Holder: <strong className="text-slate-800">{company.accountHolderName}</strong></p>
                    </div>
                  )}
                </td>
                <td colSpan={3} className="p-3 text-xs align-top text-right">
                  <span className="font-bold text-xs uppercase block">for {company.name}</span>
                  <div className="pt-12">
                    <span className="text-xs font-semibold block">Authorised Signatory</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Computer Generated Footer */}
          <div className="text-center pt-2 text-[11px] text-slate-600">
            This is a Computer Generated Invoice
          </div>
        </div>
      </div>
    </div>
  );
}
