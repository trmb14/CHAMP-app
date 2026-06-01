import { format, parseISO } from 'date-fns';

export function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

export function formatDate(dateStr, fmt = 'MMM d, yyyy') {
  if (!dateStr) return '';
  try {
    return format(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr, fmt);
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export function formatHours(hours) {
  const h = parseFloat(hours || 0);
  return `${h.toFixed(1)} hrs`;
}

export const POSITIONS = ['PSW', 'RPN', 'HSKP', 'UCP', 'SRV'];
export const POSITION_LABELS = {
  PSW: 'Personal Support Worker',
  RPN: 'Registered Practical Nurse',
  HSKP: 'Housekeeping',
  UCP: 'Unregulated Care Provider',
  SRV: 'Service Worker',
};
