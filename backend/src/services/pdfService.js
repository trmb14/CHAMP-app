const PDFDocument = require('pdfkit');
const { format } = require('date-fns');

const NAVY = '#1F4E79';
const GREEN = '#7AA84A';
const LIGHT_BLUE = '#D9E2F3';
const WHITE = '#FFFFFF';
const GRAY = '#666666';

function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

async function generatePaystubPDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const { employee, payroll, shifts, payPeriod } = data;
    const pageWidth = doc.page.width - 80;

    // Header background
    doc.rect(40, 40, pageWidth, 70).fill(NAVY);

    // CHAMP Logo text
    doc.fillColor(WHITE).fontSize(24).font('Helvetica-Bold')
      .text('CHAMP', 60, 55);
    doc.fontSize(9).font('Helvetica')
      .text('HEALTH CARE SERVICES', 60, 83);

    // Cross icon
    doc.fillColor(GREEN).rect(160, 58, 8, 20).fill();
    doc.fillColor(GREEN).rect(154, 64, 20, 8).fill();

    // PAY STATEMENT
    doc.fillColor(WHITE).fontSize(14).font('Helvetica-Bold')
      .text('PAY STATEMENT', 0, 62, { align: 'center' });

    doc.fillColor(NAVY).fontSize(10);

    let y = 130;

    // Employee info
    doc.rect(40, y, pageWidth / 2 - 5, 80).fill(LIGHT_BLUE);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9).text('EMPLOYEE', 50, y + 8);
    doc.font('Helvetica').fontSize(10).fillColor('#000000')
      .text(employee.name, 50, y + 22)
      .text(employee.position || '', 50, y + 36)
      .text(employee.phone || '', 50, y + 50);

    doc.rect(doc.page.width / 2 + 5, y, pageWidth / 2 - 5, 80).fill(LIGHT_BLUE);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9).text('PAY PERIOD', doc.page.width / 2 + 15, y + 8);
    doc.font('Helvetica').fontSize(10).fillColor('#000000')
      .text(`${format(new Date(payPeriod.start_date + 'T12:00:00'), 'MMM d, yyyy')} – ${format(new Date(payPeriod.end_date + 'T12:00:00'), 'MMM d, yyyy')}`,
        doc.page.width / 2 + 15, y + 22)
      .text(`Pay Date: ${format(new Date(), 'MMMM d, yyyy')}`, doc.page.width / 2 + 15, y + 36)
      .text(`Pay Rate: ${formatCurrency(employee.pay_rate)}/hr`, doc.page.width / 2 + 15, y + 50);

    y += 100;

    // Shifts table header
    doc.rect(40, y, pageWidth, 20).fill(NAVY);
    const cols = [40, 100, 180, 240, 310, 370, 430, 500];
    const headers = ['Date', 'Client', 'Position', 'Time In', 'Time Out', 'Hours', 'Rate', 'Amount'];
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8);
    headers.forEach((h, i) => doc.text(h, cols[i] + 3, y + 6, { width: (cols[i + 1] || 560) - cols[i] - 6 }));

    y += 20;
    let rowIndex = 0;
    for (const shift of shifts) {
      const rowColor = rowIndex % 2 === 0 ? WHITE : '#F5F8FF';
      doc.rect(40, y, pageWidth, 18).fill(rowColor);
      doc.fillColor('#000000').font('Helvetica').fontSize(8);
      const rate = shift.is_statutory_holiday
        ? parseFloat(employee.pay_rate) * 1.5
        : parseFloat(employee.pay_rate);
      const amount = parseFloat(shift.payroll_hours) * rate;
      const rowData = [
        format(new Date(shift.shift_date + 'T12:00:00'), 'MMM d'),
        (shift.client_abbreviation || shift.client_name || '').substring(0, 8),
        shift.position,
        formatTime(shift.time_in),
        formatTime(shift.time_out),
        parseFloat(shift.payroll_hours).toFixed(1),
        formatCurrency(rate),
        formatCurrency(amount),
      ];
      rowData.forEach((d, i) => doc.text(d, cols[i] + 3, y + 5, { width: (cols[i + 1] || 560) - cols[i] - 6 }));
      y += 18;
      rowIndex++;
    }

    y += 15;

    // Earnings & Deductions
    const halfW = pageWidth / 2 - 10;

    // Earnings
    doc.rect(40, y, halfW, 24).fill(NAVY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9).text('EARNINGS', 50, y + 7);
    y += 24;
    doc.rect(40, y, halfW, 20).fill(LIGHT_BLUE);
    doc.fillColor('#000000').font('Helvetica').fontSize(9)
      .text('Gross Pay', 50, y + 6)
      .text(formatCurrency(payroll.gross_pay), 40 + halfW - 70, y + 6);
    doc.rect(40, y, halfW, 20).stroke(LIGHT_BLUE);

    y += 20;

    // Deductions
    const dX = 40 + halfW + 20;
    let dy = y - 44;
    doc.rect(dX, dy, halfW, 24).fill(NAVY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9).text('DEDUCTIONS', dX + 10, dy + 7);
    dy += 24;

    const deductions = [
      { label: 'CPP (5.95%)', value: payroll.cpp_deduction },
      { label: 'EI (1.63%)', value: payroll.ei_deduction },
      { label: 'Income Tax', value: payroll.income_tax },
      { label: 'Uber / Misc', value: payroll.uber_misc_deduction },
    ];

    for (const ded of deductions) {
      doc.rect(dX, dy, halfW, 20).fill(dy % 40 < 20 ? LIGHT_BLUE : WHITE);
      doc.fillColor('#000000').font('Helvetica').fontSize(9)
        .text(ded.label, dX + 10, dy + 6)
        .text(formatCurrency(ded.value), dX + halfW - 70, dy + 6);
      dy += 20;
    }

    const totalDeductions = (
      parseFloat(payroll.cpp_deduction || 0) +
      parseFloat(payroll.ei_deduction || 0) +
      parseFloat(payroll.income_tax || 0) +
      parseFloat(payroll.uber_misc_deduction || 0)
    );

    doc.rect(dX, dy, halfW, 22).fill('#E8F0E8');
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9)
      .text('Total Deductions', dX + 10, dy + 7)
      .text(formatCurrency(totalDeductions), dX + halfW - 70, dy + 7);

    y = Math.max(y + 20, dy + 35);

    // NET PAY
    doc.rect(40, y, pageWidth, 40).fill(NAVY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(16)
      .text('NET PAY', 60, y + 12);
    doc.fontSize(18).text(formatCurrency(payroll.net_pay), 0, y + 11, { align: 'right', width: pageWidth + 40 });

    y += 55;

    if (shifts.some(s => s.is_statutory_holiday)) {
      doc.fillColor(NAVY).font('Helvetica-Oblique').fontSize(8)
        .text('* Statutory holiday shifts calculated at 1.5x pay rate as per Ontario ESA.', 40, y);
      y += 15;
    }

    // Footer
    const footerY = doc.page.height - 60;
    doc.rect(40, footerY - 5, pageWidth, 1).fill(LIGHT_BLUE);
    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text('920 Lesage Way Orleans, ON K1W 0N3  |  Tel: 613-824-5065  |  champottawacsi@gmail.com',
        40, footerY + 5, { align: 'center', width: pageWidth });

    doc.end();
  });
}

async function generateInvoicePDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const { invoice, client, lineItems } = data;
    const pageWidth = doc.page.width - 80; // 532pt usable

    // Header
    doc.rect(40, 40, pageWidth, 68).fill(NAVY);
    doc.fillColor(WHITE).fontSize(26).font('Helvetica-Bold').text('CHAMP', 60, 52);
    doc.fontSize(10).font('Helvetica').text('HEALTH CARE SERVICES', 60, 82);

    // Cross icon
    doc.fillColor(GREEN).rect(165, 56, 8, 22).fill();
    doc.fillColor(GREEN).rect(157, 64, 24, 8).fill();

    // Invoice details top right (safe date parsing with T12:00:00)
    const invoiceDateStr = invoice.invoice_date
      ? format(new Date(invoice.invoice_date + 'T12:00:00'), 'MMMM d, yyyy')
      : format(new Date(), 'MMMM d, yyyy');
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(12)
      .text(`Invoice No: ${invoice.invoice_number}`, 350, 50, { width: pageWidth - 310, align: 'right' });
    doc.font('Helvetica').fontSize(11)
      .text(`Invoice Date: ${invoiceDateStr}`, 350, 68, { width: pageWidth - 310, align: 'right' });

    let y = 128;

    // INVOICE title
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18).text('INVOICE', 40, y);
    y += 28;

    // Client block — 12pt text, taller box
    doc.rect(40, y, 260, 132).fill(LIGHT_BLUE);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text('BILL TO', 52, y + 10);
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(14).text(client.name, 52, y + 26);
    doc.font('Helvetica').fontSize(12)
      .text(client.address || '', 52, y + 46)
      .text(`${client.city}, ${client.province}  ${client.postal_code || ''}`, 52, y + 62)
      .text(`Tel: ${client.phone || ''}`, 52, y + 78)
      .text(client.fax ? `Fax: ${client.fax}` : '', 52, y + 94)
      .text(client.contact_name ? `Attn: ${client.contact_name}` : '', 52, y + 110);

    // Service period (right side)
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10)
      .text('Service Period', doc.page.width - 210, y + 10);
    doc.fillColor('#000000').font('Helvetica').fontSize(12)
      .text(`${format(new Date(invoice.week_start + 'T12:00:00'), 'MMM d, yyyy')}`, doc.page.width - 210, y + 28)
      .text(`to ${format(new Date(invoice.week_end + 'T12:00:00'), 'MMM d, yyyy')}`, doc.page.width - 210, y + 46);

    y += 148;

    // Line items table — 11pt headers and rows
    const tCols = [40, 110, 200, 272, 344, 412, 476, 572];
    const tHeaders = ['Date', 'Shift Hours', 'Position', 'Time In', 'Time Out', 'Rate', 'Total'];

    doc.rect(40, y, pageWidth, 26).fill(NAVY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(11);
    tHeaders.forEach((h, i) => {
      doc.text(h, tCols[i] + 4, y + 8, { width: tCols[i + 1] - tCols[i] - 8 });
    });
    y += 26;

    let rowIndex = 0;
    for (const item of lineItems) {
      const rowColor = rowIndex % 2 === 0 ? WHITE : '#EEF3FB';
      doc.rect(40, y, pageWidth, 24).fill(rowColor);
      const textColor = item.is_statutory ? '#7B2D00' : '#000000';
      doc.fillColor(textColor).font('Helvetica').fontSize(11);
      const rowData = [
        format(new Date(item.date_of_service + 'T12:00:00'), 'MMM d, yyyy'),
        `${parseFloat(item.shift_hours).toFixed(1)} hrs${item.is_statutory ? '*' : ''}`,
        item.position,
        formatTime(item.time_in),
        formatTime(item.time_out),
        formatCurrency(item.rate),
        formatCurrency(item.total),
      ];
      rowData.forEach((d, i) => {
        doc.text(d, tCols[i] + 4, y + 7, { width: tCols[i + 1] - tCols[i] - 8 });
      });
      y += 24;
      rowIndex++;
    }

    y += 22;

    // Totals — 12pt Sub-Total and HST, 14pt TOTAL
    const totalsX = 370;
    const totalsW = pageWidth - (totalsX - 40);

    doc.rect(totalsX, y, totalsW, 28).fill(LIGHT_BLUE);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12)
      .text('Sub-Total', totalsX + 10, y + 8)
      .text(formatCurrency(invoice.subtotal), totalsX + totalsW - 90, y + 8);

    doc.rect(totalsX, y + 28, totalsW, 28).fill(WHITE);
    doc.fillColor('#000000').font('Helvetica').fontSize(12)
      .text('HST (13%)', totalsX + 10, y + 36)
      .text(formatCurrency(invoice.hst_amount), totalsX + totalsW - 90, y + 36);

    doc.rect(totalsX, y + 56, totalsW, 34).fill(NAVY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(14)
      .text('TOTAL DUE', totalsX + 10, y + 65)
      .text(formatCurrency(invoice.total_due), totalsX + totalsW - 100, y + 65);

    // HST number and statutory note (left of totals)
    doc.fillColor(NAVY).font('Helvetica').fontSize(10)
      .text('HST# 824640858RT0001', 40, y + 8);

    if (lineItems.some(i => i.is_statutory)) {
      doc.fillColor('#7B2D00').font('Helvetica-Oblique').fontSize(10)
        .text('* Statutory holiday shifts billed at double rate.', 40, y + 28);
    }

    y += 105;

    // Comments
    doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(11)
      .text('"Thank you for your business."', 40, y);

    // Signature line
    y += 32;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text('Authorized Signature:', 40, y);
    doc.rect(190, y + 18, 180, 1).fill(NAVY);
    doc.fillColor(GRAY).font('Helvetica').fontSize(10).text('CHAMP Health Care Services', 190, y + 24);

    // Footer
    const footerY = doc.page.height - 52;
    doc.rect(40, footerY - 5, pageWidth, 1).fill(LIGHT_BLUE);
    doc.fillColor(GRAY).font('Helvetica').fontSize(10)
      .text('920 Lesage Way Orleans, Ontario K1W 0N3  |  Tel: 613 824-5065  |  Fax: 613 366-3271  |  champottawacsi@gmail.com',
        40, footerY + 5, { align: 'center', width: pageWidth });

    doc.end();
  });
}

async function generatePayrollSummaryPDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const { payrollRecords, payPeriod } = data;
    const pageWidth = doc.page.width - 80;

    // Header
    doc.rect(40, 40, pageWidth, 60).fill(NAVY);
    doc.fillColor(WHITE).fontSize(22).font('Helvetica-Bold').text('CHAMP', 60, 52);
    doc.fontSize(8).font('Helvetica').text('HEALTH CARE SERVICES', 60, 78);
    doc.fillColor(GREEN).rect(155, 55, 6, 18).fill();
    doc.fillColor(GREEN).rect(149, 61, 18, 6).fill();
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(12).text('PAYROLL SUMMARY', 0, 63, { align: 'center' });

    let y = 120;

    // Period info
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10)
      .text(`Pay Period: ${format(new Date(payPeriod.start_date + 'T12:00:00'), 'MMMM d, yyyy')} – ${format(new Date(payPeriod.end_date + 'T12:00:00'), 'MMMM d, yyyy')}`, 40, y);
    doc.font('Helvetica').fontSize(9).fillColor(GRAY)
      .text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 40, y + 14);
    y += 40;

    // Table header
    const cols = [40, 180, 260, 330, 380, 430, 490];
    const headers = ['Employee', 'Position', 'Hours', 'Gross Pay', 'CPP', 'EI', 'Net Pay'];
    doc.rect(40, y, pageWidth, 22).fill(NAVY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8);
    headers.forEach((h, i) => {
      const align = i > 1 ? 'right' : 'left';
      doc.text(h, cols[i] + 3, y + 7, { width: (cols[i + 1] || 555) - cols[i] - 6, align });
    });
    y += 22;

    let totalGross = 0, totalNet = 0, totalHours = 0, totalCPP = 0, totalEI = 0;

    payrollRecords.forEach((rec, idx) => {
      const bg = idx % 2 === 0 ? WHITE : '#F5F8FF';
      doc.rect(40, y, pageWidth, 18).fill(bg);
      doc.fillColor('#000000').font('Helvetica').fontSize(8);
      const rowData = [
        rec.employee_name || '—',
        rec.employee_position || '—',
        parseFloat(rec.total_hours || 0).toFixed(1),
        formatCurrency(rec.gross_pay),
        formatCurrency(rec.cpp_deduction),
        formatCurrency(rec.ei_deduction),
        formatCurrency(rec.net_pay),
      ];
      rowData.forEach((d, i) => {
        const align = i > 1 ? 'right' : 'left';
        doc.text(d, cols[i] + 3, y + 5, { width: (cols[i + 1] || 555) - cols[i] - 6, align });
      });
      totalGross += parseFloat(rec.gross_pay || 0);
      totalNet += parseFloat(rec.net_pay || 0);
      totalHours += parseFloat(rec.total_hours || 0);
      totalCPP += parseFloat(rec.cpp_deduction || 0);
      totalEI += parseFloat(rec.ei_deduction || 0);
      y += 18;
    });

    // Totals row
    doc.rect(40, y, pageWidth, 22).fill(LIGHT_BLUE);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8);
    const totals = ['TOTAL', '', totalHours.toFixed(1), formatCurrency(totalGross), formatCurrency(totalCPP), formatCurrency(totalEI), formatCurrency(totalNet)];
    totals.forEach((d, i) => {
      const align = i > 1 ? 'right' : 'left';
      doc.text(d, cols[i] + 3, y + 7, { width: (cols[i + 1] || 555) - cols[i] - 6, align });
    });
    y += 35;

    // Net pay highlight
    doc.rect(40, y, pageWidth, 36).fill(NAVY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(14)
      .text(`Total Net Payroll: ${formatCurrency(totalNet)}`, 0, y + 11, { align: 'center' });

    // Footer
    const footerY = doc.page.height - 55;
    doc.rect(40, footerY - 5, pageWidth, 1).fill(LIGHT_BLUE);
    doc.fillColor(GRAY).font('Helvetica').fontSize(7.5)
      .text('920 Lesage Way Orleans, Ontario K1W 0N3  |  Tel: 613 824-5065  |  champottawacsi@gmail.com',
        40, footerY + 5, { align: 'center', width: pageWidth });

    doc.end();
  });
}

module.exports = { generatePaystubPDF, generateInvoicePDF, generatePayrollSummaryPDF };
