/** Robust date parsing for CSV/XLSX values (ISO strings, US dates, Excel serials). */
function toDate(v) {
  if (v === undefined || v === null || v === '') return undefined;
  if (v instanceof Date) return isNaN(v) ? undefined : v;
  if (typeof v === 'number') {
    // Excel serial date -> JS Date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d) ? undefined : d;
  }
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d)) return d;
  // Try DD/MM/YYYY and DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [, a, b, y] = m;
    const year = y.length === 2 ? Number('20' + y) : Number(y);
    const d2 = new Date(year, Number(b) - 1, Number(a));
    return isNaN(d2) ? undefined : d2;
  }
  return undefined;
}

function toNumber(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? undefined : n;
}

const str = (v) => (v === undefined || v === null ? '' : String(v).trim());

module.exports = { toDate, toNumber, str };
