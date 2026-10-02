/**
 * HOTEL SKY 5 - INVENTORY REPORT (PDF via print) + WhatsApp summary.
 * Full per-item detail, no truncation.
 */

import { LOCATIONS, registerLists } from '../data/inventory';
import { normalizeLocation } from './inventory';
import { statusCSS, ENTRY_COLORS } from './statusColors';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ALERT_STATUSES = ['CHECK COUNT', 'EXPIRED', 'REFILL', 'OUT OF STOCK', 'REORDER'];
const fmtDate = (iso) => String(iso || '').split('-').reverse().join('-');

export function reportSummary(rows, transactions) {
    const count = (s) => rows.filter(r => r.status === s).length;
    return {
        items: rows.length,
        reorder: count('REORDER') + count('OUT OF STOCK') + count('CHECK COUNT'),
        expiredRefill: count('EXPIRED') + count('REFILL'),
        ok: count('OK'),
        entries: transactions.length,
        alerts: rows.filter(r => ALERT_STATUSES.includes(r.status)),
    };
}

function groupByCategory(rows) {
    const groups = new Map();
    for (const r of rows) {
        if (!groups.has(r.category)) groups.set(r.category, []);
        groups.get(r.category).push(r);
    }
    return groups;
}

export function whatsappSummary(rows, transactions, { generatedAt, link }) {
    const s = reportSummary(rows, transactions);
    const lines = [
        '*HOTEL SKY 5 - INVENTORY REPORT*',
        `Date: ${generatedAt}`,
        '',
        `Items: ${s.items} | Reorder: ${s.reorder} | Expired/Refill: ${s.expiredRefill} | Entries: ${s.entries}`,
        '',
        `*ACTION REQUIRED (${s.alerts.length})*`,
        ...(s.alerts.length ? s.alerts.map((r, i) => `${i + 1}. ${r.name} - ${r.current} ${r.unit} - ${r.status}`) : ['None']),
        '',
        '*FULL STOCK (total | ' + LOCATIONS.join(' | ') + ')*',
    ];
    for (const [cat, list] of groupByCategory(rows)) {
        lines.push('', `_${cat}_`);
        list.forEach(r => lines.push(`${r.code} ${r.name}: ${r.current} ${r.unit} (${LOCATIONS.map(l => r.atLocation?.[l] ?? 0).join(' | ')})${r.status !== 'OK' ? ` ${r.status}` : ''}`));
    }
    const byCode = Object.fromEntries(rows.map(r => [r.code, r]));
    for (const loc of LOCATIONS) {
        lines.push('', `*${loc.toUpperCase()} - REGISTER LIST (counted / now)*`);
        for (const list of registerLists.filter(l => l.location === loc)) {
            lines.push(`_${list.title}_`);
            list.lines.forEach(ln => lines.push(`${ln.sr}. ${byCode[ln.code].name}: ${ln.qty} / ${byCode[ln.code].atLocation?.[loc] ?? 0} ${byCode[ln.code].unit}`));
        }
    }
    if (link) lines.push('', `Live inventory: ${link}`);
    return lines.join('\n');
}

export function reportHTML(rows, transactions, { generatedAt, countDates, embedded = false }) {
    const s = reportSummary(rows, transactions);
    const pill = (st) => `<span class="pill st-${st.replace(/ /g, '-')}">${esc(st)}</span>`;
    const stockRows = [];
    let sr = 0;
    for (const [cat, list] of groupByCategory(rows)) {
        stockRows.push(`<tr class="cat"><td colspan="${9 + LOCATIONS.length}">${esc(cat)} (${list.length})</td></tr>`);
        for (const r of list) {
            sr += 1;
            stockRows.push(`<tr><td class="c">${sr}</td><td class="mono">${esc(r.code)}</td><td>${esc(r.name)}</td><td class="c">${esc(r.unit)}</td>${LOCATIONS.map(l => `<td class="n">${r.atLocation?.[l] ?? 0}</td>`).join('')}<td class="n in">${r.stockIn || '-'}</td><td class="n out">${r.stockOut || '-'}</td><td class="n b">${r.current}</td><td class="n">${esc(r.min)}</td><td class="c">${pill(r.status)}</td></tr>`);
        }
    }
    const byCode = Object.fromEntries(rows.map(r => [r.code, r]));
    const locationSections = LOCATIONS.map(loc => `<h2>${esc(loc)} - register list</h2>` + registerLists.filter(l => l.location === loc).map(list =>
        `<h3>${esc(list.title)}</h3><table><thead><tr><th>Sr.</th><th>Item</th><th>As written</th><th style="text-align:right">Counted</th><th style="text-align:right">Now here</th><th>Unit</th><th>Status</th></tr></thead><tbody>${
            list.lines.map(ln => { const r = byCode[ln.code]; return `<tr class="loc-row"><td class="c">${ln.sr}</td><td>${esc(r.name)}</td><td class="muted">${esc(ln.asWritten)}</td><td class="n">${ln.qty}</td><td class="n b">${r.atLocation?.[loc] ?? 0}</td><td class="c">${esc(r.unit)}</td><td class="c">${pill(r.status)}</td></tr>`; }).join('')
        }</tbody></table>`).join('')).join('');
    const regRows = transactions.map((t, i) => `<tr><td class="c">${i + 1}</td><td>${esc(fmtDate(t.date))}</td><td>${esc(byCode[t.code]?.name || t.code)}</td><td class="c ${t.type === 'IN' ? 'in' : t.type === 'TRANSFER' ? 'mv' : 'out'} b">${esc(t.type)}</td><td class="n">${esc(t.qty)} ${esc(byCode[t.code]?.unit || '')}</td><td>${esc(t.type === 'TRANSFER' ? `${normalizeLocation(t.location)} -> ${normalizeLocation(t.toLocation)}` : normalizeLocation(t.location))}</td><td>${esc(t.party || '-')}</td><td>${esc(t.by)}</td><td>${esc(t.remarks || '-')}</td></tr>`);
    const alertRows = s.alerts.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(r.name)}</td><td class="n b">${r.current} ${esc(r.unit)}</td><td class="c">${pill(r.status)}</td><td>${esc(r.note ? r.note.split(': ').pop() : '')}</td></tr>`);

    return `<!doctype html><html><head><meta charset="utf-8"><title>Hotel Sky 5 - Inventory Report</title>
<style>
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 11px; margin: 0; padding: 14px; }
@media print { body { padding: 0; } }
.head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #c9a227; padding-bottom: 10px; margin-bottom: 14px; }
.brand { background: #0a192f; color: #c9a227; padding: 8px 14px; border-radius: 8px; font-weight: 900; letter-spacing: 2px; font-size: 18px; }
.brand small { display: block; color: #fff; font-size: 9px; letter-spacing: 3px; font-weight: 600; }
h1 { margin: 0; font-size: 18px; color: #0a192f; }
.meta { color: #6b7280; font-size: 10px; text-align: right; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
.kpi { border: 1px solid #e6e8ec; border-radius: 8px; padding: 8px 10px; }
.kpi span { display: block; color: #6b7280; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
.kpi b { font-size: 18px; }
h2 { font-size: 13px; color: #0a192f; margin: 16px 0 6px; }
h3 { font-size: 11px; color: #374151; margin: 10px 0 4px; }
.muted { color: #6b7280; }
table { width: 100%; border-collapse: collapse; }
th { background: #0a192f; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; padding: 6px; text-align: left; }
td { padding: 5px 6px; border-bottom: 1px solid #eef0f3; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
tr.cat td { background: #f4f6f9; font-weight: 700; color: #0a192f; }
.c { text-align: center; } .n { text-align: right; font-variant-numeric: tabular-nums; } .b { font-weight: 700; }
.mono { font-family: monospace; color: #6b7280; }
.in { color: ${ENTRY_COLORS.IN}; } .out { color: ${ENTRY_COLORS.OUT}; } .mv { color: ${ENTRY_COLORS.TRANSFER}; }
.pill { display: inline-block; padding: 2px 7px; border-radius: 99px; font-size: 9px; font-weight: 700; }
${statusCSS()}
.sign { display: flex; justify-content: space-between; margin-top: 36px; }
.sign div { border-top: 1px solid #1f2937; width: 200px; text-align: center; padding-top: 4px; font-size: 10px; }
.foot { margin-top: 12px; color: #6b7280; font-size: 9px; }
.noprint { text-align: center; margin: 16px 0; }
.noprint button { padding: 10px 22px; border: none; border-radius: 8px; background: #0a192f; color: #fff; font-weight: 700; cursor: pointer; }
@media print { .noprint { display: none; } }
</style></head><body>
${embedded ? '' : '<div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>'}
<div class="head"><div class="brand"><small>HOTEL</small>SKY 5</div><div><h1>Inventory Report</h1><div class="meta">Generated: ${esc(generatedAt)}<br>Opening stock counted: ${esc(countDates)}</div></div></div>
<div class="kpis">
<div class="kpi"><span>Total items</span><b>${s.items}</b></div>
<div class="kpi"><span>Reorder now</span><b style="color:#b91c1c">${s.reorder}</b></div>
<div class="kpi"><span>Expired / refill</span><b style="color:#a16207">${s.expiredRefill}</b></div>
<div class="kpi"><span>Register entries</span><b>${s.entries}</b></div>
</div>
<h2>Action required (${s.alerts.length})</h2>
${s.alerts.length ? `<table><thead><tr><th>#</th><th>Item</th><th>Current</th><th>Status</th><th>Note</th></tr></thead><tbody>${alertRows.join('')}</tbody></table>` : '<p>None.</p>'}
<h2>Full stock (${rows.length} items)</h2>
<table><thead><tr><th>#</th><th>Code</th><th>Item</th><th>Unit</th>${LOCATIONS.map(l => `<th style="text-align:right">${esc(l)}</th>`).join('')}<th style="text-align:right">In</th><th style="text-align:right">Out</th><th style="text-align:right">Current</th><th style="text-align:right">Min</th><th>Status</th></tr></thead><tbody>${stockRows.join('')}</tbody></table>
${locationSections}
<h2>Stock register (${transactions.length} entries)</h2>
${transactions.length ? `<table><thead><tr><th>#</th><th>Date</th><th>Item</th><th>Type</th><th style="text-align:right">Qty</th><th>Location</th><th>Supplier / Issued to</th><th>By</th><th>Remarks</th></tr></thead><tbody>${regRows.join('')}</tbody></table>` : '<p>No entries yet.</p>'}
<div class="sign"><div>Prepared by</div><div>Verified by (Manager)</div></div>
<div class="foot">Current stock = opening count + IN - OUT. Hotel Sky 5, 5th Floor, Disha Arcade, MDC Sector 4, Panchkula.</div>
</body></html>`;
}
