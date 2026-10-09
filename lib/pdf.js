import { COMPANY, TERMS, inr, fmtDate, eventTitle } from './constants';
import { LOGO_DATA_URL, LOGO_RATIO } from './logoData';

const C = {
  bg: [253, 247, 238],
  dark: [31, 58, 61],
  gold: [169, 133, 45],
  glow: [232, 200, 106],
  brown: [139, 111, 71],
  text: [45, 45, 45],
  band: [247, 240, 222],
  navy: [30, 45, 110],
};

// Loads an image URL and returns { dataUrl, w, h } (JPEG, downscaled) or null.
export function loadImage(url, maxDim = 1400) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.88), w, h });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function chrome(doc) {
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, 210, 297, 'F');

  // hanging lights on a gently curved string (matches the sample quotation)
  const swag = (x) => 6.5 - 3.2 * Math.sin((Math.PI * x) / 210);
  doc.setDrawColor(...C.dark);
  doc.setLineWidth(0.25);
  for (let x = 0; x < 210; x += 5) doc.line(x, swag(x), x + 5, swag(x + 5));
  const COUNT = 22;
  for (let i = 0; i < COUNT; i++) {
    const x = 1.5 + i * (207 / (COUNT - 1));
    const bulbY = 11 + ((i * 7) % 4) * 1.6;
    doc.setDrawColor(...C.dark);
    doc.setLineWidth(0.2);
    doc.line(x, swag(x), x, bulbY);
    doc.setFillColor(...(i % 2 ? C.dark : C.gold));
    doc.circle(x, bulbY + 1.4, 1.4, 'F');
    doc.setFillColor(...C.bg);
    doc.circle(x, bulbY + 1.4, 0.45, 'F');
  }

  // double gold border
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.rect(9, 20, 192, 268);
  doc.setLineWidth(0.15);
  doc.rect(11, 22, 188, 264);
  doc.setFillColor(...C.gold);
  doc.circle(9, 288, 1.6, 'F');
  doc.circle(201, 288, 1.6, 'F');
}

export async function buildQuotationPdf({ event, client, items, themeUrl, total }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const themeImg = await loadImage(themeUrl);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  chrome(doc);

  // Logo (real RareLuxe logo image)
  const logoW = 38;
  doc.addImage(LOGO_DATA_URL, 'PNG', 20.5, 24, logoW, logoW / LOGO_RATIO);

  // Company block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.dark);
  doc.text(COMPANY.name, 196, 28, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.text);
  COMPANY.lines.forEach((l, i) => doc.text(l, 196, 32.8 + i * 3.7, { align: 'right' }));

  // Title bar
  doc.setFillColor(...C.dark);
  doc.rect(14, 60, 182, 10, 'F');
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.glow);
  doc.text('Q U O T A T I O N', 105, 67, { align: 'center' });

  // Details box
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.3);
  doc.rect(14, 73, 182, 24);
  const label = (t, x, y) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.gold);
    doc.text(t, x, y);
  };
  const value = (t, x, y) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.dark);
    doc.text(String(t || ''), x, y);
  };
  label('CLIENT NAME', 18, 79);
  value(client?.name, 18, 84);
  label('EVENT DATE', 18, 89);
  value(fmtDate(event?.date), 18, 94);
  label('EVENT TYPE', 108, 79);
  value(eventTitle(event), 108, 84);
  label('QUOTATION DATE', 108, 89);
  value(new Date().toLocaleDateString('en-GB'), 108, 94);

  // Items table
  autoTable(doc, {
    startY: 101,
    margin: { left: 14, right: 14, top: 30, bottom: 20 },
    theme: 'plain',
    head: [['#', 'DESCRIPTION', 'QTY', 'RATE (Rs.)', 'AMOUNT (Rs.)']],
    body: items.map((it, i) => [
      i + 1,
      it.name,
      `${it.quantity}`,
      inr(it.rate),
      inr(it.quantity * it.rate),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      textColor: C.text,
      cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 },
    },
    headStyles: { fillColor: C.gold, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: C.band },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    willDrawPage: () => {
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) chrome(doc);
    },
  });

  let y = doc.lastAutoTable.finalY;
  const ensure = (h) => {
    if (y + h > 282) {
      doc.addPage();
      chrome(doc);
      y = 30;
    }
  };
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.3);
  doc.line(14, y, 196, y);

  // Totals
  ensure(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.dark);
  doc.text('SUB TOTAL', 146, y + 7, { align: 'right' });
  doc.text(inr(total), 193, y + 7, { align: 'right' });
  y += 11;
  doc.setFillColor(...C.dark);
  doc.rect(14, y, 182, 10, 'F');
  doc.setTextColor(...C.glow);
  doc.setFontSize(10.5);
  doc.text('GRAND TOTAL (Rs.)', 146, y + 6.8, { align: 'right' });
  doc.text(inr(total), 193, y + 6.8, { align: 'right' });
  y += 10;

  // Theme + terms + signature
  y += 9;
  if (y + 64 > 250) {
    doc.addPage();
    chrome(doc);
    y = 34;
  }
  const imgW = 82;
  const imgH = 58;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.text('THEME REFERENCE', 14, y);
  doc.text('TERMS & CONDITIONS', 108, y);

  const boxY = y + 3;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.rect(14, boxY, imgW, imgH, 'FD');
  if (themeImg) {
    const s = Math.min(imgW / themeImg.w, imgH / themeImg.h);
    const w = themeImg.w * s;
    const h = themeImg.h * s;
    doc.addImage(themeImg.dataUrl, 'JPEG', 14 + (imgW - w) / 2, boxY + (imgH - h) / 2, w, h);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('No theme image selected', 14 + imgW / 2, boxY + imgH / 2, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.text);
  let ty = y + 6;
  TERMS.forEach((t, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${t}`, 88);
    doc.text(lines, 108, ty);
    ty += lines.length * 3.7 + 1.5;
  });

  // Signature line + thank-you, pinned to the bottom of the last page (as in the sample)
  const SIG_X2 = 196;
  // Space above the rule is intentionally left blank: the quotation is signed by hand.
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.3);
  doc.line(126, 269, SIG_X2, 269);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.dark);
  doc.text(COMPANY.signatory, SIG_X2, 273, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.text);
  doc.text(COMPANY.signatureCaption, SIG_X2, 276.6, { align: 'right' });

  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...C.dark);
  doc.text(COMPANY.thankYou, 105, 283, { align: 'center' });

  return doc.output('blob');
}
