import { describe, test, expect } from 'vitest';
import { buildInventoryPdf } from '../../02_Application_Source/lib/inventoryPdf';
import { reportHTML, whatsappSummary, reportSummary } from '../../02_Application_Source/lib/inventoryReport';
import { computeStock } from '../../02_Application_Source/lib/inventory';
import { inventoryItems } from '../../02_Application_Source/data/inventory';

const soap = inventoryItems.find(i => i.name === 'Hotel Soap');
const tx = [{ id: 'a', code: soap.code, type: 'OUT', qty: 10, date: '2026-09-29', location: 'Basement Store', party: 'Room 5, 7 <b>', by: 'Veerwati', remarks: 'said "urgent"' }];
const rows = computeStock(inventoryItems, tx);
const meta = { generatedAt: '29 Sept 2026, 15:02', countDates: 'Inventory Stock 23-09-2026' };

describe('PDF file (jsPDF)', () => {
    test('builds a multi-page A4 PDF containing every item and the register', () => {
        const doc = buildInventoryPdf(rows, tx, meta);
        expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
        const raw = doc.output();
        expect(raw.startsWith('%PDF-')).toBe(true);
        for (const r of rows) expect(raw).toContain(r.code);
        expect(raw).toContain('Hotel Soap');
        expect(raw).toContain('Veerwati');
        expect(raw).toContain(String.raw`(Full stock \(70 items\))`); // PDF escapes ( )
    });

    test('works with an empty register', () => {
        const doc = buildInventoryPdf(computeStock(inventoryItems), [], meta);
        expect(doc.output()).toContain('No entries yet.');
    });
});

describe('HTML report + WhatsApp text', () => {
    test('report escapes user text and lists all 70 items', () => {
        const html = reportHTML(rows, tx, meta);
        expect(html).toContain('Room 5, 7 &lt;b&gt;');
        expect(html).not.toContain('<b>"');
        expect((html.match(/<td class="mono">SKY-/g) || []).length).toBe(70);
        expect(html).toContain('Print / Save as PDF');
        expect(reportHTML(rows, tx, { ...meta, embedded: true })).not.toContain('Print / Save as PDF');
    });

    test('WhatsApp summary has every item and the alert list', () => {
        const text = whatsappSummary(rows, tx, { generatedAt: meta.generatedAt, link: 'https://x/inventory' });
        expect(text.match(/^SKY-[A-Z]{2}-\d{3} /gm)).toHaveLength(70);
        expect(text).toContain(`${soap.code} Hotel Soap: 110 Pcs`);
        expect(text).toContain(`ACTION REQUIRED (${reportSummary(rows, tx).alerts.length})`);
        expect(text).toContain('https://x/inventory');
    });
});
