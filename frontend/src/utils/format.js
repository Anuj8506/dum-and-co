export const money = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);
export const time = (date) =>
  date
    ? new Intl.DateTimeFormat('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(date))
    : '—';
export const label = (status) =>
  ({
    awaiting_payment: 'Awaiting payment',
    confirmed: 'Order received',
    preparing: 'On the dum',
    ready: 'Ready for pickup',
    handed_off: 'Handed over',
    cancelled: 'Cancelled',
  })[status] || status;
