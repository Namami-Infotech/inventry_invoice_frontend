/**
 * Utility functions for Date formatting across the invoicing system.
 * Standard format: DD/MM/YYYY
 */

/**
 * Format any date string or Date object to DD/MM/YYYY
 * @param {string|Date} dateVal - date in ISO (YYYY-MM-DD), Date object, etc.
 * @returns {string} - formatted as DD/MM/YYYY (e.g. 30/09/2026)
 */
export function formatDateDDMMYYYY(dateVal) {
  if (!dateVal) return '';

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed.replace(/-/g, '/');
    }
    // Check YYYY-MM-DD
    const isoParts = trimmed.split('T')[0].split('-');
    if (isoParts.length === 3 && isoParts[0].length === 4) {
      const [year, month, day] = isoParts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateVal);
  }
}

/**
 * Format date to DD-Mon-YY format (e.g. 13-Aug-26) matching standard Tax Invoice PDF
 */
export function formatDateDDMonYYYY(dateVal) {
  if (!dateVal) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  try {
    let d;
    if (typeof dateVal === 'string') {
      const clean = dateVal.trim();
      const isoParts = clean.split('T')[0].split('-');
      if (isoParts.length === 3 && isoParts[0].length === 4) {
        d = new Date(Number(isoParts[0]), Number(isoParts[1]) - 1, Number(isoParts[2]));
      } else if (clean.includes('/')) {
        const parts = clean.split('/');
        if (parts.length === 3) {
          d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          d = new Date(dateVal);
        }
      } else {
        d = new Date(dateVal);
      }
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return formatDateDDMMYYYY(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yr = String(d.getFullYear()).slice(-2);
    return `${day}-${mon}-${yr}`;
  } catch {
    return formatDateDDMMYYYY(dateVal);
  }
}

/**
 * Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD for backend storage/API
 * @param {string} ddMMyyyy
 * @returns {string} YYYY-MM-DD
 */
export function toISODate(ddMMyyyy) {
  if (!ddMMyyyy) return '';
  const clean = String(ddMMyyyy).trim().replace(/-/g, '/');
  const parts = clean.split('/');
  if (parts.length === 3 && parts[2].length === 4) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.split('T')[0];
  }
  return clean;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayISODate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
