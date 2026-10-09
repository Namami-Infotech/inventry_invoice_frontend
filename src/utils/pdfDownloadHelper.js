/**
 * Helper to ensure reliable PDF downloads on all platforms (Mobile Android, iOS, Windows, Mac)
 * specifically targeting the standard system "Downloads" directory.
 */

/**
 * Sanitizes invoice number into a safe, valid file name.
 * Prevents slashes, colons, or illegal characters from breaking file paths
 * or causing mobile browsers to dump files into strange temp folders.
 */
export function sanitizeInvoiceFilename(invoiceNumber) {
  if (!invoiceNumber) return 'Tax_Invoice.pdf';
  
  // Replace illegal characters (/ \ ? % * : | " < > #) and whitespace
  const sanitized = String(invoiceNumber)
    .replace(/[/\\?%*:|"<>#]/g, '-')
    .replace(/\s+/g, '_')
    .trim();

  if (!sanitized.toLowerCase().endsWith('.pdf')) {
    return `${sanitized}.pdf`;
  }
  return sanitized;
}

/**
 * Downloads a PDF document reliably to the device's default Downloads folder.
 * Uses explicit application/pdf Blob and standard HTML5 download anchor attached to DOM.
 * 
 * @param {jsPDF|Blob} pdfOrBlob - The jsPDF instance or raw PDF Blob
 * @param {string} rawFileName - The desired filename (e.g., '2026-0007.pdf')
 * @returns {Promise<{ fileName: string, blob: Blob }>}
 */
export async function downloadInvoicePdf(pdfOrBlob, rawFileName = 'Tax_Invoice.pdf') {
  const fileName = sanitizeInvoiceFilename(rawFileName);

  // 1. Extract proper Blob
  let blob;
  if (pdfOrBlob instanceof Blob) {
    blob = pdfOrBlob;
  } else if (pdfOrBlob && typeof pdfOrBlob.output === 'function') {
    blob = pdfOrBlob.output('blob');
  } else {
    throw new Error('Valid PDF instance or Blob is required for download');
  }

  // Ensure explicit application/pdf MIME type so Android & iOS Download Managers
  // recognize it as a document and route directly to the "Downloads" directory.
  const pdfBlob =
    blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });

  // 2. Generate Object URL
  const blobUrl = window.URL.createObjectURL(pdfBlob);

  // 3. Create download anchor attached to DOM (required for mobile Chrome/Safari)
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = blobUrl;
  link.download = fileName;
  link.setAttribute('download', fileName);
  link.target = '_self';
  link.rel = 'noopener';

  document.body.appendChild(link);
  link.click();

  // 4. Revoke blob URL after a generous delay (15 seconds) so mobile OS
  // download manager has completely finished reading the blob stream into the Downloads folder.
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Ignore cleanup error
    }
  }, 15000);

  return { fileName, blob: pdfBlob };
}
