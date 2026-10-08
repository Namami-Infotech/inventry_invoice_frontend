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
 * Formats a professional Tax Invoice message for WhatsApp.
 */
export function formatWhatsAppInvoiceMessage({ invoice, company }) {
  const companyName = company?.companyName || company?.name || 'MY ELECTRICYCLE SHOP';
  const invNum = invoice?.invoiceNumber || 'INV';
  const invDate = invoice?.invoiceDate || new Date().toISOString().split('T')[0];
  const customerName = invoice?.customerName || 'Valued Customer';
  const total = Number(invoice?.grandTotal || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `🧾 *TAX INVOICE - ${companyName}*
━━━━━━━━━━━━━━━━━━━━
*Invoice No:* ${invNum}
*Date:* ${invDate}
*Customer:* ${customerName}
*Grand Total:* ₹${total}
━━━━━━━━━━━━━━━━━━━━
📎 *Attached PDF:* ${invNum}.pdf
🙏 Thank you for doing business with us!`;
}

/**
 * Opens WhatsApp Web in a new tab with phone number and pre-filled message.
 */
export function openWhatsAppWeb({ phone, message }) {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  const url = cleanPhone
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://web.whatsapp.com/send?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Opens WhatsApp App (Mobile direct link / Universal Link) with phone number and pre-filled message.
 */
export function openWhatsAppApp({ phone, message }) {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
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
