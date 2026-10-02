/**
 * HOTEL SKY 5 - INVENTORY PDF (real file, no pop-up).
 * Built in the browser with jsPDF so it works inside WhatsApp / in-app browsers where pop-ups are blocked.
 * Full per-item detail: alerts, all items by category, full stock register.
 */
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { reportSummary } from './inventoryReport';
import { LOCATIONS, registerLists } from '../data/inventory';
import { normalizeLocation } from './inventory';
import { STATUS_COLORS, ENTRY_COLORS, statusInk, hexToRgb } from './statusColors';

const NAVY = [10, 25, 47];
const GOLD = [201, 162, 39];
const MUTED = [107, 114, 128];
// same colours as the app and the printable report
const STATUS_COLOR = Object.fromEntries(Object.keys(STATUS_COLORS).map(s => [s, hexToRgb(statusInk(s))]));
const fmtDate = (iso) => String(iso || '').split('-').reverse().join('-');
// Built-in PDF fonts are Latin-1 only; keep text in that range
const safe = (v) => String(v ?? '').replace(/[–—]/g, '-').replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

export function buildInventoryPdf(rows, transactions, { generatedAt, countDates }) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const s = reportSummary(rows, transactions);

    // Header
    doc.setFillColor(...NAVY);
    doc.roundedRect(14, 12, 34, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(6).text('HOTEL', 18, 17);
    doc.setTextColor(...GOLD).setFontSize(13).text('SKY 5', 18, 23.5);
    doc.setTextColor(...NAVY).setFontSize(16).text('Inventory Report', W - 14, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
    doc.text(safe(`Generated: ${generatedAt}`), W - 14, 23, { align: 'right' });
    doc.text(safe(`Opening stock counted: ${countDates}`), W - 14, 27, { align: 'right' });
    doc.setDrawColor(...GOLD).setLineWidth(0.8).line(14, 30, W - 14, 30);

    // KPI boxes
    const kpis = [['Total items', s.items, NAVY], ['Reorder now', s.reorder, [185, 28, 28]], ['Expired / refill', s.expiredRefill, [161, 98, 7]], ['Register entries', s.entries, NAVY]];
    const bw = (W - 28 - 9) / 4;
    kpis.forEach(([label, value, color], i) => {
        const x = 14 + i * (bw + 3);
        doc.setDrawColor(230, 232, 236).setLineWidth(0.3).roundedRect(x, 34, bw, 15, 2, 2, 'S');
        doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(...MUTED).text(label.toUpperCase(), x + 3, 39);
        doc.setFontSize(14).setTextColor(...color).text(String(value), x + 3, 46);
    });

    const heading = (text, y) => {
        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...NAVY).text(safe(text), 14, y);
        return y + 2;
    };
    const tableBase = {
        theme: 'grid',
        margin: { left: 14, right: 14, bottom: 16 },
        styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.6, lineColor: [238, 240, 243], lineWidth: 0.2, textColor: [31, 41, 55] },
        headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [250, 251, 252] },
    };
    const statusCell = (data, col) => {
        if (data.section === 'body' && data.column.index === col && STATUS_COLOR[data.cell.raw]) {
            data.cell.styles.textColor = STATUS_COLOR[data.cell.raw];
            data.cell.styles.fontStyle = 'bold';
        }
    };

    // Action required
    let y = heading(`Action required (${s.alerts.length})`, 57);
    autoTable(doc, {
        ...tableBase,
        startY: y,
        head: [['#', 'Item', 'Current', 'Status', 'Note']],
        body: s.alerts.length ? s.alerts.map((r, i) => [i + 1, safe(r.name), `${r.current} ${r.unit}`, r.status, safe(r.note ? r.note.split(': ').pop() : '')]) : [[{ content: 'None', colSpan: 5, styles: { halign: 'center', textColor: MUTED } }]],
        columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' }, 3: { cellWidth: 24 } },
        didParseCell: d => statusCell(d, 3),
    });

    // Full stock, grouped by category
    y = heading(`Full stock (${rows.length} items)`, doc.lastAutoTable.finalY + 9);
    const body = [];
    let n = 0;
    const cats = [...new Set(rows.map(r => r.category))];
    for (const cat of cats) {
        const list = rows.filter(r => r.category === cat);
        body.push([{ content: `${cat} (${list.length})`, colSpan: 9 + LOCATIONS.length, styles: { fillColor: [244, 246, 249], fontStyle: 'bold', textColor: NAVY } }]);
        for (const r of list) {
            n += 1;
            body.push([n, r.code, safe(r.name), r.unit, ...LOCATIONS.map(l => r.atLocation?.[l] ?? 0), r.stockIn || '-', r.stockOut || '-', r.current, r.min, r.status]);
        }
    }
    autoTable(doc, {
        ...tableBase,
        startY: y,
        head: [['#', 'Code', 'Item', 'Unit', ...LOCATIONS.map(l => l.replace(' Store', '').replace(' (Upar)', '')), 'In', 'Out', 'Total', 'Min', 'Status']],
        body,
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 20, textColor: MUTED }, 3: { cellWidth: 11, halign: 'center' },
            4: { halign: 'right', cellWidth: 15 }, 5: { halign: 'right', cellWidth: 16 },
            6: { halign: 'right', cellWidth: 9, textColor: [21, 128, 61] }, 7: { halign: 'right', cellWidth: 9, textColor: [194, 65, 12] },
            8: { halign: 'right', cellWidth: 12, fontStyle: 'bold' }, 9: { halign: 'right', cellWidth: 9 }, 10: { cellWidth: 21 },
        },
        didParseCell: d => statusCell(d, 10),
    });

    // Each location's register pages exactly as written, with live quantity there
    const rowByCode = Object.fromEntries(rows.map(r => [r.code, r]));
    for (const loc of LOCATIONS) {
        for (const list of registerLists.filter(l => l.location === loc)) {
            y = heading(list.title, doc.lastAutoTable.finalY + 9);
            autoTable(doc, {
                ...tableBase,
                startY: y,
                head: [['Sr.', 'Item', 'As written', 'Counted', 'Now here', 'Unit', 'Status']],
                body: list.lines.map(ln => { const r = rowByCode[ln.code]; return [ln.sr, safe(r.name), safe(ln.asWritten), ln.qty, r.atLocation?.[loc] ?? 0, r.unit, r.status]; }),
                columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { textColor: MUTED }, 3: { halign: 'right', cellWidth: 17 }, 4: { halign: 'right', cellWidth: 18, fontStyle: 'bold' }, 5: { cellWidth: 13, halign: 'center' }, 6: { cellWidth: 22 } },
                didParseCell: d => statusCell(d, 6),
            });
        }
    }

    // Register
    y = heading(`Stock register (${transactions.length} entries)`, doc.lastAutoTable.finalY + 9);
    const byCode = Object.fromEntries(rows.map(r => [r.code, r]));
    autoTable(doc, {
        ...tableBase,
        startY: y,
        head: [['#', 'Date', 'Item', 'Type', 'Qty', 'Location', 'Supplier / issued to', 'By', 'Remarks']],
        body: transactions.length
            ? transactions.map((t, i) => [i + 1, fmtDate(t.date), safe(byCode[t.code]?.name || t.code), t.type, `${t.qty} ${byCode[t.code]?.unit || ''}`, safe(t.type === 'TRANSFER' ? `${normalizeLocation(t.location)} -> ${normalizeLocation(t.toLocation)}` : normalizeLocation(t.location)), safe(t.party || '-'), safe(t.by), safe(t.remarks || '-')])
            : [[{ content: 'No entries yet.', colSpan: 9, styles: { halign: 'center', textColor: MUTED } }]],
        columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 18 }, 3: { cellWidth: 11, fontStyle: 'bold' }, 4: { halign: 'right', cellWidth: 16 } },
        didParseCell: d => {
            if (d.section === 'body' && d.column.index === 3) d.cell.styles.textColor = hexToRgb(ENTRY_COLORS[d.cell.raw] || ENTRY_COLORS.OUT);
        },
    });

    // Signatures
    let sy = doc.lastAutoTable.finalY + 22;
    if (sy > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); sy = 30; }
    doc.setDrawColor(31, 41, 55).setLineWidth(0.3);
    doc.line(14, sy, 74, sy);
    doc.line(W - 74, sy, W - 14, sy);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(31, 41, 55);
    doc.text('Prepared by', 44, sy + 4, { align: 'center' });
    doc.text('Verified by (Manager)', W - 44, sy + 4, { align: 'center' });

    // Footer on every page
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7).setTextColor(...MUTED);
        doc.text('Hotel Sky 5 - Inventory  |  Current stock = opening count + IN - OUT', 14, doc.internal.pageSize.getHeight() - 8);
        doc.text(`Page ${i} of ${pages}`, W - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }
    return doc;
}

// Share the PDF via the phone's share sheet (WhatsApp, Gmail...) or download it on desktop.
export async function shareOrDownloadPdf(doc, filename) {
    const blob = doc.output('blob');
    const file = typeof File !== 'undefined' ? new File([blob], filename, { type: 'application/pdf' }) : null;
    const isPhone = navigator.maxTouchPoints > 0 && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    if (isPhone && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: 'Hotel Sky 5 - Inventory Report' });
            return 'shared';
        } catch (e) {
            if (e && e.name === 'AbortError') return 'cancelled';
            // fall through to download
        }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return 'downloaded';
}
