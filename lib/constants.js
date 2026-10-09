export const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'haldi', label: 'Haldi' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'bride_to_be', label: 'Bride to Be' },
  { value: 'groom_to_be', label: 'Groom to Be' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate' },
];

export const typeLabel = (v) => EVENT_TYPES.find((t) => t.value === v)?.label ?? v ?? '';

export const COMPANY = {
  name: 'RareLuxe Rentals',
  lines: [
    'Event management, party equipment, décor and',
    'functional décor rentals',
    'Aluva, Pukkattupady, Kochi',
    '395Q+HWQ, Meadows Ln, Pukkattupady,',
    'Kerala 683561, India',
  ],
  signatory: 'Ashna Nawas',
  signatureCaption: 'Authorized Signature, RareLuxe Rentals',
  thankYou: 'Thank you for choosing RareLuxe Rentals',
};

export const TERMS = [
  'Rates are as quoted above; GST and any additional charges are not included unless stated.',
  'Advance payment is required to confirm the booking; balance on or before the event day.',
  'Damage or loss of rented items will be charged to the client.',
  'This quotation is valid for 15 days from the date of issue.',
];

export const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

// "2026-10-09" -> "09/10/2026"
export const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const todayDMY = () => new Date().toLocaleDateString('en-GB');

export const eventTitle = (event) =>
  event?.title?.trim() || `${typeLabel(event?.type)} Décor`;

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // keeps admin uploads under Vercel's 4.5 MB body limit
