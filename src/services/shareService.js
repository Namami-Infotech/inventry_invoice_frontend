/**
 * Service to handle Web Share API, WhatsApp sharing (Web & App), and phone formatting.
 */

export const ShareStatus = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  OPENING: 'opening',
  SUCCESS: 'success',
  CANCELLED: 'cancelled',
  ERROR: 'error',
  UNSUPPORTED: 'unsupported'
};

/**
 * Checks whether the current device/browser supports Web Share API with File attachments.
 */
export function checkFileShareSupport(testFile = null) {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return {
      supported: false,
      reason: 'Web Share API (navigator.share) is not available in this browser.'
    };
  }

  if (!navigator.canShare) {
    return {
      supported: false,
      reason: 'navigator.canShare is not supported in this browser.'
    };
  }

  try {
    const dummyFile = testFile || new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const canShareFiles = navigator.canShare({ files: [dummyFile] });
    if (!canShareFiles) {
      return {
        supported: false,
        reason: 'This browser supports text sharing, but does not support direct PDF file sharing.'
      };
    }
    return { supported: true, reason: '' };
  } catch (err) {
    return {
      supported: false,
      reason: err.message || 'Failed to check file share capability.'
    };
  }
}

/**
 * Clean and format Indian phone number to international format with country code.
 * e.g. "9876543210" -> "919876543210"
 * "+91 98765 43210" -> "919876543210"
 */
export function cleanPhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // already 91XXXXXXXXXX
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Extract clean 10-digit mobile number suitable for UI input display.
 * e.g. "+91 98765 43210" -> "9876543210"
 * "919876543210" -> "9876543210"
 * "09876543210" -> "9876543210"
 */
export function extract10DigitPhone(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.substring(1);
  }
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Formats a comprehensive and professional Tax Invoice message for WhatsApp.
 */
export function formatWhatsAppInvoiceMessage({ invoice, company }) {
  const companyName = company?.companyName || company?.name || 'MY ELECTRICYCLE SHOP';
  const invNum = invoice?.invoiceNumber || 'INV';
  
  // Format date nicely
  let invDate = invoice?.invoiceDate || '';
  if (invDate) {
    try {
      const d = new Date(invDate);
      if (!isNaN(d.getTime())) {
        invDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch (e) {}
  }
  if (!invDate) {
    invDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const customerName = invoice?.customerName || 'Valued Customer';
  const items = invoice?.items || [];

  let itemsSummary = '';
  if (items.length > 0) {
    itemsSummary = items.map((it, idx) => {
      const name = it.itemName || it.name || `Item ${idx + 1}`;
      const qty = Number(it.qty || it.quantity || 1);
      const unit = it.unit || 'Pcs';
      const rateNum = Number(it.pricePerUnit !== undefined && it.pricePerUnit !== null ? it.pricePerUnit : (it.rate || it.price || 0));
      const rate = rateNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const lineTotalNum = Number(it.taxableAmount !== undefined && it.taxableAmount !== null ? it.taxableAmount : (it.totalAmount || it.amount || (qty * rateNum)));
      const lineTotal = lineTotalNum.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return `${idx + 1}. *${name}* (${qty} ${unit} × ₹${rate}) = ₹${lineTotal}`;
    }).join('\n');
  }

  const subtotalVal = Number(invoice?.subtotal !== undefined && invoice?.subtotal !== null ? invoice.subtotal : (invoice?.taxableAmount || invoice?.subTotal || 0));
  const taxable = subtotalVal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const totalCgst = Number(invoice?.totalCgst || 0);
  const totalSgst = Number(invoice?.totalSgst || 0);
  const totalIgst = Number(invoice?.totalIgst || 0);
  const grandTotal = Number(invoice?.grandTotal || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  let message = `🧾 *TAX INVOICE - ${companyName}*
━━━━━━━━━━━━━━━━━━━━
*Invoice No:* ${invNum}
*Date:* ${invDate}
*Customer:* ${customerName}
━━━━━━━━━━━━━━━━━━━━`;

  if (itemsSummary) {
    message += `\n*ITEMS:*
${itemsSummary}
━━━━━━━━━━━━━━━━━━━━`;
  }

  if (Number(invoice?.taxableAmount || invoice?.subTotal || 0) > 0) {
    message += `\n*Taxable Amount:* ₹${taxable}`;
  }
  if (totalCgst > 0) {
    message += `\n*CGST:* ₹${totalCgst.toFixed(2)}`;
  }
  if (totalSgst > 0) {
    message += `\n*SGST:* ₹${totalSgst.toFixed(2)}`;
  }
  if (totalIgst > 0) {
    message += `\n*IGST:* ₹${totalIgst.toFixed(2)}`;
  }

  message += `\n*GRAND TOTAL:* ₹${grandTotal}
━━━━━━━━━━━━━━━━━━━━
📎 *Invoice File:* ${invNum}.pdf
🙏 Thank you for doing business with us!`;

  return message;
}

/**
 * Directly opens WhatsApp chat targeting the exact customer phone number with pre-filled message.
 * Does NOT prompt user to choose a contact or person.
 */
export function openWhatsAppDirect({ phone, message }) {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);

  if (!cleanPhone) {
    throw new Error('Customer phone number is required for direct WhatsApp navigation');
  }

  const isMobile = typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const deepLink = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  const universalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

  if (isMobile) {
    // Mobile: open WhatsApp app directly to customer chat
    window.location.href = deepLink;
    setTimeout(() => {
      if (document.hasFocus && document.hasFocus()) {
        window.location.href = universalUrl;
      }
    }, 1000);
  } else {
    // Desktop: directly launch WhatsApp desktop app or open customer chat URL
    // Trigger deep link for WhatsApp Desktop app
    window.location.href = deepLink;
    setTimeout(() => {
      if (document.hasFocus && document.hasFocus()) {
        window.open(universalUrl, '_blank', 'noopener,noreferrer');
      }
    }, 1200);
  }
}

/**
 * Opens WhatsApp Web in a new tab with phone number and pre-filled message.
 * On mobile devices (where web.whatsapp.com is blocked by WhatsApp), automatically
 * routes to WhatsApp mobile intent so it opens smoothly on phone.
 */
export function openWhatsAppWeb({ phone, message }) {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);

  const isMobile = typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // Phone browsers cannot load web.whatsapp.com (WhatsApp blocks mobile browsers).
    // On mobile phone, open WhatsApp directly with customer phone & pre-filled message!
    const mobileUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    window.location.href = mobileUrl;
  } else {
    // Desktop: opens web.whatsapp.com
    const desktopUrl = cleanPhone
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://web.whatsapp.com/send?text=${encodedText}`;
    window.open(desktopUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Opens WhatsApp App (Mobile direct link / Universal Link) with phone number and pre-filled message.
 */
export function openWhatsAppApp({ phone, message }) {
  return openWhatsAppDirect({ phone, message });
}

/**
 * Share invoice PDF file via Native Share Sheet (for mobile devices / supported browsers).
 */
export async function shareInvoiceFile({
  file,
  title = 'Tax Invoice',
  text = 'Please find attached the Tax Invoice PDF.'
}) {
  if (!file || !(file instanceof File)) {
    throw new Error('A valid PDF File object is required for file sharing.');
  }

  const support = checkFileShareSupport(file);
  if (!support.supported) {
    return {
      success: false,
      unsupported: true,
      reason: support.reason
    };
  }

  try {
    await navigator.share({
      title,
      text,
      files: [file]
    });
    return { success: true };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, cancelled: true };
    }
    return {
      success: false,
      error: error.message || 'Failed to open native share sheet'
    };
  }
}
